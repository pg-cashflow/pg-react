import type { AadhaarPreview } from "@pg/types";

export interface ScanResult {
  rawPayload: string | null;
  parsedXml: AadhaarPreview | null;
  extractedFromOcr?: boolean;
  error?: string;
}

/** Helper to detect barcode from any canvas or image source using BarcodeDetector */
async function detectFromSource(
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap
): Promise<string | null> {
  const win = window as unknown as {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (src: unknown) => Promise<Array<{ rawValue: string }>>;
    };
  };

  if (typeof win.BarcodeDetector !== "undefined") {
    try {
      const detector = new win.BarcodeDetector({ formats: ["qr_code"] });
      const barcodes = await detector.detect(source);
      if (barcodes.length > 0 && barcodes[0]?.rawValue) {
        return barcodes[0].rawValue;
      }
    } catch (err) {
      console.warn("BarcodeDetector pass error:", err);
    }
  }
  return null;
}

/** Multi-pass preprocessing on canvas to decode blurry, large, low-contrast, or rotated images */
async function multiPassCanvasScan(img: HTMLImageElement): Promise<{ payload: string | null; canvas: HTMLCanvasElement | null }> {
  // 1. Direct pass
  let result = await detectFromSource(img);
  if (result) return { payload: result, canvas: null };

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { payload: null, canvas: null };

  // 2. Downscaled pass (for high-res phone camera photos e.g. 4000x3000px)
  const maxDim = 1200;
  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > maxDim || h > maxDim) {
    const scale = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  result = await detectFromSource(canvas);
  if (result) return { payload: result, canvas };

  // 3. Contrast & Grayscale Enhancement (for low light / faded print / slight blur)
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const contrast = (gray - 128) * 1.5 + 128;
      const val = Math.max(0, Math.min(255, contrast));
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }
    ctx.putImageData(imgData, 0, 0);
    result = await detectFromSource(canvas);
    if (result) return { payload: result, canvas };
  } catch {
    // Continue to rotation passes
  }

  // 4. Rotations (90 deg, 180 deg, 270 deg) for sideways or upside down cards
  for (const angle of [90, 180, 270]) {
    canvas.width = angle === 90 || angle === 270 ? h : w;
    canvas.height = angle === 90 || angle === 270 ? w : h;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    result = await detectFromSource(canvas);
    if (result) return { payload: result, canvas };
  }

  return { payload: null, canvas };
}

/** Parses legacy UIDAI XML format e.g. <PrintLetterBarcodeData uid="..." name="..." .../> */
export function parseLegacyXmlAadhaarQr(raw: string): AadhaarPreview | null {
  try {
    if (!raw.includes("<PrintLetterBarcodeData") && !raw.includes("<?xml")) return null;
    const parser = new DOMParser();
    const doc = parser.parseFromString(raw, "application/xml");
    const node = doc.querySelector("PrintLetterBarcodeData");
    if (!node) return null;
    const uid = node.getAttribute("uid") || "";
    const name = node.getAttribute("name") || "";
    const gender = node.getAttribute("gender") || "";
    const yob = node.getAttribute("yob") || "";
    const dob = node.getAttribute("dob") || "";
    return {
      name: name || undefined,
      uid_last4: uid ? uid.replace(/\D/g, "").slice(-4) : undefined,
      gender: gender || undefined,
      dob: dob || yob || undefined,
      verified: true,
    };
  } catch {
    return null;
  }
}

/** Regex text parser for text extracted via OCR or PDF text streams */
export function parseAadhaarTextContent(text: string): AadhaarPreview | null {
  if (!text || text.length < 10) return null;

  // 1. Extract 12-digit Aadhaar or Masked Aadhaar last 4 digits
  // Formats: "1234 5678 9012" or "XXXX XXXX 1234" or "123456789012"
  let uidLast4: string | undefined;
  const matchAadhaar = text.match(/(?:[xX\d]{4}[\s\-][xX\d]{4}[\s\-]|\b\d{8}\s*)(\d{4})\b/);
  if (matchAadhaar?.[1]) {
    uidLast4 = matchAadhaar[1];
  } else {
    const rawDigits = text.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
    if (rawDigits) {
      uidLast4 = rawDigits[0].replace(/\s/g, "").slice(-4);
    }
  }

  // 2. Extract DOB / YOB
  let dob: string | undefined;
  const matchDob = text.match(/(?:DOB|Birth|D\.O\.B|Year of Birth|YOB)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4})/i);
  if (matchDob?.[1]) {
    dob = matchDob[1];
  } else {
    const datePattern = text.match(/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/);
    if (datePattern?.[1]) {
      dob = datePattern[1];
    }
  }

  // 3. Extract Gender
  let gender: string | undefined;
  if (/\b(?:Female|FEMALE|F)\b/i.test(text) && !/\b(?:Male|MALE)\b/i.test(text.replace(/Female/gi, ""))) {
    gender = "Female";
  } else if (/\b(?:Male|MALE|M)\b/i.test(text)) {
    gender = "Male";
  }

  // 4. Extract Name (filter out noise and government headers)
  let extractedName: string | undefined;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blacklist = [
    "government",
    "india",
    "unique",
    "identification",
    "authority",
    "aadhaar",
    "mera",
    "pehchan",
    "enrollment",
    "help",
    "male",
    "female",
    "dob",
    "year",
    "father",
    "address",
    "card",
    "to",
  ];

  for (const line of lines) {
    const clean = line.replace(/[^a-zA-Z\s]/g, "").trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const lower = clean.toLowerCase();
      const hasBlacklist = blacklist.some((b) => lower.includes(b));
      if (!hasBlacklist && clean.length > 5 && clean.length < 35) {
        extractedName = clean;
        break;
      }
    }
  }

  if (extractedName || uidLast4) {
    return {
      name: extractedName,
      uid_last4: uidLast4,
      gender,
      dob,
      verified: false,
    };
  }

  return null;
}

