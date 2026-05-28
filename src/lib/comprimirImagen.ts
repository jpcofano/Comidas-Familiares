export async function comprimirImagen(file: File): Promise<string> {
  const PRESUPUESTO = 900_000;
  const CALIDADES = [0.82, 0.78, 0.74, 0.70, 0.66, 0.62];

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    const intentar = (maxLado: number): string | null => {
      let w = bitmap.width;
      let h = bitmap.height;

      if (Math.max(w, h) > maxLado) {
        const ratio = maxLado / Math.max(w, h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, w, h);

      for (const calidad of CALIDADES) {
        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        if (dataUrl.length <= PRESUPUESTO) return dataUrl;
      }
      return null;
    };

    const r1 = intentar(1440);
    if (r1 !== null) return r1;

    const r2 = intentar(1080);
    if (r2 !== null) return r2;

    throw new Error("La imagen es demasiado grande incluso comprimida");
  } finally {
    bitmap.close();
  }
}
