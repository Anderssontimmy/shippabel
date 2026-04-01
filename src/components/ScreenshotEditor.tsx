import { useState, useRef, useCallback, useEffect } from "react";
import {
  Smartphone,
  Type,
  Image,
  Palette,
  Download,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Layers,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

// --- Types ---

interface EditorObject {
  id: string;
  type: "device" | "text";
  x: number; // percentage of canvas width (0-100)
  y: number; // percentage of canvas height (0-100)
  width: number; // percentage
  height: number; // percentage
  rotation: number; // degrees
  zIndex: number;
}

interface DeviceObject extends EditorObject {
  type: "device";
  deviceType: "iphone" | "android" | "ipad";
  screenshotSrc: string | null;
}

interface TextObject extends EditorObject {
  type: "text";
  text: string;
  fontSize: number; // percentage of canvas width
  fontWeight: string;
  color: string;
}

type AnyObject = DeviceObject | TextObject;

interface PageData {
  id: string;
  objects: AnyObject[];
  bgColor: string;
  bgGradient: string | null;
}

// --- Device frame SVG paths ---

const DEVICE_ASPECT = 2.17; // iPhone aspect ratio (height/width)

// --- Component ---

export const ScreenshotEditor = () => {
  const { toast } = useToast();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Pages (5 app store screenshots)
  const [pages, setPages] = useState<PageData[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `page-${i}`,
      objects: [],
      bgColor: "#f0f0ff",
      bgGradient: null,
    }))
  );
  const [activePage, setActivePage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState("");
  const [tool, setTool] = useState<"select" | "device" | "text">("select");

  const currentPage = pages[activePage]!;
  const selectedObject = currentPage.objects.find((o) => o.id === selectedId) ?? null;

  // --- Page helpers ---

  const updatePage = useCallback((pageIndex: number, updater: (p: PageData) => PageData) => {
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? updater(p) : p)));
  }, []);

  const updateObject = useCallback((objId: string, updates: Partial<AnyObject>) => {
    updatePage(activePage, (p) => ({
      ...p,
      objects: p.objects.map((o) => (o.id === objId ? { ...o, ...updates } as AnyObject : o)),
    }));
  }, [activePage, updatePage]);

  const addObject = useCallback((obj: AnyObject) => {
    updatePage(activePage, (p) => ({ ...p, objects: [...p.objects, obj] }));
    setSelectedId(obj.id);
    setTool("select");
  }, [activePage, updatePage]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    updatePage(activePage, (p) => ({
      ...p,
      objects: p.objects.filter((o) => o.id !== selectedId),
    }));
    setSelectedId(null);
  }, [selectedId, activePage, updatePage]);

  const duplicateSelected = useCallback(() => {
    if (!selectedObject) return;
    const newObj = { ...selectedObject, id: crypto.randomUUID(), x: selectedObject.x + 3, y: selectedObject.y + 3 };
    addObject(newObj as AnyObject);
  }, [selectedObject, addObject]);

  // --- Add device ---

  const addDevice = useCallback(() => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const src = URL.createObjectURL(file);
      const deviceWidth = 25; // 25% of canvas width
      const obj: DeviceObject = {
        id: crypto.randomUUID(),
        type: "device",
        x: 30 + Math.random() * 20,
        y: 15,
        width: deviceWidth,
        height: deviceWidth * DEVICE_ASPECT,
        rotation: 0,
        zIndex: currentPage.objects.length,
        deviceType: "iphone",
        screenshotSrc: src,
      };
      addObject(obj);
    };
    fileInput.click();
  }, [addObject, currentPage.objects.length]);

  // --- Add text ---

  const addText = useCallback(() => {
    const obj: TextObject = {
      id: crypto.randomUUID(),
      type: "text",
      x: 20,
      y: 8,
      width: 60,
      height: 10,
      rotation: 0,
      zIndex: currentPage.objects.length,
      text: "Your Headline",
      fontSize: 5,
      fontWeight: "700",
      color: "#000000",
    };
    addObject(obj);
  }, [addObject, currentPage.objects.length]);

  // --- Mouse handlers ---

  const getCanvasPos = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);

    // Check if clicked on an object (reverse order for z-index)
    const sorted = [...currentPage.objects].sort((a, b) => b.zIndex - a.zIndex);
    for (const obj of sorted) {
      if (
        pos.x >= obj.x && pos.x <= obj.x + obj.width &&
        pos.y >= obj.y && pos.y <= obj.y + obj.height
      ) {
        setSelectedId(obj.id);
        setIsDragging(true);
        setDragOffset({ x: pos.x - obj.x, y: pos.y - obj.y });

        // Bring to front
        updateObject(obj.id, { zIndex: Math.max(...currentPage.objects.map((o) => o.zIndex)) + 1 });
        return;
      }
    }

    // Clicked empty space
    setSelectedId(null);
  }, [currentPage.objects, getCanvasPos, updateObject]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedId) return;
    const pos = getCanvasPos(e);
    updateObject(selectedId, {
      x: Math.max(0, Math.min(90, pos.x - dragOffset.x)),
      y: Math.max(0, Math.min(90, pos.y - dragOffset.y)),
    });
  }, [isDragging, selectedId, dragOffset, getCanvasPos, updateObject]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // --- Resize handlers ---

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeCorner(corner);
  }, []);

  // Handle resize during mouse move
  useEffect(() => {
    if (!isResizing || !selectedObject) return;

    const handleMove = (e: MouseEvent) => {
      const rect = canvasContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (resizeCorner === "se") {
        const newW = Math.max(10, x - selectedObject.x);
        const newH = selectedObject.type === "device" ? newW * DEVICE_ASPECT : Math.max(5, y - selectedObject.y);
        updateObject(selectedObject.id, { width: newW, height: newH });
      }
    };

    const handleUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing, selectedObject, resizeCorner, updateObject]);

  // --- Keyboard shortcuts ---

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          deleteSelected();
        }
      }
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        duplicateSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, deleteSelected, duplicateSelected]);

  // --- Export ---

  const rr = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  };

  const exportPage = useCallback(async (pageIndex: number) => {
    const page = pages[pageIndex]!;
    const W = 1290;
    const H = 2796;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background
    if (page.bgGradient) {
      const [c1 = "#fff", c2 = "#fff"] = page.bgGradient.split(",");
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, c1); grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = page.bgColor;
    }
    ctx.fillRect(0, 0, W, H);

    // Sort by z-index
    const sorted = [...page.objects].sort((a, b) => a.zIndex - b.zIndex);

    for (const obj of sorted) {
      const ox = (obj.x / 100) * W;
      const oy = (obj.y / 100) * H;
      const ow = (obj.width / 100) * W;
      const oh = (obj.height / 100) * H;

      ctx.save();
      if (obj.rotation) {
        ctx.translate(ox + ow / 2, oy + oh / 2);
        ctx.rotate((obj.rotation * Math.PI) / 180);
        ctx.translate(-(ox + ow / 2), -(oy + oh / 2));
      }

      if (obj.type === "device") {
        const device = obj as DeviceObject;
        // Device bezel
        const radius = ow * 0.085;
        const bezel = ow * 0.015;

        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = ow * 0.05;
        ctx.shadowOffsetY = ow * 0.015;

        // Bezel
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        rr(ctx,ox - bezel, oy - bezel, ow + bezel * 2, oh + bezel * 2, radius + bezel);
        ctx.fill();

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Screen
        if (device.screenshotSrc) {
          const img = document.createElement("img");
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = device.screenshotSrc!;
          });

          ctx.save();
          ctx.beginPath();
          rr(ctx,ox, oy, ow, oh, radius);
          ctx.clip();
          // Fill to cover
          const iA = img.width / img.height;
          const sA = ow / oh;
          let dw: number, dh: number, dx: number, dy: number;
          if (iA > sA) { dh = oh; dw = dh * iA; dx = ox - (dw - ow) / 2; dy = oy; }
          else { dw = ow; dh = dw / iA; dx = ox; dy = oy - (dh - oh) / 2; }
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        }

        // Dynamic Island
        const nw = ow * 0.28, nh = ow * 0.05;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        rr(ctx,ox + (ow - nw) / 2, oy + ow * 0.02, nw, nh, nh / 2);
        ctx.fill();

        // Home indicator
        const hw = ow * 0.35, hh = ow * 0.012;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath();
        rr(ctx,ox + (ow - hw) / 2, oy + oh - ow * 0.035, hw, hh, hh / 2);
        ctx.fill();
      } else if (obj.type === "text") {
        const textObj = obj as TextObject;
        const fs = (textObj.fontSize / 100) * W;
        ctx.font = `${textObj.fontWeight} ${fs}px -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif`;
        ctx.fillStyle = textObj.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(textObj.text, ox + ow / 2, oy);
      }

      ctx.restore();
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screenshot_${pageIndex + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [pages]);

  const exportAll = useCallback(async () => {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i]!.objects.length > 0) {
        await exportPage(i);
      }
    }
    toast("success", "Screenshots exported!");
  }, [pages, exportPage, toast]);

  // --- Render ---

  const tools = [
    { id: "select" as const, icon: Layers, label: "Select" },
    { id: "device" as const, icon: Smartphone, label: "Device", action: addDevice },
    { id: "text" as const, icon: Type, label: "Text", action: addText },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b border-surface-800 px-4 py-2 bg-surface-950">
        <div className="flex items-center gap-1">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => t.action ? t.action() : setTool(t.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-colors ${
                tool === t.id && !t.action ? "bg-primary-500/20 text-primary-300" : "text-surface-400 hover:text-white hover:bg-surface-800"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
          <div className="w-px h-6 bg-surface-800 mx-1" />
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file"; input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                // Add as background image (future feature)
                toast("info", "Background images coming soon!");
              };
              input.click();
            }}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] text-surface-400 hover:text-white hover:bg-surface-800 cursor-pointer"
          >
            <Image className="h-4 w-4" />
            Image
          </button>
          <button
            onClick={() => {
              /* bg color picker */
            }}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] text-surface-400 hover:text-white hover:bg-surface-800 cursor-pointer"
          >
            <Palette className="h-4 w-4" />
            Background
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedId && (
            <>
              <button onClick={duplicateSelected} className="p-1.5 rounded hover:bg-surface-800 text-surface-400 hover:text-white cursor-pointer" title="Duplicate (Ctrl+D)">
                <Copy className="h-4 w-4" />
              </button>
              <button onClick={() => {
                if (selectedObject) updateObject(selectedId, { rotation: (selectedObject.rotation + 15) % 360 });
              }} className="p-1.5 rounded hover:bg-surface-800 text-surface-400 hover:text-white cursor-pointer" title="Rotate">
                <RotateCw className="h-4 w-4" />
              </button>
              <button onClick={deleteSelected} className="p-1.5 rounded hover:bg-surface-800 text-red-400 hover:text-red-300 cursor-pointer" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="w-px h-6 bg-surface-800 mx-1" />
            </>
          )}
          <Button size="sm" onClick={exportAll} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export all
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — properties */}
        <div className="w-56 border-r border-surface-800 p-3 overflow-y-auto bg-surface-950 space-y-4">
          {/* Background */}
          <div>
            <h4 className="text-xs font-semibold text-surface-400 mb-2">Background</h4>
            <div className="flex gap-2">
              <input
                type="color"
                value={currentPage.bgColor}
                onChange={(e) => updatePage(activePage, (p) => ({ ...p, bgColor: e.target.value, bgGradient: null }))}
                className="h-8 w-8 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={currentPage.bgColor}
                onChange={(e) => updatePage(activePage, (p) => ({ ...p, bgColor: e.target.value, bgGradient: null }))}
                className="flex-1 rounded bg-surface-800 border border-surface-700 px-2 py-1 text-xs text-white"
              />
            </div>
            {/* Quick gradient presets */}
            <div className="grid grid-cols-5 gap-1 mt-2">
              {["#f0f0ff", "#ffffff", "#0a0a0a", "#1e1b4b", "#fdf2f8", "#ecfdf5", "#fef3c7", "#fee2e2", "#f0fdf4", "#eff6ff"].map((c) => (
                <button
                  key={c}
                  onClick={() => updatePage(activePage, (p) => ({ ...p, bgColor: c, bgGradient: null }))}
                  className="h-6 rounded border border-surface-700 cursor-pointer"
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Selected object properties */}
          {selectedObject && selectedObject.type === "text" && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 mb-2">Text</h4>
              <input
                type="text"
                value={(selectedObject as TextObject).text}
                onChange={(e) => updateObject(selectedId!, { text: e.target.value } as Partial<TextObject>)}
                className="w-full rounded bg-surface-800 border border-surface-700 px-2 py-1.5 text-xs text-white mb-2"
              />
              <div className="flex gap-2">
                <input
                  type="color"
                  value={(selectedObject as TextObject).color}
                  onChange={(e) => updateObject(selectedId!, { color: e.target.value } as Partial<TextObject>)}
                  className="h-7 w-7 rounded cursor-pointer border-0"
                />
                <select
                  value={(selectedObject as TextObject).fontWeight}
                  onChange={(e) => updateObject(selectedId!, { fontWeight: e.target.value } as Partial<TextObject>)}
                  className="flex-1 rounded bg-surface-800 border border-surface-700 px-2 py-1 text-xs text-white cursor-pointer"
                >
                  <option value="400">Regular</option>
                  <option value="600">Semibold</option>
                  <option value="700">Bold</option>
                  <option value="800">Extra Bold</option>
                </select>
              </div>
              <div className="mt-2">
                <label className="text-[10px] text-surface-500">Size</label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="0.5"
                  value={(selectedObject as TextObject).fontSize}
                  onChange={(e) => updateObject(selectedId!, { fontSize: parseFloat(e.target.value) } as Partial<TextObject>)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {selectedObject && selectedObject.type === "device" && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 mb-2">Device</h4>
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    updateObject(selectedId!, { screenshotSrc: URL.createObjectURL(file) } as Partial<DeviceObject>);
                  };
                  input.click();
                }}
              >
                Change screenshot
              </Button>
              <div className="mt-2">
                <label className="text-[10px] text-surface-500">Rotation</label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={selectedObject.rotation}
                  onChange={(e) => updateObject(selectedId!, { rotation: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Objects list */}
          <div>
            <h4 className="text-xs font-semibold text-surface-400 mb-2">Layers ({currentPage.objects.length})</h4>
            <div className="space-y-1">
              {[...currentPage.objects].sort((a, b) => b.zIndex - a.zIndex).map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => setSelectedId(obj.id)}
                  className={`w-full text-left px-2 py-1 rounded text-xs cursor-pointer ${
                    selectedId === obj.id ? "bg-primary-500/20 text-primary-300" : "text-surface-400 hover:bg-surface-800"
                  }`}
                >
                  {obj.type === "device" ? "📱 Device" : `T "${(obj as TextObject).text.slice(0, 15)}"`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 bg-surface-900 overflow-auto flex items-center justify-center p-8">
          <div
            ref={canvasContainerRef}
            className="relative bg-white shadow-2xl select-none"
            style={{
              width: "350px",
              height: `${350 * (2796 / 1290)}px`,
              background: currentPage.bgGradient
                ? `linear-gradient(180deg, ${currentPage.bgGradient})`
                : currentPage.bgColor,
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            {/* Render objects */}
            {[...currentPage.objects].sort((a, b) => a.zIndex - b.zIndex).map((obj) => {
              const isSelected = obj.id === selectedId;

              return (
                <div
                  key={obj.id}
                  className={`absolute cursor-move ${isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                  style={{
                    left: `${obj.x}%`,
                    top: `${obj.y}%`,
                    width: `${obj.width}%`,
                    height: `${obj.height}%`,
                    zIndex: obj.zIndex,
                    transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(obj.id);
                    setIsDragging(true);
                    const pos = getCanvasPos(e);
                    setDragOffset({ x: pos.x - obj.x, y: pos.y - obj.y });
                    updateObject(obj.id, { zIndex: Math.max(...currentPage.objects.map((o) => o.zIndex)) + 1 });
                  }}
                >
                  {obj.type === "device" && (
                    <div className="w-full h-full relative">
                      {/* Device bezel */}
                      <div className="absolute inset-0 rounded-[12%/5.5%] bg-[#1a1a1a] shadow-lg" />
                      {/* Screen */}
                      <div className="absolute rounded-[11%/5%] overflow-hidden" style={{ top: "1%", left: "2%", right: "2%", bottom: "1%" }}>
                        {(obj as DeviceObject).screenshotSrc ? (
                          <img src={(obj as DeviceObject).screenshotSrc!} alt="" className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-[8px]">
                            Drop screenshot
                          </div>
                        )}
                      </div>
                      {/* Dynamic Island */}
                      <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[28%] h-[2.3%] bg-black rounded-full" />
                    </div>
                  )}

                  {obj.type === "text" && (
                    <div
                      className="w-full h-full flex items-start justify-center"
                      style={{
                        fontSize: `${(obj as TextObject).fontSize * 3.5}px`,
                        fontWeight: (obj as TextObject).fontWeight,
                        color: (obj as TextObject).color,
                        fontFamily: '-apple-system, "SF Pro Display", "Helvetica Neue", sans-serif',
                        lineHeight: 1.2,
                        textAlign: "center",
                      }}
                    >
                      {(obj as TextObject).text}
                    </div>
                  )}

                  {/* Resize handle */}
                  {isSelected && (
                    <div
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize"
                      onMouseDown={(e) => handleResizeStart(e, "se")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page navigation */}
      <div className="flex items-center justify-center gap-2 border-t border-surface-800 px-4 py-2 bg-surface-950">
        <button onClick={() => setActivePage(Math.max(0, activePage - 1))} className="p-1 text-surface-400 hover:text-white cursor-pointer">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((_, i) => (
          <button
            key={i}
            onClick={() => setActivePage(i)}
            className={`w-8 h-8 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              i === activePage ? "bg-primary-500 text-white" : "bg-surface-800 text-surface-400 hover:bg-surface-700"
            }`}
          >
            {i + 1}
          </button>
        ))}
        <button onClick={() => setActivePage(Math.min(pages.length - 1, activePage + 1))} className="p-1 text-surface-400 hover:text-white cursor-pointer">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="w-px h-5 bg-surface-800 mx-2" />
        <Button size="sm" variant="secondary" onClick={() => exportPage(activePage)} className="gap-1.5 text-xs">
          <Download className="h-3 w-3" />
          Export page {activePage + 1}
        </Button>
      </div>
    </div>
  );
};
