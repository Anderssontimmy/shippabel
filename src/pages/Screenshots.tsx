import { useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "@/components/ui/Toast";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import {
  Upload,
  ArrowLeft,
  X,
  Download,
  Plus,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Screenshot {
  id: string;
  file: File;
  preview: string;
  caption: string;
}

type DeviceFrame = "iphone16pro" | "pixel9" | "ipad";

const deviceFrames: { id: DeviceFrame; label: string; icon: typeof Smartphone; width: number; height: number; radius: number }[] = [
  { id: "iphone16pro", label: "iPhone 16 Pro", icon: Smartphone, width: 393, height: 852, radius: 55 },
  { id: "pixel9", label: "Pixel 9", icon: Smartphone, width: 412, height: 915, radius: 40 },
  { id: "ipad", label: "iPad Pro", icon: Tablet, width: 1024, height: 1366, radius: 20 },
];

const storeRequirements = {
  iphone16pro: [
    { name: '6.7" Display', width: 1290, height: 2796 },
    { name: '6.5" Display', width: 1284, height: 2778 },
    { name: '5.5" Display', width: 1242, height: 2208 },
  ],
  pixel9: [
    { name: "Phone", width: 1080, height: 1920 },
  ],
  ipad: [
    { name: '12.9" Display', width: 2048, height: 2732 },
  ],
};

export const Screenshots = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceFrame>("iphone16pro");
  const [captionColor, setCaptionColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#6366f1");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const device = deviceFrames.find((d) => d.id === selectedDevice)!;

  const addScreenshots = useCallback((files: FileList | null) => {
    if (!files) return;
    const newScreenshots: Screenshot[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        caption: "",
      }));
    setScreenshots((prev) => [...prev, ...newScreenshots]);
  }, []);

  const removeScreenshot = (id: string) => {
    setScreenshots((prev) => {
      const removed = prev.find((s) => s.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((s) => s.id !== id);
    });
  };

  const updateCaption = (id: string, caption: string) => {
    setScreenshots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, caption } : s))
    );
  };

  const renderFramedScreenshot = async (screenshot: Screenshot): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // Output at store-required size
    const req = storeRequirements[selectedDevice][0]!;
    canvas.width = req.width;
    canvas.height = req.height;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Caption area (top 15%)
    if (screenshot.caption) {
      const captionHeight = canvas.height * 0.12;
      ctx.fillStyle = captionColor;
      ctx.font = `bold ${Math.round(canvas.width * 0.045)}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(screenshot.caption, canvas.width / 2, captionHeight / 2 + 20);
    }

    // Load and draw screenshot image in device frame area
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = screenshot.preview;
    });

    const captionSpace = screenshot.caption ? canvas.height * 0.12 : canvas.height * 0.04;
    const frameWidth = canvas.width * 0.78;
    const frameHeight = (canvas.height - captionSpace) * 0.92;
    const frameX = (canvas.width - frameWidth) / 2;
    const frameY = captionSpace;

    // Device frame border
    const borderRadius = device.radius * (canvas.width / device.width);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 4;
    roundRect(ctx, frameX - 8, frameY - 8, frameWidth + 16, frameHeight + 16, borderRadius + 4);
    ctx.stroke();

    // Clip to device shape
    ctx.save();
    roundRect(ctx, frameX, frameY, frameWidth, frameHeight, borderRadius);
    ctx.clip();

    // Draw image to fill frame
    const imgAspect = img.width / img.height;
    const frameAspect = frameWidth / frameHeight;
    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (imgAspect > frameAspect) {
      drawH = frameHeight;
      drawW = drawH * imgAspect;
      drawX = frameX - (drawW - frameWidth) / 2;
      drawY = frameY;
    } else {
      drawW = frameWidth;
      drawH = drawW / imgAspect;
      drawX = frameX;
      drawY = frameY - (drawH - frameHeight) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/png");
    });
  };

  const downloadAll = async () => {
    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i]!;
      const blob = await renderFramedScreenshot(screenshot);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screenshot_${selectedDevice}_${i + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast("success", `${screenshots.length} screenshots downloaded!`);
  };

  return (
    <div>
    {id && <ShipFlowBar projectId={id} />}
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-16">
      <div className="flex items-center gap-3 mb-8">
        <Link to={`/app/${id}/listing`} className="text-surface-500 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Screenshots</h1>
          <p className="text-surface-400 text-sm mt-1">
            Upload screenshots and we'll frame them for the store
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          {/* Device selector */}
          <Card>
            <h3 className="text-sm font-semibold mb-3">Device Frame</h3>
            <div className="space-y-2">
              {deviceFrames.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDevice(d.id)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all cursor-pointer ${
                    selectedDevice === d.id
                      ? "bg-primary-500/10 text-primary-300 border border-primary-500/30"
                      : "text-surface-400 hover:text-white hover:bg-surface-800"
                  }`}
                >
                  <d.icon className="h-4 w-4" />
                  {d.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Style */}
          <Card>
            <h3 className="text-sm font-semibold mb-3">Style</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-400 block mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 rounded bg-surface-800 border border-surface-700 px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-400 block mb-1">Caption Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={captionColor}
                    onChange={(e) => setCaptionColor(e.target.value)}
                    className="h-8 w-8 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={captionColor}
                    onChange={(e) => setCaptionColor(e.target.value)}
                    className="flex-1 rounded bg-surface-800 border border-surface-700 px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Required sizes */}
          <Card>
            <h3 className="text-sm font-semibold mb-3">Required Sizes</h3>
            <div className="space-y-1.5">
              {storeRequirements[selectedDevice].map((req) => (
                <div key={req.name} className="flex justify-between text-xs text-surface-400">
                  <span>{req.name}</span>
                  <span>{req.width} x {req.height}</span>
                </div>
              ))}
            </div>
          </Card>

          {screenshots.length > 0 && (
            <>
              <Button onClick={downloadAll} className="w-full gap-2">
                <Download className="h-4 w-4" />
                Download all ({screenshots.length})
              </Button>
              <Link to={`/app/${id}/submit`} className="block mt-3">
                <Button variant="secondary" className="w-full gap-2">
                  Continue to publish →
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Screenshot grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {screenshots.map((screenshot) => (
              <div key={screenshot.id} className="group relative">
                <div
                  className="rounded-xl overflow-hidden border border-surface-800 aspect-[9/19.5]"
                  style={{ backgroundColor: bgColor }}
                >
                  {screenshot.caption && (
                    <div className="text-center pt-3 px-2">
                      <p className="text-[10px] font-semibold" style={{ color: captionColor }}>
                        {screenshot.caption}
                      </p>
                    </div>
                  )}
                  <div className="p-3">
                    <img
                      src={screenshot.preview}
                      alt=""
                      className="w-full rounded-lg"
                      style={{ borderRadius: `${device.radius * 0.15}px` }}
                    />
                  </div>
                </div>

                {/* Caption input */}
                <input
                  value={screenshot.caption}
                  onChange={(e) => updateCaption(screenshot.id, e.target.value)}
                  placeholder="Add caption..."
                  className="w-full mt-2 rounded bg-surface-800 border border-surface-700 px-2 py-1.5 text-xs text-white placeholder:text-surface-600 outline-none focus:border-primary-500"
                />

                {/* Remove button */}
                <button
                  onClick={() => removeScreenshot(screenshot.id)}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}

            {/* Add button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-surface-700 hover:border-surface-600 aspect-[9/19.5] flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="h-8 w-8 text-surface-600" />
              <span className="text-xs text-surface-500">Add screenshot</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addScreenshots(e.target.files)}
          />

          {screenshots.length === 0 && (
            <Card className="mt-6 text-center py-8">
              <Upload className="h-10 w-10 text-surface-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold mb-1">No screenshots yet</h3>
              <p className="text-xs text-surface-500 mb-4">
                Upload your app screenshots and we'll frame them in device mockups
              </p>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Upload screenshots
              </Button>
            </Card>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
    </div>
  );
};

// Canvas rounded rectangle helper
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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
