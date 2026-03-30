export interface ScreenshotTemplate {
  id: string;
  name: string;
  category: string[];
  style: "minimal" | "gradient" | "bold" | "dark" | "pastel" | "glass";
  background: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  captionStyle: {
    color: string;
    fontSize: number;
    fontWeight: string;
    yPosition: number; // percentage from top
  };
  deviceInset: {
    top: number; // percentage
    left: number;
    width: number; // percentage of canvas width
  };
}

const templates: ScreenshotTemplate[] = [
  {
    id: "clean-gradient",
    name: "Clean Gradient",
    category: ["fitness", "health", "productivity", "general"],
    style: "gradient",
    background: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#667eea");
      grad.addColorStop(1, "#764ba2");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    captionStyle: { color: "#ffffff", fontSize: 0.038, fontWeight: "700", yPosition: 0.06 },
    deviceInset: { top: 0.15, left: 0.11, width: 0.78 },
  },
  {
    id: "midnight-dark",
    name: "Midnight Dark",
    category: ["finance", "crypto", "tools", "developer"],
    style: "dark",
    background: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0f0f0f");
      grad.addColorStop(1, "#1a1a2e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Subtle grid pattern
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += w / 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += h / 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    },
    captionStyle: { color: "#ffffff", fontSize: 0.036, fontWeight: "700", yPosition: 0.06 },
    deviceInset: { top: 0.15, left: 0.11, width: 0.78 },
  },
  {
    id: "sunrise-warm",
    name: "Sunrise Warm",
    category: ["food", "social", "lifestyle", "kids", "family"],
    style: "gradient",
    background: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#f093fb");
      grad.addColorStop(0.5, "#f5576c");
      grad.addColorStop(1, "#fda085");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    captionStyle: { color: "#ffffff", fontSize: 0.038, fontWeight: "700", yPosition: 0.06 },
    deviceInset: { top: 0.15, left: 0.11, width: 0.78 },
  },
  {
    id: "ocean-calm",
    name: "Ocean Calm",
    category: ["meditation", "wellness", "health", "education"],
    style: "pastel",
    background: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#e0f7fa");
      grad.addColorStop(0.5, "#b2ebf2");
      grad.addColorStop(1, "#80deea");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Soft circles
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath(); ctx.arc(w * 0.8, h * 0.2, w * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.2, h * 0.7, w * 0.25, 0, Math.PI * 2); ctx.fill();
    },
    captionStyle: { color: "#004d40", fontSize: 0.036, fontWeight: "700", yPosition: 0.06 },
    deviceInset: { top: 0.15, left: 0.11, width: 0.78 },
  },
  {
    id: "bold-green",
    name: "Bold Green",
    category: ["fitness", "sports", "outdoor", "health"],
    style: "bold",
    background: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w * 0.5, h);
      grad.addColorStop(0, "#0f9b0f");
      grad.addColorStop(1, "#0a7e0a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Diagonal accent stripe
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.moveTo(w * 0.6, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h * 0.4);
      ctx.closePath();
      ctx.fill();
    },
    captionStyle: { color: "#ffffff", fontSize: 0.04, fontWeight: "800", yPosition: 0.055 },
    deviceInset: { top: 0.15, left: 0.11, width: 0.78 },
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    category: ["business", "productivity", "finance", "general"],
    style: "minimal",
    background: (ctx, w, h) => {
      ctx.fillStyle = "#fafafa";
      ctx.fillRect(0, 0, w, h);
      // Subtle bottom gradient
      const grad = ctx.createLinearGradient(0, h * 0.7, 0, h);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.03)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    captionStyle: { color: "#1a1a1a", fontSize: 0.036, fontWeight: "700", yPosition: 0.06 },
    deviceInset: { top: 0.15, left: 0.11, width: 0.78 },
  },
];

// CSS gradient approximations for previews (Canvas API can't be used in CSS)
const templateCssBackgrounds: Record<string, string> = {
  "clean-gradient": "linear-gradient(135deg, #667eea, #764ba2)",
  "midnight-dark": "linear-gradient(180deg, #0f0f0f, #1a1a2e)",
  "sunrise-warm": "linear-gradient(135deg, #f093fb, #f5576c, #fda085)",
  "ocean-calm": "linear-gradient(180deg, #e0f7fa, #80deea)",
  "bold-green": "linear-gradient(135deg, #0f9b0f, #0a7e0a)",
  "minimal-white": "#fafafa",
};

export function getTemplateBackground(id: string): string {
  return templateCssBackgrounds[id] ?? "#6366f1";
}

export function getTemplates(): ScreenshotTemplate[] {
  return templates;
}

export function getTemplateById(id: string): ScreenshotTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function suggestTemplate(appCategory?: string): ScreenshotTemplate {
  if (!appCategory) return templates[0]!;

  const lower = appCategory.toLowerCase();
  // Find template with matching category
  const match = templates.find((t) =>
    t.category.some((c) => lower.includes(c))
  );
  return match ?? templates[0]!;
}

export function renderTemplateScreenshot(
  template: ScreenshotTemplate,
  screenshotImg: HTMLImageElement,
  caption: string,
  outputWidth: number,
  outputHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  const w = outputWidth;
  const h = outputHeight;

  // 1. Draw background
  template.background(ctx, w, h);

  // 2. Draw caption
  if (caption) {
    const fontSize = Math.round(w * template.captionStyle.fontSize);
    ctx.font = `${template.captionStyle.fontWeight} ${fontSize}px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`;
    ctx.fillStyle = template.captionStyle.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Word wrap
    const maxWidth = w * 0.8;
    const words = caption.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = fontSize * 1.3;
    const captionY = h * template.captionStyle.yPosition;
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, captionY + i * lineHeight);
    });
  }

  // 3. Draw device frame + screenshot
  const deviceX = w * template.deviceInset.left;
  const deviceW = w * template.deviceInset.width;
  const deviceY = h * template.deviceInset.top;
  const deviceH = h * 0.82;
  const borderRadius = deviceW * 0.08;

  // Device shadow
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = w * 0.03;
  ctx.shadowOffsetY = w * 0.01;

  // Device body (black bezel)
  roundRect(ctx, deviceX - deviceW * 0.02, deviceY - deviceW * 0.02, deviceW + deviceW * 0.04, deviceH + deviceW * 0.04, borderRadius + 4);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Screen area (clip and draw image)
  ctx.save();
  roundRect(ctx, deviceX, deviceY, deviceW, deviceH, borderRadius);
  ctx.clip();

  // Draw screenshot to fill device screen
  const imgAspect = screenshotImg.width / screenshotImg.height;
  const screenAspect = deviceW / deviceH;
  let drawW: number, drawH: number, drawX: number, drawY: number;

  if (imgAspect > screenAspect) {
    drawH = deviceH;
    drawW = drawH * imgAspect;
    drawX = deviceX - (drawW - deviceW) / 2;
    drawY = deviceY;
  } else {
    drawW = deviceW;
    drawH = drawW / imgAspect;
    drawX = deviceX;
    drawY = deviceY - (drawH - deviceH) / 2;
  }

  ctx.drawImage(screenshotImg, drawX, drawY, drawW, drawH);
  ctx.restore();

  // Notch / Dynamic Island
  const notchW = deviceW * 0.3;
  const notchH = deviceW * 0.065;
  const notchX = deviceX + (deviceW - notchW) / 2;
  const notchY = deviceY + deviceW * 0.025;
  ctx.fillStyle = "#000";
  roundRect(ctx, notchX, notchY, notchW, notchH, notchH / 2);
  ctx.fill();

  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
