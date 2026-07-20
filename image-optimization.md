# Client-side image optimization

Reusable prompt and code to implement the same browser-side image compression used in this project.

## Prompt for Cursor

```
Implement client-side image optimization before upload, matching this behavior:

1. Add dependencies:
   - browser-image-compression
   - heic-decode

2. Create a utility (e.g. src/lib/image.ts) that exports `optimizeImage(file, options?)`:
   - Defaults: maxSizeMB = 1, maxWidthOrHeight = 1920, quality = 0.85
   - If the file is HEIC/HEIF (by MIME type or .heic/.heif extension):
     - Decode with heic-decode
     - Draw to a canvas
     - Convert to JPEG via canvas.toBlob("image/jpeg", quality)
     - Timeout the HEIC conversion after 20 seconds
   - Then compress/resize with browser-image-compression using:
     - maxSizeMB
     - maxWidthOrHeight
     - useWebWorker: true
   - Return a new File named `{originalBaseName}.jpg`
   - On any failure: log the error and return the original file unchanged

3. Call optimizeImage on every user-selected image BEFORE uploading to storage (or before setting the selected file for later upload). Do not optimize at display/build/CDN time.

4. Do not add server-side image processing, sharp, Cloudinary, or next/image unless the project already requires it. Keep this purely browser-side.
```

## Install

```bash
npm install browser-image-compression heic-decode
```

## Code (`src/lib/image.ts`)

```ts
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
      (result) =>
        result ? resolve(result) : reject(new Error("toBlob failed")),
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
```

## Usage

```ts
const optimized = await optimizeImage(file);
// then upload `optimized` (or store it for later upload)
```

## Defaults

| Setting             | Value  |
| ------------------- | ------ |
| Max file size       | 1 MB   |
| Max longest edge    | 1920px |
| HEIC → JPEG quality | 0.85   |
| HEIC timeout        | 20s    |
