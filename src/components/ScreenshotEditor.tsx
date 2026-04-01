import { useState, useRef, useCallback, useEffect } from "react";
import {
  Smartphone,
  Type,
  ImageIcon,
  Paintbrush,
  Maximize2,
  Download,
  Trash2,
  Copy,
  RotateCw,
  Undo2,
  Redo2,
  Plus,
  Pencil,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Phone3D } from "@/components/Phone3D";

// --- Types ---

interface EditorObject {
  id: string;
  type: "device" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

interface DeviceObject extends EditorObject {
  type: "device";
  screenshotSrc: string | null;
  deviceModel: DeviceModel;
}

interface TextObject extends EditorObject {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: string;
  color: string;
}

type AnyObject = DeviceObject | TextObject;

interface PageData {
  id: string;
  objects: AnyObject[];
  bgColor: string;
}

type DeviceModel = "front" | "left" | "right" | "flat";
const DEVICE_CONFIGS: { model: DeviceModel; label: string; scale: number }[] = [
  { model: "front", label: "Front", scale: 35 },
  { model: "left", label: "Angled Left", scale: 40 },
  { model: "right", label: "Angled Right", scale: 40 },
  { model: "flat", label: "Flat", scale: 50 },
];
const DEFAULT_DEVICE_ASPECT = 1.5; // 3D viewport aspect
const PAGE_COUNT = 5;

// --- Sidebar tabs ---

type SideTab = "devices" | "text" | "image" | "background" | "resize" | null;

// --- Component ---

export const ScreenshotEditor = () => {
  const { toast } = useToast();
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const [pages, setPages] = useState<PageData[]>(() =>
    Array.from({ length: PAGE_COUNT }, (_, i) => ({
      id: `page-${i}`,
      objects: [],
      bgColor: "#f0f0ff",
    }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SideTab>("devices");
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPageIndex, setDragPageIndex] = useState(0);

  const findObjectPage = (objId: string): number =>
    pages.findIndex((p) => p.objects.some((o) => o.id === objId));

  const selectedPageIndex = selectedId !== null ? findObjectPage(selectedId) : -1;
  const selectedObject = selectedId !== null && selectedPageIndex >= 0
    ? pages[selectedPageIndex]!.objects.find((o) => o.id === selectedId) ?? null
    : null;

  // --- Helpers ---

  const updatePage = useCallback((pageIndex: number, updater: (p: PageData) => PageData) => {
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? updater(p) : p)));
  }, []);

  const updateObject = useCallback((pageIndex: number, objId: string, updates: Partial<AnyObject>) => {
    updatePage(pageIndex, (p) => ({
      ...p,
      objects: p.objects.map((o) => (o.id === objId ? { ...o, ...updates } as AnyObject : o)),
    }));
  }, [updatePage]);

  const addObjectToPage = useCallback((pageIndex: number, obj: AnyObject) => {
    updatePage(pageIndex, (p) => ({ ...p, objects: [...p.objects, obj] }));
    setSelectedId(obj.id);
  }, [updatePage]);

