/**
 * Fast in-browser OCR extractor for UPI payment screenshots (GPay, PhonePe, Paytm, BHIM, Cred)
 */

export async function extractUtrFromScreenshot(file: File): Promise<string | null> {
  const win = window as unknown as {
    Tesseract?: {
      recognize: (img: HTMLImageElement | HTMLCanvasElement, lang: string) => Promise<{ data: { text: string } }>;
    };
  };

  try {
    // 1. Load Tesseract.js dynamically if not already present
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

    // 2. Load image onto canvas with contrast enhancement
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    URL.revokeObjectURL(imageUrl);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Scale to readable dimension (1200px max width/height)
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

    // 3. Recognize text from payment screenshot
    const res = await win.Tesseract.recognize(canvas, "eng");
    const text = res?.data?.text || "";

    // 4. Extract 12-digit UTR / UPI Ref ID
    // Priority 1: Labeled UTR / Ref No / UPI Transaction ID
    const labeledMatch = text.match(
      /(?:UTR|UPI\s*Transaction\s*ID|UPI\s*Ref|Ref\s*No|Transaction\s*ID|Txn\s*ID|Reference\s*ID)\s*[:\-#]?\s*(\d{12})\b/i
    );
    if (labeledMatch?.[1]) {
      return labeledMatch[1];
    }

    // Priority 2: Any standalone 12-digit number (standard Indian UPI Ref length)
    const matches = text.match(/\b\d{12}\b/g);
    if (matches && matches.length > 0) {
      return matches[0];
    }

    return null;
  } catch (err) {
    console.warn("Screenshot UTR extraction error:", err);
    return null;
  }
}
