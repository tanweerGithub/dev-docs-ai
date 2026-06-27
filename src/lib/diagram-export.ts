function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getSvgDimensions(svg: SVGElement): { width: number; height: number } {
  const svgEl = svg as SVGSVGElement;
  const viewBox = svgEl.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return { width: viewBox.width, height: viewBox.height };
  }
  const width = parseFloat(svg.getAttribute("width") ?? "0");
  const height = parseFloat(svg.getAttribute("height") ?? "0");
  if (width > 0 && height > 0) return { width, height };
  const rect = svg.getBoundingClientRect();
  return {
    width: rect.width || 800,
    height: rect.height || 600,
  };
}

async function svgToCanvas(
  svg: SVGElement,
  scale: number,
  background: string
): Promise<HTMLCanvasElement> {
  const clone = svg.cloneNode(true) as SVGElement;
  const { width, height } = getSvgDimensions(svg);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load diagram image"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportDiagramPng(
  svg: SVGElement,
  filename: string,
  options?: { scale?: number; background?: string }
): Promise<void> {
  const scale = options?.scale ?? 2;
  const background = options?.background ?? "#ffffff";
  const canvas = await svgToCanvas(svg, scale, background);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("Failed to create PNG");
  downloadBlob(blob, filename);
}

export async function exportDiagramPdf(
  svg: SVGElement,
  filename: string,
  options?: { scale?: number; background?: string }
): Promise<void> {
  const scale = options?.scale ?? 2;
  const background = options?.background ?? "#ffffff";
  const canvas = await svgToCanvas(svg, scale, background);
  const { jsPDF } = await import("jspdf");

  const imgData = canvas.toDataURL("image/png");
  const pxWidth = canvas.width;
  const pxHeight = canvas.height;
  const orientation = pxWidth >= pxHeight ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [pxWidth, pxHeight],
  });

  pdf.addImage(imgData, "PNG", 0, 0, pxWidth, pxHeight);
  pdf.save(filename);
}