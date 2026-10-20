export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB per backend BlobStore limit

/**
 * Validates and processes an uploaded inspection/violation image immediately at upload time.
 * - Rejects non-images (SVG, XML, PDF, etc.) immediately.
 * - Validates MIME type against JPEG, PNG, and WebP.
 * - Automatically optimizes/compresses camera photos larger than 500 KB to fit within the backend limit.
 */
async function detectImageMagicMime(file: File): Promise<string> {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // JPEG: FF D8 FF
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return "image/jpeg";
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return "image/png";
    }

    // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "image/webp";
    }

    const textSample = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (
      textSample.includes("<xml") ||
      textSample.includes("<svg") ||
      textSample.includes("<?") ||
      textSample.includes("<!")
    ) {
      return "text/xml";
    }
  } catch {
    // Fall back to MIME type if slice/arrayBuffer fails
  }
  return "";
}

/**
 * Validates and processes an uploaded inspection/violation image immediately at upload time.
 * - Rejects non-images (SVG, XML, PDF, etc.) immediately via MIME and magic bytes.
 * - Validates MIME type against JPEG, PNG, and WebP.
 * - Automatically optimizes/compresses camera photos larger than 500 KB to fit within the backend limit.
 */
export async function validateAndProcessImage(file: File): Promise<File> {
  if (!file) {
    throw new Error("No file selected.");
  }

  const rawType = (file.type || "").toLowerCase().trim();
  const ext = file.name.split(".").pop()?.toLowerCase();

  // Explicit immediate rejection for XML/SVG/documents by filename/mime
  if (
    rawType.includes("xml") ||
    rawType.includes("svg") ||
    rawType.includes("pdf") ||
    rawType.includes("text") ||
    ext === "svg" ||
    ext === "xml" ||
    ext === "pdf"
  ) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed. SVG and XML files cannot be used.");
  }

  // Validate image MIME type header
  if (rawType && !ALLOWED_IMAGE_TYPES.includes(rawType as typeof ALLOWED_IMAGE_TYPES[number])) {
    throw new Error(
      `Only JPEG, PNG, and WebP images are allowed (detected ${rawType || "unknown type"}).`
    );
  }

  // Deep validation: Detect file content magic bytes directly
  const magicMime = await detectImageMagicMime(file);
  if (magicMime === "text/xml") {
    throw new Error("Only JPEG, PNG, and WebP images are allowed. XML/SVG files are not supported.");
  }
  if (magicMime && !ALLOWED_IMAGE_TYPES.includes(magicMime as typeof ALLOWED_IMAGE_TYPES[number])) {
    throw new Error(`Invalid image content: detected ${magicMime}. Only JPEG, PNG, and WebP are allowed.`);
  }

  // If already under 500 KB, accept immediately
  if (file.size <= MAX_IMAGE_SIZE_BYTES) {
    return file;
  }

  // For valid camera photos > 500 KB, resize & compress in browser via Canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const maxDim = 1280;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          return reject(
            new Error(
              `Image size exceeds 500 KB limit (${(file.size / 1024).toFixed(0)} KB). Please choose a smaller photo.`
            )
          );
        }
        return resolve(file);
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Failed to process image."));
          }
          if (blob.size > MAX_IMAGE_SIZE_BYTES) {
            // Try lower compression ratio if needed
            canvas.toBlob(
              (blob2) => {
                if (!blob2 || blob2.size > MAX_IMAGE_SIZE_BYTES) {
                  return reject(
                    new Error(
                      `Image size exceeds 500 KB limit (${(file.size / 1024).toFixed(0)} KB). Please choose a smaller photo.`
                    )
                  );
                }
                const newName = file.name.replace(/\.[^/.]+$/, ".jpg");
                resolve(new File([blob2], newName, { type: "image/jpeg" }));
              },
              "image/jpeg",
              0.65
            );
            return;
          }
          const newName = file.name.replace(/\.[^/.]+$/, ".jpg");
          resolve(new File([blob], newName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid or unreadable image file."));
    };

    img.src = url;
  });
}