  const deleteSelected = useCallback(() => {
    if (selectedId === null || selectedPageIndex < 0) return;
    updatePage(selectedPageIndex, (p) => ({ ...p, objects: p.objects.filter((o) => o.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, selectedPageIndex, updatePage]);

  const duplicateSelected = useCallback(() => {
    if (!selectedObject || selectedPageIndex < 0) return;
    const newObj = { ...selectedObject, id: crypto.randomUUID(), x: selectedObject.x + 5, y: selectedObject.y + 3 };
    addObjectToPage(selectedPageIndex, newObj as AnyObject);
  }, [selectedObject, selectedPageIndex, addObjectToPage]);

  // --- Add handlers ---

  const addDeviceToPage = useCallback((pageIndex: number, model: DeviceModel = "front", rotation = 0, scale = 55) => {
    const w = scale;
    const obj: DeviceObject = {
      id: crypto.randomUUID(),
      type: "device",
      x: 22,
      y: 10,
      width: w,
      height: w * DEFAULT_DEVICE_ASPECT,
      rotation,
      zIndex: (pages[pageIndex]?.objects.length ?? 0),
      screenshotSrc: null,
      deviceModel: model,
    };
    addObjectToPage(pageIndex, obj);
  }, [pages, addObjectToPage]);

  const addTextToPage = useCallback((pageIndex: number) => {
    const obj: TextObject = {
      id: crypto.randomUUID(),
      type: "text",
      x: 15,
      y: 5,
      width: 70,
      height: 10,
      rotation: 0,
      zIndex: (pages[pageIndex]?.objects.length ?? 0),
      text: "Your Headline",
      fontSize: 5,
      fontWeight: "700",
      color: "#000000",
    };
    addObjectToPage(pageIndex, obj);
  }, [pages, addObjectToPage]);

  // --- Mouse handlers for drag ---

  const getPagePos = useCallback((e: React.MouseEvent, pageEl: HTMLElement): { x: number; y: number } => {
    const rect = pageEl.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleObjectMouseDown = useCallback((e: React.MouseEvent, obj: AnyObject, pageIndex: number, pageEl: HTMLElement) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(obj.id);
    setIsDragging(true);
    setDragPageIndex(pageIndex);
    const pos = getPagePos(e, pageEl);
    setDragOffset({ x: pos.x - obj.x, y: pos.y - obj.y });
  }, [getPagePos]);

  useEffect(() => {
    if (!isDragging || selectedId === null) return;

    const handleMove = (e: MouseEvent) => {
      const pageEls = canvasAreaRef.current?.querySelectorAll("[data-page]");
      if (!pageEls) return;
      const pageEl = pageEls[dragPageIndex] as HTMLElement | undefined;
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      updateObject(dragPageIndex, selectedId, {
        x: x - dragOffset.x,
        y: y - dragOffset.y,
      });
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isDragging, selectedId, dragPageIndex, dragOffset, updateObject]);

  // --- Keyboard ---

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "d" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); duplicateSelected(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, duplicateSelected]);

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
    const W = 1290, H = 2796;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = page.bgColor;
    ctx.fillRect(0, 0, W, H);

    const sorted = [...page.objects].sort((a, b) => a.zIndex - b.zIndex);

    for (const obj of sorted) {
      const ox = (obj.x / 100) * W, oy = (obj.y / 100) * H;
      const ow = (obj.width / 100) * W, oh = (obj.height / 100) * H;

      ctx.save();
      if (obj.rotation) {
        ctx.translate(ox + ow / 2, oy + oh / 2);
        ctx.rotate((obj.rotation * Math.PI) / 180);
        ctx.translate(-(ox + ow / 2), -(oy + oh / 2));
      }

      if (obj.type === "device") {
        const device = obj as DeviceObject;
        const radius = ow * 0.085, bezel = ow * 0.015;
        ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = ow * 0.05; ctx.shadowOffsetY = ow * 0.015;
        ctx.fillStyle = "#1a1a1a";
        rr(ctx, ox - bezel, oy - bezel, ow + bezel * 2, oh + bezel * 2, radius + bezel);
        ctx.fill();
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        if (device.screenshotSrc) {
          const img = document.createElement("img");
          img.crossOrigin = "anonymous";
          await new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); img.src = device.screenshotSrc!; });
          ctx.save();
          rr(ctx, ox, oy, ow, oh, radius); ctx.clip();
          const iA = img.width / img.height, sA = ow / oh;
          let dw: number, dh: number, dx: number, dy: number;
          if (iA > sA) { dh = oh; dw = dh * iA; dx = ox - (dw - ow) / 2; dy = oy; }
          else { dw = ow; dh = dw / iA; dx = ox; dy = oy - (dh - oh) / 2; }
          ctx.drawImage(img, dx, dy, dw, dh);
          ctx.restore();
        }
        const nw = ow * 0.28, nh = ow * 0.05;
        ctx.fillStyle = "#000"; rr(ctx, ox + (ow - nw) / 2, oy + ow * 0.02, nw, nh, nh / 2); ctx.fill();
        const hw = ow * 0.35, hh = ow * 0.012;
        ctx.fillStyle = "rgba(255,255,255,0.2)"; rr(ctx, ox + (ow - hw) / 2, oy + oh - ow * 0.035, hw, hh, hh / 2); ctx.fill();
      } else {
        const t = obj as TextObject;
        const fs = (t.fontSize / 100) * W;
        ctx.font = `${t.fontWeight} ${fs}px -apple-system, sans-serif`;
        ctx.fillStyle = t.color; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(t.text, ox + ow / 2, oy);
      }
      ctx.restore();
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `screenshot_${pageIndex + 1}.png`; a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [pages, rr]);

  const exportAll = useCallback(async () => {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i]!.objects.length > 0) await exportPage(i);
    }
    toast("success", "Screenshots exported!");
  }, [pages, exportPage, toast]);

  // --- Sidebar tabs ---

  const tabs: { id: SideTab; icon: typeof Smartphone; label: string }[] = [
    { id: "devices", icon: Smartphone, label: "Devices" },
    { id: "text", icon: Type, label: "Text" },
    { id: "image", icon: ImageIcon, label: "Image" },
    { id: "background", icon: Paintbrush, label: "Background" },
    { id: "resize", icon: Maximize2, label: "Resize" },
  ];

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left icon tabs */}
      <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center py-3 gap-1 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-lg cursor-pointer transition-colors w-12 ${
              activeTab === tab.id ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="text-[9px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sidebar panel */}
      {activeTab && (
        <div className="w-60 bg-white border-r border-gray-200 p-4 overflow-y-auto shrink-0">
          {activeTab === "devices" && (
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Device type</label>
              <select className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 mb-3 cursor-pointer">
                <option>iPhone 16 Pro Max</option>
                <option>iPhone 16 Pro</option>
                <option>iPhone 15</option>
                <option>Google Pixel 9</option>
                <option>iPad Pro</option>
              </select>
              <p className="text-xs text-gray-400 mb-3">Click to add to Page 1</p>
              <div className="grid grid-cols-2 gap-2">
                {DEVICE_CONFIGS.map((d) => (
                  <button
                    key={d.model}
                    className="border border-gray-200 rounded-lg p-2 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all flex flex-col items-center gap-1.5 active:scale-95"
                    onClick={() => addDeviceToPage(0, d.model, 0, d.scale)}
                  >
                    <div className="h-16 w-12">
                      <Phone3D screenshotUrl={null} angle={d.model} frameColor="#333" />
                    </div>
                    <span className="text-[10px] text-gray-500">{d.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3">Click a device on canvas → "Change screenshot" to add your image.</p>
            </div>
          )}

          {activeTab === "text" && (
            <div>
              <p className="text-xs text-gray-400 mb-3">Click to add to page</p>
              <button
                onClick={() => addTextToPage(0)}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-colors"
              >
                <span className="text-sm font-semibold text-gray-700">Add a heading</span>
              </button>
            </div>
          )}

          {activeTab === "background" && (
            <div>
              <div className="flex gap-2 mb-3">
                <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 cursor-pointer">Color</button>
                <button className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-400 hover:bg-gray-50 cursor-pointer">Gradient</button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {["#f0f0ff", "#ffffff", "#000000", "#1e1b4b", "#fdf2f8", "#ecfdf5", "#fef3c7", "#fee2e2", "#dbeafe", "#f3e8ff", "#fce7f3", "#ccfbf1"].map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      // Apply to all pages
                      setPages((prev) => prev.map((p) => ({ ...p, bgColor: c })));
                    }}
                    className="h-8 rounded-lg border border-gray-200 cursor-pointer hover:ring-2 hover:ring-indigo-300"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={pages[0]?.bgColor ?? "#f0f0ff"}
                  onChange={(e) => setPages((prev) => prev.map((p) => ({ ...p, bgColor: e.target.value })))}
                  className="h-8 w-8 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={pages[0]?.bgColor ?? "#f0f0ff"}
                  onChange={(e) => setPages((prev) => prev.map((p) => ({ ...p, bgColor: e.target.value })))}
                  className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
                />
              </div>
            </div>
          )}

          {activeTab === "image" && (
            <div>
              <p className="text-xs text-gray-400 mb-3">Add images to your screenshots</p>
              <button className="w-full border border-gray-200 rounded-lg px-4 py-8 text-center hover:border-indigo-300 cursor-pointer transition-colors">
                <ImageIcon className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                <span className="text-xs text-gray-400">Upload image</span>
              </button>
            </div>
          )}

          {activeTab === "resize" && (
            <div>
              <p className="text-xs text-gray-400 mb-3">Screenshot dimensions</p>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between"><span>iPhone 6.7"</span><span>1290 × 2796</span></div>
                <div className="flex justify-between"><span>iPhone 6.5"</span><span>1284 × 2778</span></div>
                <div className="flex justify-between"><span>iPhone 5.5"</span><span>1242 × 2208</span></div>
                <div className="flex justify-between"><span>Android</span><span>1080 × 1920</span></div>
              </div>
            </div>
          )}

          {/* Selected object properties */}
          {selectedObject && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">
                {selectedObject.type === "device" ? "Device" : "Text"}
              </h4>

              {selectedObject.type === "text" && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={(selectedObject as TextObject).text}
                    onChange={(e) => updateObject(selectedPageIndex, selectedId!, { text: e.target.value } as Partial<TextObject>)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700"
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={(selectedObject as TextObject).color}
                      onChange={(e) => updateObject(selectedPageIndex, selectedId!, { color: e.target.value } as Partial<TextObject>)}
                      className="h-7 w-7 rounded cursor-pointer border-0"
                    />
                    <select
                      value={(selectedObject as TextObject).fontWeight}
                      onChange={(e) => updateObject(selectedPageIndex, selectedId!, { fontWeight: e.target.value } as Partial<TextObject>)}
                      className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs cursor-pointer"
                    >
                      <option value="400">Regular</option>
                      <option value="600">Semibold</option>
                      <option value="700">Bold</option>
                      <option value="800">Extra Bold</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Size</label>
                    <input
                      type="range" min="2" max="12" step="0.5"
                      value={(selectedObject as TextObject).fontSize}
                      onChange={(e) => updateObject(selectedPageIndex, selectedId!, { fontSize: parseFloat(e.target.value) } as Partial<TextObject>)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {selectedObject.type === "device" && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file"; input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) updateObject(selectedPageIndex, selectedId!, { screenshotSrc: URL.createObjectURL(file) } as Partial<DeviceObject>);
                      };
                      input.click();
                    }}
                    className="w-full text-xs bg-indigo-50 text-indigo-600 rounded-lg px-3 py-2 hover:bg-indigo-100 cursor-pointer font-medium"
                  >
                    Change screenshot
                  </button>
                  <div>
                    <label className="text-[10px] text-gray-400">Rotation</label>
                    <input
                      type="range" min="-30" max="30" step="1"
                      value={selectedObject.rotation}
                      onChange={(e) => updateObject(selectedPageIndex, selectedId!, { rotation: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main canvas area — all 5 pages side by side */}
      <div className="flex-1 overflow-auto" ref={canvasAreaRef}>
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer"><Undo2 className="h-4 w-4" /></button>
            <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer"><Redo2 className="h-4 w-4" /></button>
            <span className="text-xs text-gray-400 ml-2">Autosaved</span>
          </div>
          <div className="flex items-center gap-2">
            {selectedId && (
              <>
                <button onClick={duplicateSelected} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer" title="Duplicate"><Copy className="h-4 w-4" /></button>
                <button onClick={() => {
                  if (selectedObject) updateObject(selectedPageIndex, selectedId, { rotation: (selectedObject.rotation + 15) % 360 });
                }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer" title="Rotate"><RotateCw className="h-4 w-4" /></button>
                <button onClick={deleteSelected} className="p-1.5 rounded hover:bg-gray-100 text-red-400 cursor-pointer" title="Delete"><Trash2 className="h-4 w-4" /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
              </>
            )}
            <button
              onClick={exportAll}
              className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-lg px-4 py-2 text-xs font-semibold hover:bg-indigo-500 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        </div>

        {/* Pages grid — horizontal scroll */}
        <div className="flex gap-3 p-6 min-w-max">
          {pages.map((page, pageIndex) => (
            <div
              key={page.id}
              data-page={pageIndex}
              className="relative shrink-0 shadow-lg border border-gray-200 select-none overflow-visible"
              style={{
                width: "min(280px, 20vw)",
                aspectRatio: "1290 / 2796",
                background: page.bgColor,
              }}
              onMouseDown={(e) => {
                // Click empty space
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
            >
              {/* Page number */}
              <div className="absolute -top-5 left-0 text-[10px] text-gray-400 font-medium">
                Page {pageIndex + 1}
              </div>

              {/* Objects */}
              {[...page.objects].sort((a, b) => a.zIndex - b.zIndex).map((obj) => {
                const isSelected = obj.id === selectedId;
                return (
                  <div
                    key={obj.id}
                    className={`absolute ${isDragging && isSelected ? "cursor-grabbing" : "cursor-grab"}`}
                    style={{
                      left: `${obj.x}%`,
                      top: `${obj.y}%`,
                      width: `${obj.width}%`,
                      height: `${obj.height}%`,
                      zIndex: obj.zIndex,
                      transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
                    }}
                    onMouseDown={(e) => {
                      const pageEl = e.currentTarget.parentElement;
                      if (pageEl) handleObjectMouseDown(e, obj, pageIndex, pageEl);
                    }}
                  >
                    {obj.type === "device" && (
                      <div className="w-full h-full pointer-events-none">
                        <Phone3D
                          screenshotUrl={(obj as DeviceObject).screenshotSrc}
                          angle={(obj as DeviceObject).deviceModel as "front" | "left" | "right" | "flat"}
                          frameColor="#2a2a2a"
                        />
                      </div>
                    )}

                    {obj.type === "text" && (
                      <div
                        className="w-full flex items-start justify-center"
                        style={{
                          fontSize: `${(obj as TextObject).fontSize * 2.2}px`,
                          fontWeight: (obj as TextObject).fontWeight,
                          color: (obj as TextObject).color,
                          fontFamily: '-apple-system, "Helvetica Neue", sans-serif',
                          lineHeight: 1.2,
                          textAlign: "center",
                        }}
                      >
                        {(obj as TextObject).text}
                      </div>
                    )}

                    {/* Selection handles */}
                    {isSelected && (
                      <>
                        <div className="absolute inset-0 border-2 border-blue-500 rounded pointer-events-none" />
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-se-resize" />
                        {/* Rotation handle */}
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-blue-500" />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-grab" />
                      </>
                    )}
                  </div>
                );
              })}

              {/* Empty state — click to add */}
              {page.objects.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => addDeviceToPage(pageIndex)}
                    className="flex flex-col items-center gap-1 text-gray-300 hover:text-gray-400 cursor-pointer transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[8px]">Add device</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-14 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between z-10"
        style={{ left: activeTab ? "calc(3.5rem + 15rem)" : "3.5rem" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5">iPhone 16 Pro Max</span>
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer" title="Add to page"><Plus className="h-4 w-4" /></button>
          <button onClick={duplicateSelected} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer" title="Duplicate"><Copy className="h-4 w-4" /></button>
          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 cursor-pointer" title="Edit"><Pencil className="h-4 w-4" /></button>
          <button onClick={deleteSelected} className="p-1.5 rounded hover:bg-gray-100 text-red-400 cursor-pointer" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <input type="range" min="50" max="200" defaultValue="100" className="w-32" />
          <span className="text-xs text-gray-400">100%</span>
        </div>
      </div>
    </div>
  );
};
