import imageCompression from "browser-image-compression";
import decode from "heic-decode";

interface OptimizeOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<OptimizeOptions> = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  quality: 0.85,
};

const HEIC_TIMEOUT_MS = 20000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

function isHeicFile(file: File): boolean {
  const heicTypes = ["image/heic", "image/heif"];
  if (heicTypes.includes(file.type.toLowerCase())) {
    return true;
  }
  const extension = file.name.toLowerCase().split(".").pop();
  return extension === "heic" || extension === "heif";
}

async function convertHeicToJpeg(file: File, quality: number): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  const decoded = await decode({ buffer: new Uint8Array(arrayBuffer) });

  const canvas = document.createElement("canvas");
  canvas.width = decoded.width;
  canvas.height = decoded.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const imageData = new ImageData(decoded.data, decoded.width, decoded.height);
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality
    );
  });

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    let processedFile = file;

    if (isHeicFile(file)) {
      processedFile = await withTimeout(
        convertHeicToJpeg(file, opts.quality),
        HEIC_TIMEOUT_MS
      );
    }

    const compressed = await imageCompression(processedFile, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: true,
    });

    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([compressed], `${baseName}.jpg`, {
      type: compressed.type || "image/jpeg",
    });
  } catch (error) {
    console.error("Image optimization failed:", error);
    return file;
  }
}
