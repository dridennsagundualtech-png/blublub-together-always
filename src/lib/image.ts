/**
 * Client-side image compression: downscale to fit `maxSize` and step the JPEG
 * quality down until the result lands under ~450KB.
 */
export async function compressImage(file: File, maxSize = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const target = 450 * 1024;
  let quality = 0.85;
  let blob = await toBlob(canvas, quality);
  while (blob.size > target && quality > 0.4) {
    quality -= 0.12;
    blob = await toBlob(canvas, quality);
  }
  return blob;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Image encoding failed"))),
      "image/jpeg",
      quality,
    );
  });
}
