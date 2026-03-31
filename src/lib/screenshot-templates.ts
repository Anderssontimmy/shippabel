export interface ScreenshotTemplate {
  id: string;
  name: string;
  description: string;
  category: string[];
  render: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    img: HTMLImageElement,
    caption: string,
    bgOverride?: string
  ) => void;
}

const templateCssBackgrounds: Record<string, string> = {
  "bold-headline": "linear-gradient(180deg, #111827 0%, #1f2937 100%)",
  "floating-device": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "review-showcase": "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
  "dark-elegant": "linear-gradient(180deg, #0a0a0a 0%, #171717 100%)",
  "minimal-clean": "#f8f9fa",
  "sunrise-warm": "linear-gradient(160deg, #ff6b6b 0%, #feca57 50%, #ff9ff3 100%)",
  "nature-green": "linear-gradient(160deg, #065f46 0%, #059669 50%, #34d399 100%)",
  "ocean-deep": "linear-gradient(180deg, #0c1445 0%, #1565c0 100%)",
  "connected-panorama": "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)",
};

export function getTemplateBackground(id: string): string {
  return templateCssBackgrounds[id] ?? "#1a1a2e";
}

// --- Shared drawing helpers ---

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

function drawDevice(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, dw: number, dh: number,
  options?: { shadow?: boolean; rotation?: number }
) {
  const radius = dw * 0.085;
  const bezel = dw * 0.015;

  ctx.save();

  if (options?.rotation) {
    const cx = x + dw / 2;
    const cy = y + dh / 2;
    ctx.translate(cx, cy);
    ctx.rotate((options.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // Shadow
  if (options?.shadow !== false) {
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = dw * 0.06;
    ctx.shadowOffsetY = dw * 0.02;
  }

  // Bezel
  roundRect(ctx, x - bezel, y - bezel, dw + bezel * 2, dh + bezel * 2, radius + bezel);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Screen
  ctx.save();
  roundRect(ctx, x, y, dw, dh, radius);
  ctx.clip();

  const imgAspect = img.width / img.height;
  const screenAspect = dw / dh;
  let drawW: number, drawH: number, drawX: number, drawY: number;
  if (imgAspect > screenAspect) {
    drawH = dh; drawW = drawH * imgAspect;
    drawX = x - (drawW - dw) / 2; drawY = y;
  } else {
    drawW = dw; drawH = drawW / imgAspect;
    drawX = x; drawY = y - (drawH - dh) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
  ctx.restore();

  // Dynamic Island
  const notchW = dw * 0.28;
  const notchH = dw * 0.05;
  roundRect(ctx, x + (dw - notchW) / 2, y + dw * 0.02, notchW, notchH, notchH / 2);
  ctx.fillStyle = "#000";
  ctx.fill();

  // Home indicator
  const homeW = dw * 0.35;
  const homeH = dw * 0.012;
  roundRect(ctx, x + (dw - homeW) / 2, y + dh - dw * 0.035, homeW, homeH, homeH / 2);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fill();

  ctx.restore();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  w: number,
  text: string,
  x: number, y: number,
  fontSize: number,
  color: string,
  fontWeight = "700",
  maxWidth?: number
) {
  ctx.font = `${fontWeight} ${fontSize}px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const mw = maxWidth ?? w * 0.82;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > mw && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.25;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });

  return lines.length * lineHeight;
}

function fillBg(ctx: CanvasRenderingContext2D, w: number, h: number, defaultFill: () => void, bgOverride?: string) {
  if (bgOverride) {
    ctx.fillStyle = bgOverride;
    ctx.fillRect(0, 0, w, h);
  } else {
    defaultFill();
  }
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, count: number) {
  for (let i = 0; i < count; i++) {
    const sx = x + i * (size * 1.3);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = j % 2 === 0 ? size / 2 : size / 5;
      const px = sx + size / 2 + r * Math.cos(angle);
      const py = y + size / 2 + r * Math.sin(angle);
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}

// --- Templates ---

const templates: ScreenshotTemplate[] = [
  {
    id: "bold-headline",
    name: "Bold Headline",
    description: "Large text on top, device below",
    category: ["general", "productivity", "business", "tools"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      // Background
      if (bgOverride) {
        ctx.fillStyle = bgOverride;
        ctx.fillRect(0, 0, w, h);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#111827");
        grad.addColorStop(1, "#1f2937");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Glow
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.2, w * 0.5);
      glow.addColorStop(0, "rgba(99, 102, 241, 0.1)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Big caption at top
      const fontSize = Math.round(w * 0.058);
      const captionH = drawCaption(ctx, w, caption || "Your App Name", w / 2, h * 0.06, fontSize, "#ffffff", "800");

      // Subtitle
      const subSize = Math.round(w * 0.028);
      drawCaption(ctx, w, "Designed to make your life easier", w / 2, h * 0.06 + captionH + h * 0.015, subSize, "rgba(255,255,255,0.4)", "400");

      // Device — large, centered, cropped at bottom
      const dw = w * 0.7;
      const dh = dw * 2.1;
      const dx = (w - dw) / 2;
      const dy = h * 0.28;
      drawDevice(ctx, img, dx, dy, dw, dh);
    },
  },
  {
    id: "floating-device",
    name: "Floating Device",
    description: "Tilted device with shadow — dynamic feel",
    category: ["social", "entertainment", "music", "dating"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      fillBg(ctx, w, h, () => {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "#667eea"); grad.addColorStop(1, "#764ba2");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      }, bgOverride);

      // Glass circles
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath(); ctx.arc(w * 0.15, h * 0.12, w * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(w * 0.85, h * 0.75, w * 0.25, 0, Math.PI * 2); ctx.fill();

      // Caption
      const fontSize = Math.round(w * 0.048);
      drawCaption(ctx, w, caption || "Your App Name", w / 2, h * 0.05, fontSize, "#ffffff", "700");

      // Tilted device
      const dw = w * 0.65;
      const dh = dw * 2.1;
      const dx = (w - dw) / 2;
      const dy = h * 0.22;
      drawDevice(ctx, img, dx, dy, dw, dh, { shadow: true, rotation: -5 });
    },
  },
  {
    id: "review-showcase",
    name: "Review Showcase",
    description: "Stars + review quote + screenshot",
    category: ["rated", "popular", "top", "featured"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      fillBg(ctx, w, h, () => {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#0f172a"); grad.addColorStop(1, "#1e293b");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      }, bgOverride);

      // Stars
      const starSize = w * 0.04;
      drawStars(ctx, w / 2 - (starSize * 1.3 * 5) / 2, h * 0.045, starSize, 5);

      // Rating text
      const ratingSize = Math.round(w * 0.025);
      ctx.font = `500 ${ratingSize}px -apple-system, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "center";
      ctx.fillText("4.9 out of 5 — 2,847 ratings", w / 2, h * 0.045 + starSize + w * 0.02);

      // Quote
      const quoteSize = Math.round(w * 0.032);
      ctx.font = `italic 400 ${quoteSize}px Georgia, serif`;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.textAlign = "center";
      const quote = caption ? `"${caption}"` : '"This app changed how I work every day"';
      drawCaption(ctx, w, quote, w / 2, h * 0.13, quoteSize, "rgba(255,255,255,0.7)", "400");

      // Device
      const dw = w * 0.68;
      const dh = dw * 2.1;
      const dx = (w - dw) / 2;
      const dy = h * 0.28;
      drawDevice(ctx, img, dx, dy, dw, dh);
    },
  },
  {
    id: "dark-elegant",
    name: "Dark Elegant",
    description: "Premium black with gold accent",
    category: ["premium", "photo", "video", "creative", "crypto"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      fillBg(ctx, w, h, () => {
        ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, w, h);
      }, bgOverride);

      // Gold accent lines
      const lineGrad = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, 0);
      lineGrad.addColorStop(0, "transparent");
      lineGrad.addColorStop(0.3, "rgba(251, 191, 36, 0.2)");
      lineGrad.addColorStop(0.7, "rgba(251, 191, 36, 0.2)");
      lineGrad.addColorStop(1, "transparent");
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, h * 0.04, w, 1);
      ctx.fillRect(0, h * 0.96, w, 1);

      // Glow behind device
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.4);
      glow.addColorStop(0, "rgba(251, 191, 36, 0.04)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Caption in gold
      const fontSize = Math.round(w * 0.042);
      drawCaption(ctx, w, caption || "Premium Experience", w / 2, h * 0.055, fontSize, "#fbbf24", "600");

      // Subtitle
      const subSize = Math.round(w * 0.024);
      drawCaption(ctx, w, "Crafted with care", w / 2, h * 0.055 + fontSize * 1.4, subSize, "rgba(255,255,255,0.3)", "400");

      // Device
      const dw = w * 0.68;
      const dh = dw * 2.1;
      const dx = (w - dw) / 2;
      const dy = h * 0.22;
      drawDevice(ctx, img, dx, dy, dw, dh);
    },
  },
  {
    id: "minimal-clean",
    name: "Minimal Clean",
    description: "White background — your app speaks",
    category: ["business", "productivity", "utilities", "notes"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      fillBg(ctx, w, h, () => {
        ctx.fillStyle = "#f8f9fa"; ctx.fillRect(0, 0, w, h);
      }, bgOverride);

      // Caption in dark
      const fontSize = Math.round(w * 0.046);
      drawCaption(ctx, w, caption || "Simply Beautiful", w / 2, h * 0.06, fontSize, "#111827", "700");

      // Subtle subtitle
      const subSize = Math.round(w * 0.026);
      drawCaption(ctx, w, "Everything you need, nothing you don't", w / 2, h * 0.06 + fontSize * 1.4, subSize, "rgba(0,0,0,0.35)", "400");

      // Device with lighter shadow
      const dw = w * 0.7;
      const dh = dw * 2.1;
      const dx = (w - dw) / 2;
      const dy = h * 0.24;
      drawDevice(ctx, img, dx, dy, dw, dh);
    },
  },
  {
    id: "sunrise-warm",
    name: "Sunrise Warm",
    description: "Warm gradients — lifestyle & family",
    category: ["food", "lifestyle", "family", "kids", "cooking"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      fillBg(ctx, w, h, () => {
        const grad = ctx.createLinearGradient(0, 0, w * 0.5, h);
        grad.addColorStop(0, "#ff6b6b"); grad.addColorStop(0.4, "#feca57"); grad.addColorStop(0.8, "#ff9ff3");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      }, bgOverride);

      // Caption
      const fontSize = Math.round(w * 0.046);
      drawCaption(ctx, w, caption || "Made with Love", w / 2, h * 0.055, fontSize, "#ffffff", "700");

      // Device
      const dw = w * 0.68;
      const dh = dw * 2.1;
      const dx = (w - dw) / 2;
      const dy = h * 0.2;
      drawDevice(ctx, img, dx, dy, dw, dh);
    },
  },
  {
    id: "nature-green",
    name: "Nature Green",
    description: "Fresh green — health & fitness",
    category: ["fitness", "health", "wellness", "outdoor", "sports"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      fillBg(ctx, w, h, () => {
        const grad = ctx.createLinearGradient(0, 0, w * 0.3, h);
        grad.addColorStop(0, "#065f46"); grad.addColorStop(0.5, "#059669"); grad.addColorStop(1, "#34d399");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      }, bgOverride);

      // Organic accent shapes
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath(); ctx.ellipse(w * 0.8, h * 0.12, w * 0.25, w * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w * 0.15, h * 0.8, w * 0.2, w * 0.1, 0.2, 0, Math.PI * 2); ctx.fill();

      // Caption
      const fontSize = Math.round(w * 0.046);
      drawCaption(ctx, w, caption || "Stay Active", w / 2, h * 0.055, fontSize, "#ffffff", "700");

      // Device
      const dw = w * 0.68;
      const dh = dw * 2.1;
      const dx = (w - dw) / 2;
      const dy = h * 0.2;
      drawDevice(ctx, img, dx, dy, dw, dh);
    },
  },
  {
    id: "ocean-deep",
    name: "Ocean Deep",
    description: "Deep blue — trust & finance",
    category: ["finance", "banking", "education", "meditation"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      fillBg(ctx, w, h, () => {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#0c1445"); grad.addColorStop(0.5, "#1565c0"); grad.addColorStop(1, "#42a5f5");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      }, bgOverride);

      // Wave
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.moveTo(0, h * 0.65);
      ctx.quadraticCurveTo(w * 0.25, h * 0.6, w * 0.5, h * 0.65);
      ctx.quadraticCurveTo(w * 0.75, h * 0.7, w, h * 0.62);
      ctx.lineTo(w, h); ctx.lineTo(0, h);
      ctx.fill();

      // Caption
      const fontSize = Math.round(w * 0.046);
      drawCaption(ctx, w, caption || "Your Money, Your Way", w / 2, h * 0.055, fontSize, "#ffffff", "700");

      // Device
      const dw = w * 0.68;
      const dh = dw * 2.1;
      const dx = (w - dw) / 2;
      const dy = h * 0.2;
      drawDevice(ctx, img, dx, dy, dw, dh);
    },
  },
  {
    id: "connected-panorama",
    name: "Connected Panorama",
    description: "Screenshot flows edge-to-edge — no device frame",
    category: ["general", "social", "photo", "maps"],
    render: (ctx, w, h, img, caption, bgOverride) => {
      // Background
      if (bgOverride) {
        ctx.fillStyle = bgOverride;
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, "#1e1b4b");
        grad.addColorStop(1, "#312e81");
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, 0, w, h);

      // Caption at top
      if (caption) {
        const fontSize = Math.round(w * 0.042);
        drawCaption(ctx, w, caption, w / 2, h * 0.04, fontSize, "#ffffff", "700");
      }

      // Screenshot fills most of the frame — edge to edge horizontally with rounded corners
      const imgY = h * 0.14;
      const imgH = h * 0.82;
      const imgW = w * 0.92;
      const imgX = (w - imgW) / 2;
      const radius = w * 0.04;

      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = w * 0.03;
      ctx.shadowOffsetY = w * 0.01;

      ctx.save();
      roundRect(ctx, imgX, imgY, imgW, imgH, radius);
      ctx.clip();

      // Fill black first (in case image doesn't cover)
      ctx.fillStyle = "#000";
      ctx.fill();

      // Draw screenshot to fill
      const imgAspect = img.width / img.height;
      const frameAspect = imgW / imgH;
      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (imgAspect > frameAspect) {
        drawH = imgH; drawW = drawH * imgAspect;
        drawX = imgX - (drawW - imgW) / 2; drawY = imgY;
      } else {
        drawW = imgW; drawH = drawW / imgAspect;
        drawX = imgX; drawY = imgY - (drawH - imgH) / 2;
      }
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    },
  },
];

export function getTemplates(): ScreenshotTemplate[] {
  return templates;
}

export function getTemplateById(id: string): ScreenshotTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function suggestTemplate(appCategory?: string): ScreenshotTemplate {
  if (!appCategory) return templates[0]!;
  const lower = appCategory.toLowerCase();
  const match = templates.find((t) => t.category.some((c) => lower.includes(c)));
  return match ?? templates[0]!;
}

export function renderTemplateScreenshot(
  template: ScreenshotTemplate,
  screenshotImg: HTMLImageElement,
  caption: string,
  outputWidth: number,
  outputHeight: number,
  bgOverride?: string
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;
  template.render(ctx, outputWidth, outputHeight, screenshotImg, caption, bgOverride);
  return canvas;
}
