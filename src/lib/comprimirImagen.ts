// Fuente dibujable a partir de un File.
// 1º createImageBitmap (rápido, respeta orientación EXIF). Si falla
// ("The source image could not be decoded" — típico de HEIC/HEIF de iPhone o de
// algunos WebView de Android), cae al decoder de <img>, que soporta más formatos
// y aplica la orientación EXIF de forma nativa.
async function decodificar(file: File): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  close: () => void;
}> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      close: () => bitmap.close(),
    };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("img-decode-failed"));
        el.src = url;
      });
      return {
        width: img.naturalWidth,
        height: img.naturalHeight,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        close: () => URL.revokeObjectURL(url),
      };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }
}

function esHeic(file: File): boolean {
  return /image\/heic|image\/heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export async function comprimirImagen(
  file: File,
  opts: { maxLado?: number; presupuesto?: number } = {}
): Promise<string> {
  const PRESUPUESTO = opts.presupuesto ?? 900_000;
  const LADO_1 = opts.maxLado ?? 1440;
  const LADO_2 = opts.maxLado ? Math.round(opts.maxLado * 0.75) : 1080;
  const CALIDADES = [0.82, 0.78, 0.74, 0.70, 0.66, 0.62];

  let src: Awaited<ReturnType<typeof decodificar>>;
  try {
    src = await decodificar(file);
  } catch {
    if (esHeic(file)) {
      throw new Error(
        "Tu teléfono guardó la foto en formato HEIC y el navegador no puede abrirla. " +
        "Cambiá la cámara a \u201cMás compatible\u201d (JPG), o compartí la foto desde la galería."
      );
    }
    throw new Error("No pudimos leer esa imagen. Probá con otra foto (JPG o PNG).");
  }

  try {
    const intentar = (maxLado: number): string | null => {
      let w = src.width;
      let h = src.height;

      if (Math.max(w, h) > maxLado) {
        const ratio = maxLado / Math.max(w, h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      src.draw(ctx, w, h);

      for (const calidad of CALIDADES) {
        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        if (dataUrl.length <= PRESUPUESTO) return dataUrl;
      }
      return null;
    };

    const r = intentar(LADO_1) ?? intentar(LADO_2);
    if (r === null) {
      throw new Error("La imagen es demasiado grande, incluso comprimida.");
    }
    return r;
  } finally {
    src.close();
  }
}
