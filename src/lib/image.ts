import heic2any from "heic2any";

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "webp";
}

const DEFAULT_OPTIONS: Required<OptimizeOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: "jpeg",
};

function isHeic(file: File): boolean {
  const heicTypes = ["image/heic", "image/heif"];
  if (heicTypes.includes(file.type.toLowerCase())) {
    return true;
  }
  const extension = file.name.toLowerCase().split(".").pop();
  return extension === "heic" || extension === "heif";
}

async function convertHeicToBlob(file: File): Promise<Blob> {
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  return Array.isArray(result) ? result[0] : result;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

async function compressImage(
  blob: Blob,
  options: Required<OptimizeOptions>
): Promise<Blob> {
  const url = URL.createObjectURL(blob);

  try {
    const img = await loadImage(url);
    const { width, height } = calculateDimensions(
      img.width,
      img.height,
      options.maxWidth,
      options.maxHeight
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    ctx.drawImage(img, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        },
        `image/${options.format}`,
        options.quality
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function optimizeImage(
  file: File,
  options: OptimizeOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let blob: Blob = file;

  if (isHeic(file)) {
    blob = await convertHeicToBlob(file);
  }

  const compressedBlob = await compressImage(blob, opts);

  const extension = opts.format === "webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const newFileName = `${baseName}.${extension}`;

  return new File([compressedBlob], newFileName, {
    type: `image/${opts.format}`,
  });
}
