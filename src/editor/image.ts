export function targetSize(w: number, h: number, maxWidth = 1280): { w: number; h: number } {
  const scale = Math.min(1, maxWidth / w);
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

export async function compressImage(file: Blob, maxWidth = 1280, quality = 0.8): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Bild konnte nicht gelesen werden."));
      image.src = url;
    });
    const { w, h } = targetSize(image.naturalWidth, image.naturalHeight, maxWidth);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Bild konnte nicht verkleinert werden.");
    context.drawImage(image, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Bild konnte nicht verkleinert werden.")), "image/jpeg", quality);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