/** Dynamically runs lightweight in-browser OCR on a canvas using Tesseract.js (from CDN on-demand) */
async function runClientOcrOnCanvas(canvas: HTMLCanvasElement): Promise<AadhaarPreview | null> {
  const win = window as unknown as {
    Tesseract?: {
      recognize: (img: HTMLCanvasElement, lang: string) => Promise<{ data: { text: string } }>;
    };
  };

  try {
    if (!win.Tesseract) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Could not load OCR engine."));
        document.head.appendChild(script);
      });
    }

    if (!win.Tesseract) return null;

    const result = await win.Tesseract.recognize(canvas, "eng");
    const ocrText = result?.data?.text || "";
    return parseAadhaarTextContent(ocrText);
  } catch (err) {
    console.warn("Client OCR error:", err);
    return null;
  }
}

/** Dynamically renders a PDF file's first page to a canvas and scans for Aadhaar QR or text */
async function scanPdfDocument(file: File): Promise<{ rawPayload: string | null; parsedText: AadhaarPreview | null }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const win = window as unknown as {
      pdfjsLib?: {
        getDocument: (data: { data: ArrayBuffer }) => {
          promise: Promise<{
            getPage: (n: number) => Promise<{
              getViewport: (cfg: { scale: number }) => { width: number; height: number };
              render: (cfg: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
              getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
            }>;
          }>;
        };
      };
    };

    if (!win.pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => {
          if (win.pdfjsLib) {
            (win.pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
          resolve();
        };
        script.onerror = () => reject(new Error("Could not load PDF renderer."));
        document.head.appendChild(script);
      });
    }

    if (!win.pdfjsLib) return { rawPayload: null, parsedText: null };

    const pdfDoc = await win.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { rawPayload: null, parsedText: null };

    await page.render({ canvasContext: ctx, viewport }).promise;

    // 1. Detect QR code from PDF
    const qrPayload = await detectFromSource(canvas);
    if (qrPayload) {
      return { rawPayload: qrPayload, parsedText: null };
    }

    // 2. Extract embedded text stream from PDF (for digital/old PDF docs)
    const textContent = await page.getTextContent();
    const fullText = textContent.items.map((item) => item.str || "").join("\n");
    const parsedText = parseAadhaarTextContent(fullText);

    return { rawPayload: null, parsedText };
  } catch (err) {
    console.warn("PDF scan error:", err);
    return { rawPayload: null, parsedText: null };
  }
}

/** Master extraction function: handles PNG, JPG, JPEG, WEBP, SVG, PDF, or old non-QR text documents */
export async function extractAadhaarFromFile(file: File): Promise<ScanResult> {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  // 1. PDF File (e-Aadhaar or scanned PDF document)
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    const { rawPayload, parsedText } = await scanPdfDocument(file);
    if (rawPayload) {
      const parsedXml = parseLegacyXmlAadhaarQr(rawPayload);
      return { rawPayload, parsedXml };
    }
    if (parsedText?.name || parsedText?.uid_last4) {
      return { rawPayload: null, parsedXml: parsedText, extractedFromOcr: true };
    }
    return {
      rawPayload: null,
      parsedXml: null,
      error: "Could not auto-extract details from this PDF. You can enter your details manually below.",
    };
  }

  // 2. SVG Vector Image
  if (fileType.includes("svg") || fileName.endsWith(".svg")) {
    try {
      const text = await file.text();
      const directXml = parseLegacyXmlAadhaarQr(text);
      if (directXml) {
        return { rawPayload: text, parsedXml: directXml };
      }

      const svgBlob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      URL.revokeObjectURL(url);

      const { payload, canvas } = await multiPassCanvasScan(img);
      if (payload) {
        const parsedXml = parseLegacyXmlAadhaarQr(payload);
        return { rawPayload: payload, parsedXml };
      }

      // OCR fallback on SVG canvas
      if (canvas) {
        const ocrParsed = await runClientOcrOnCanvas(canvas);
        if (ocrParsed?.name || ocrParsed?.uid_last4) {
          return { rawPayload: null, parsedXml: ocrParsed, extractedFromOcr: true };
        }
      }
    } catch {
      // Fall through
    }
  }

  // 3. Standard Images (PNG, JPG, JPEG, WEBP)
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    URL.revokeObjectURL(url);

    const { payload, canvas } = await multiPassCanvasScan(img);
    if (payload) {
      const parsedXml = parseLegacyXmlAadhaarQr(payload);
      return { rawPayload: payload, parsedXml };
    }

    // OCR Fallback on image for non-QR older Aadhaar cards
    if (canvas) {
      const ocrParsed = await runClientOcrOnCanvas(canvas);
      if (ocrParsed?.name || ocrParsed?.uid_last4) {
        return { rawPayload: null, parsedXml: ocrParsed, extractedFromOcr: true };
      }
    }

    return {
      rawPayload: null,
      parsedXml: null,
      error: "No QR code or readable text could be auto-extracted. Please enter your details manually below.",
    };
  } catch (err) {
    return {
      rawPayload: null,
      parsedXml: null,
      error: err instanceof Error ? err.message : "Failed to process image file.",
    };
  }
}
