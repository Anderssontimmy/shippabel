import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { loadScreenshots, saveScreenshots, MIN_SCREENSHOTS } from "@/lib/screenshots";
import {
  ArrowLeft,
  Smartphone,
  Paintbrush,
  Download,
  Trash2,
  Copy,
  Type,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import html2canvas from "html2canvas-pro";
import { reportError } from "@/lib/monitoring";

interface PhoneData {
  id: string;
  screenshotUrl: string | null;
  rotation: number;
  scale: number;
  x: number;
  y: number;
  frameColor: string;
}

interface TextData {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  fontWeight: string;
}

interface PageData {
  savedImage?: string;
  phones: PhoneData[];
  texts: TextData[];
  bgColor: string;
  bgGradient: string | null;
}

type SelectedItem = { type: "phone" | "text"; id: string } | null;

const PAGE_COUNT = 5;
const emptyPage = (): PageData => ({ phones: [], texts: [], bgColor: "#f0f0ff", bgGradient: null });
const hasContent = (page: PageData) => !!page.savedImage || page.phones.length > 0 || page.texts.length > 0;

async function renderPage(el: HTMLDivElement) {
  const canvas = await html2canvas(el, { scale: 4, backgroundColor: null, useCORS: true });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Screenshot image could not be created");
  return blob;
}

const GRADIENT_PRESETS = [
  { label: "Purple", value: "linear-gradient(135deg, #667eea, #764ba2)" },
  { label: "Sunset", value: "linear-gradient(135deg, #f093fb, #f5576c)" },
  { label: "Ocean", value: "linear-gradient(135deg, #0c1445, #42a5f5)" },
  { label: "Green", value: "linear-gradient(135deg, #065f46, #34d399)" },
  { label: "Gold", value: "linear-gradient(135deg, #92400e, #fbbf24)" },
  { label: "Pink", value: "linear-gradient(135deg, #ec4899, #f9a8d4)" },
];

export const Screenshots = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isPaid } = usePlan();
  const [loadingSaved, setLoadingSaved] = useState(id !== "demo");
  const [loadError, setLoadError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Object URLs created for uploaded screenshots — revoked on unmount
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const trackObjectUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  };
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  const [pages, setPages] = useState<PageData[]>(() =>
    Array.from({ length: PAGE_COUNT }, emptyPage)
  );
  useEffect(() => {
    let cancelled = false;
    if (!id || id === "demo" || !isPaid) { setLoadingSaved(false); return; }
    setLoadingSaved(true);
    setLoadError(false);
    loadScreenshots(id).then((urls) => {
      if (cancelled) return;
      setPages(Array.from({ length: PAGE_COUNT }, (_, index) => ({ ...emptyPage(), savedImage: urls[index] })));
      setDirty(false);
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    }).finally(() => { if (!cancelled) setLoadingSaved(false); });
    return () => { cancelled = true; };
  }, [id, isPaid]);
  const [activePage, setActivePage] = useState(0);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<"device" | "text" | "bg">("device");

  const page = pages[activePage]!;
  const selectedPhone = selected?.type === "phone" ? page.phones.find((p) => p.id === selected.id) : null;
  const selectedText = selected?.type === "text" ? page.texts.find((t) => t.id === selected.id) : null;

  const updatePage = useCallback((idx: number, fn: (p: PageData) => PageData) => {
    setDirty(true);
    setPages((prev) => prev.map((p, i) => (i === idx ? fn(p) : p)));
  }, []);

  const updatePhone = useCallback((phoneId: string, updates: Partial<PhoneData>) => {
    updatePage(activePage, (p) => ({ ...p, phones: p.phones.map((ph) => (ph.id === phoneId ? { ...ph, ...updates } : ph)) }));
  }, [activePage, updatePage]);

  const updateText = useCallback((textId: string, updates: Partial<TextData>) => {
    updatePage(activePage, (p) => ({ ...p, texts: p.texts.map((t) => (t.id === textId ? { ...t, ...updates } : t)) }));
  }, [activePage, updatePage]);

  // Add phone
  const addPhone = useCallback((rotation = 0, scale = 45, pageIdx = activePage) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const url = trackObjectUrl(file);
      const phone: PhoneData = { id: crypto.randomUUID(), screenshotUrl: url, rotation, scale, x: 25, y: 10, frameColor: "#1d1d1f" };
      updatePage(pageIdx, (p) => ({ ...p, phones: [...p.phones, phone] }));
      setSelected({ type: "phone", id: phone.id });
    };
    input.click();
  }, [activePage, updatePage]);

  // Add text
  const addText = useCallback(() => {
    const t: TextData = { id: crypto.randomUUID(), text: "Your Headline", x: 15, y: 5, size: 6, color: "#000000", fontWeight: "700" };
    updatePage(activePage, (p) => ({ ...p, texts: [...p.texts, t] }));
    setSelected({ type: "text", id: t.id });
  }, [activePage, updatePage]);

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    if (selected.type === "phone") updatePage(activePage, (p) => ({ ...p, phones: p.phones.filter((ph) => ph.id !== selected.id) }));
    else updatePage(activePage, (p) => ({ ...p, texts: p.texts.filter((t) => t.id !== selected.id) }));
    setSelected(null);
  }, [selected, activePage, updatePage]);

  const duplicateSelected = useCallback(() => {
    if (selected?.type === "phone" && selectedPhone) {
      const clone = { ...selectedPhone, id: crypto.randomUUID(), x: selectedPhone.x + 5, y: selectedPhone.y + 3 };
      updatePage(activePage, (p) => ({ ...p, phones: [...p.phones, clone] }));
      setSelected({ type: "phone", id: clone.id });
    }
    if (selected?.type === "text" && selectedText) {
      const clone = { ...selectedText, id: crypto.randomUUID(), y: selectedText.y + 5 };
      updatePage(activePage, (p) => ({ ...p, texts: [...p.texts, clone] }));
      setSelected({ type: "text", id: clone.id });
    }
  }, [selected, selectedPhone, selectedText, activePage, updatePage]);

  // Drag
  const startDrag = useCallback((e: React.PointerEvent, item: SelectedItem, pageIdx: number) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!item) return;
    setActivePage(pageIdx);
    setSelected(item);
    setIsDragging(true);
    const pageEl = pageRefs.current[pageIdx];
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const obj = item.type === "phone"
      ? pages[pageIdx]!.phones.find((p) => p.id === item.id)
      : pages[pageIdx]!.texts.find((t) => t.id === item.id);
    if (!obj) return;
    setDragOffset({ x: e.clientX - rect.left - (obj.x / 100) * rect.width, y: e.clientY - rect.top - (obj.y / 100) * rect.height });
  }, [pages]);

  const handleMouseMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !selected) return;
    const pageEl = pageRefs.current[activePage];
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    if (selected.type === "phone") updatePhone(selected.id, { x, y });
    else updateText(selected.id, { x, y });
  }, [isDragging, selected, activePage, dragOffset, updatePhone, updateText]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Export for Google Play: 9:16 portrait (Play rejects screenshots taller than 2:1).
  // Display width is 323px, scale 4 = 1292px wide output — comfortably within
  // Play's 320–3840px range. Scale 5+ crashes some browsers (canvas memory limits).
  const exportPage = useCallback(async (idx: number) => {
    const el = pageRefs.current[idx];
    if (!el) return false;
    try {
      const blob = await renderPage(el);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `screenshot_${idx + 1}.png`; a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      reportError(error instanceof Error ? error : new Error("Screenshot export failed"), "screenshot_export");
      toast("error", "Export failed. Please try again.");
      return false;
    }
  }, [toast]);

  const exportAll = useCallback(async () => {
    for (let i = 0; i < PAGE_COUNT; i++) {
      if (hasContent(pages[i]!) && !await exportPage(i)) return;
    }
    toast("success", "Screenshots exported!");
  }, [pages, exportPage, toast]);

  const saveToSupabase = useCallback(async () => {
    if (!id || saving || loadingSaved || loadError) return false;
    if (id === "demo") {
      toast("info", "This is the demo — your work isn't saved. Scan your own app to save screenshots.");
      return true;
    }
    if (!dirty) return true;
    setSaving(true);
    try {
      const images: (Blob | string)[] = [];
      for (const [index, pg] of pages.entries()) {
        if (!hasContent(pg)) continue;
        if (pg.savedImage && !pg.phones.length && !pg.texts.length) { images.push(pg.savedImage); continue; }
        const el = pageRefs.current[index];
        if (!el) throw new Error("Screenshot page is unavailable");
        images.push(await renderPage(el));
      }
      const urls = await saveScreenshots(id, images);
      setDirty(false);
      toast("success", `${urls.length} screenshot${urls.length > 1 ? "s" : ""} saved!`);
      return true;
    } catch (err) {
      reportError(err instanceof Error ? err : new Error("Screenshot save failed"), "screenshot_save");
      toast("error", "Couldn't save all screenshots. Your previous save is unchanged. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, pages, toast, saving, loadingSaved, loadError, dirty]);

  const pageBg = (pg: PageData) => pg.bgGradient ?? pg.bgColor;
  const allEmpty = !pages.some(hasContent);

  // Editor state lives only in memory — warn before the browser discards it
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const filledPages = pages.filter(hasContent).length;
  const canContinue = filledPages >= MIN_SCREENSHOTS;

  if (!isPaid && id !== "demo") {
    return (
      <div>
        {id && <ShipFlowBar projectId={id} />}
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-16 sm:py-24">
          <UpgradePrompt
            titleAs="h1"
            feature="Professional Screenshots"
            description="Make your app look amazing in the store with device-framed screenshots."
            benefits={[
              "Frame screenshots in phone mockups",
              "Add captions and gradient backgrounds",
              "Export in Google Play's required sizes",
              "Drag and drop — no design skills needed",
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] md:h-[calc(100dvh-4rem)]">
      {id && <ShipFlowBar projectId={id} />}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-surface-200 bg-white shrink-0">
        <Link to={`/scan/${id}`} aria-label="Back to scan results" className="text-surface-500 hover:text-surface-900"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-sm font-bold text-surface-900">Screenshot Editor</h1>
        <div className="flex-1" />
        <span className={`text-xs font-medium ${canContinue ? "text-green-600" : "text-surface-400"}`}>
          {filledPages}/{MIN_SCREENSHOTS} screenshots
        </span>
        <Button size="sm" variant="secondary" onClick={exportAll} disabled={allEmpty || saving || loadingSaved || loadError} className="gap-1.5 text-xs"><Download className="h-3 w-3" /> Download</Button>
        <Button size="sm" onClick={saveToSupabase} disabled={saving || allEmpty || loadingSaved || loadError} className="gap-1.5 text-xs">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="secondary" disabled={!canContinue || saving || loadingSaved || loadError}
          onClick={async () => { if (await saveToSupabase()) navigate(`/app/${id}/submit`); }} className="text-xs">Continue →</Button>
      </div>
      {loadingSaved && <p role="status" className="p-6 text-sm">Loading saved screenshots…</p>}
      {loadError && <div role="alert" className="p-6 text-sm text-red-700">Couldn't load your saved screenshots. <button className="underline" onClick={() => window.location.reload()}>Reload to try again</button></div>}
      <div className="relative flex flex-col md:flex-row flex-1 min-h-0" inert={saving || loadingSaved || loadError}>

        {/* Onboarding — shows when editor is empty */}
        {allEmpty && !loadingSaved && !loadError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/95 backdrop-blur-sm min-h-[520px]">
            <div className="max-w-lg px-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
                <Smartphone className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-surface-900 mb-2">Create your store screenshots</h2>
              <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
                Google Play shows screenshots of your app to help people decide to download it.
                You need at least 2 screenshots — show the best parts of your app.
              </p>

              <div className="text-left max-w-sm mx-auto space-y-3 mb-8">
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-surface-100 text-surface-500 flex items-center justify-center text-xs font-semibold shrink-0">1</div>
                  <p className="text-sm text-surface-600">Take screenshots of your app on your phone</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-surface-100 text-surface-500 flex items-center justify-center text-xs font-semibold shrink-0">2</div>
                  <p className="text-sm text-surface-600">Click <strong>"Add device"</strong> on any page below and upload your screenshot</p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="h-6 w-6 rounded-full bg-surface-100 text-surface-500 flex items-center justify-center text-xs font-semibold shrink-0">3</div>
                  <p className="text-sm text-surface-600">We frame it in a phone mockup — add captions and colors to make it pop</p>
                </div>
              </div>

              <Button onClick={() => { setActivePage(0); addPhone(0, 45); }} className="gap-2">
                <Smartphone className="h-4 w-4" />
                Add my first screenshot
              </Button>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="w-full md:w-56 border-b md:border-r border-gray-200 bg-white overflow-y-auto max-h-64 md:max-h-none shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[
              { id: "device" as const, icon: Smartphone, label: "Device" },
              { id: "text" as const, icon: Type, label: "Text" },
              { id: "bg" as const, icon: Paintbrush, label: "Background" },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium cursor-pointer border-b-2 transition-colors ${
                  activeTab === tab.id ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}>
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-3 space-y-4">
            {page.savedImage && <div className="text-xs text-gray-500 space-y-2"><p>Saved image. Add new elements or replace this page to start again.</p><button className="text-red-600 underline" onClick={() => { updatePage(activePage, emptyPage); setSelected(null); }}>Replace page {activePage + 1}</button></div>}
            {/* Device tab */}
            {activeTab === "device" && (
              <>
                <button onClick={() => addPhone(0, 45)}
                  className="w-full border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-colors active:scale-95 flex items-center gap-3">
                  <div style={{ width: 28 }}><PhoneFrame width={28} compact /></div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-700">+ Add device</div>
                    <div className="text-[10px] text-gray-400">to Page {activePage + 1} — choose a screenshot</div>
                  </div>
                </button>

                {selectedPhone && (
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase">Selected Device</h4>
                    <button onClick={() => {
                      const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
                      input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) updatePhone(selected!.id, { screenshotUrl: trackObjectUrl(f) }); };
                      input.click();
                    }} className="w-full text-xs bg-indigo-50 text-indigo-600 rounded-lg px-3 py-2 hover:bg-indigo-100 cursor-pointer font-medium">
                      {selectedPhone.screenshotUrl ? "Change image" : "Add image"}
                    </button>
                    <div><label className="text-[10px] text-gray-400">Rotation</label>
                      <input type="range" min="-30" max="30" value={selectedPhone.rotation} onChange={(e) => updatePhone(selected!.id, { rotation: +e.target.value })} className="w-full" /></div>
                    <div><label className="text-[10px] text-gray-400">Size</label>
                      <input type="range" min="15" max="80" value={selectedPhone.scale} onChange={(e) => updatePhone(selected!.id, { scale: +e.target.value })} className="w-full" /></div>
                    <div><label className="text-[10px] text-gray-400">Frame</label>
                      <div className="flex gap-1 mt-1">
                        {["#1d1d1f", "#f5f5f7", "#4a4a4c", "#1f4e79", "#8b5e3c", "#b91c1c"].map((c) => (
                          <button key={c} onClick={() => updatePhone(selected!.id, { frameColor: c })}
                            aria-label={`Frame color ${c}`}
                            className={`h-5 w-5 rounded-full border-2 cursor-pointer ${selectedPhone.frameColor === c ? "border-indigo-500" : "border-gray-200"}`} style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 pt-1">
                      <button onClick={duplicateSelected} className="flex-1 text-[10px] bg-gray-100 rounded py-1.5 hover:bg-gray-200 cursor-pointer flex items-center justify-center gap-1"><Copy className="h-3 w-3" /> Copy</button>
                      <button onClick={deleteSelected} className="flex-1 text-[10px] bg-red-50 text-red-500 rounded py-1.5 hover:bg-red-100 cursor-pointer flex items-center justify-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Text tab */}
            {activeTab === "text" && (
              <>
                <button onClick={addText} className="w-full border border-gray-200 rounded-lg px-4 py-3 text-left hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-colors">
                  <span className="text-sm font-semibold text-gray-700">+ Add heading</span>
                  <span className="text-[10px] text-gray-400 block">to Page {activePage + 1}</span>
                </button>

                {selectedText && (
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase">Selected Text</h4>
                    <input type="text" value={selectedText.text} onChange={(e) => updateText(selected!.id, { text: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700" />
                    <div className="flex gap-2">
                      <input type="color" aria-label="Text color" value={selectedText.color} onChange={(e) => updateText(selected!.id, { color: e.target.value })} className="h-7 w-7 rounded cursor-pointer border-0" />
                      <select value={selectedText.fontWeight} onChange={(e) => updateText(selected!.id, { fontWeight: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs cursor-pointer">
                        <option value="400">Regular</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                        <option value="800">Extra Bold</option>
                      </select>
                    </div>
                    <div><label className="text-[10px] text-gray-400">Size</label>
                      <input type="range" min="2" max="14" step="0.5" value={selectedText.size} onChange={(e) => updateText(selected!.id, { size: +e.target.value })} className="w-full" /></div>
                    <div><label className="text-[10px] text-gray-400">Quick colors</label>
                      <div className="flex gap-1 mt-1">
                        {["#000000", "#ffffff", "#1d4ed8", "#dc2626", "#059669", "#7c3aed", "#ea580c"].map((c) => (
                          <button key={c} onClick={() => updateText(selected!.id, { color: c })}
                            aria-label={`Text color ${c}`}
                            className={`h-5 w-5 rounded-full border cursor-pointer ${selectedText.color === c ? "border-indigo-500 border-2" : "border-gray-200"}`} style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 pt-1">
                      <button onClick={duplicateSelected} className="flex-1 text-[10px] bg-gray-100 rounded py-1.5 hover:bg-gray-200 cursor-pointer flex items-center justify-center gap-1"><Copy className="h-3 w-3" /> Copy</button>
                      <button onClick={deleteSelected} className="flex-1 text-[10px] bg-red-50 text-red-500 rounded py-1.5 hover:bg-red-100 cursor-pointer flex items-center justify-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Background tab */}
            {activeTab === "bg" && (
              <>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Solid Colors</h4>
                  <div className="grid grid-cols-6 gap-1.5">
                    {["#ffffff", "#f0f0ff", "#f8fafc", "#fefce8", "#fef2f2", "#ecfdf5", "#eff6ff", "#fdf2f8", "#f5f3ff", "#000000", "#1e1b4b", "#0f172a"].map((c) => (
                      <button key={c} onClick={() => updatePage(activePage, (p) => ({ ...p, bgColor: c, bgGradient: null }))}
                        aria-label={`Background color ${c}`}
                        className={`h-7 rounded-md border cursor-pointer transition-all ${page.bgColor === c && !page.bgGradient ? "ring-2 ring-indigo-400 ring-offset-1" : "border-gray-200 hover:border-gray-300"}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Gradients</h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GRADIENT_PRESETS.map((g) => (
                      <button key={g.label} onClick={() => updatePage(activePage, (p) => ({ ...p, bgGradient: g.value }))}
                        className={`h-10 rounded-lg border cursor-pointer transition-all ${page.bgGradient === g.value ? "ring-2 ring-indigo-400 ring-offset-1" : "border-gray-200"}`}
                        style={{ background: g.value }}>
                        <span className="text-[8px] text-white/70 font-medium">{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Custom</h4>
                  <input type="color" aria-label="Custom background color" value={page.bgColor} onChange={(e) => updatePage(activePage, (p) => ({ ...p, bgColor: e.target.value, bgGradient: null }))} className="w-full h-8 rounded-lg cursor-pointer border-0" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-w-0 min-h-[650px] md:min-h-0 bg-gray-100 overflow-auto" onPointerMove={handleMouseMove} onPointerUp={handleMouseUp} onPointerCancel={handleMouseUp}>
          <div className="flex gap-3 p-4 md:p-6 w-max">
            {pages.map((pg, pageIdx) => (
              <div key={pageIdx} className="relative shrink-0">
                <div className="text-[10px] text-gray-400 font-medium mb-1">Page {pageIdx + 1}</div>
                <div
                  ref={(el) => { pageRefs.current[pageIdx] = el; }}
                  className={`relative select-none overflow-visible ${pageIdx === activePage ? "ring-2 ring-indigo-400 ring-offset-2" : ""}`}
                  style={{ width: 323, aspectRatio: "9 / 16", background: pageBg(pg), boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  onPointerDown={() => setActivePage(pageIdx)}
                  onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
                >
                  {pg.savedImage && <img src={pg.savedImage} alt={`Saved screenshot ${pageIdx + 1}`} crossOrigin="anonymous" className="absolute inset-0 w-full h-full pointer-events-none" />}
                  {/* Phones */}
                  {pg.phones.map((phone) => (
                    <div key={phone.id}
                      className={`absolute touch-none ${isDragging && selected?.id === phone.id ? "cursor-grabbing" : "cursor-grab"}`}
                      style={{
                        left: `${phone.x}%`, top: `${phone.y}%`, width: `${phone.scale}%`,
                        transform: `rotate(${phone.rotation}deg)`,
                        filter: "drop-shadow(0 6px 15px rgba(0,0,0,0.2))",
                        zIndex: selected?.id === phone.id ? 10 : 1,
                      }}
                      onPointerDown={(e) => startDrag(e, { type: "phone", id: phone.id }, pageIdx)}>
                      <PhoneFrame frameColor={phone.frameColor}>
                        {phone.screenshotUrl ? <img src={phone.screenshotUrl} alt="" className="w-full h-full object-cover" draggable={false} /> : undefined}
                      </PhoneFrame>
                      {selected?.id === phone.id && <div data-html2canvas-ignore className="absolute inset-0 border-2 border-blue-500 rounded-[15.5%/7.6%] pointer-events-none" />}
                    </div>
                  ))}

                  {/* Texts */}
                  {pg.texts.map((t) => (
                    <div key={t.id}
                      className={`absolute touch-none ${isDragging && selected?.id === t.id ? "cursor-grabbing" : "cursor-grab"}`}
                      style={{
                        left: `${t.x}%`, top: `${t.y}%`,
                        fontSize: `${t.size * 2.5}px`, fontWeight: t.fontWeight, color: t.color,
                        fontFamily: '-apple-system, "Helvetica Neue", sans-serif',
                        lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap",
                        zIndex: selected?.id === t.id ? 10 : 2,
                      }}
                      onPointerDown={(e) => startDrag(e, { type: "text", id: t.id }, pageIdx)}>
                      {t.text}
                      {selected?.id === t.id && <div data-html2canvas-ignore className="absolute -inset-1 border border-blue-500 rounded pointer-events-none" />}
                    </div>
                  ))}

                  {/* Empty state */}
                  {!hasContent(pg) && (
                    <button onClick={() => { setActivePage(pageIdx); addPhone(0, 45, pageIdx); }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 hover:text-gray-400 cursor-pointer">
                      <Smartphone className="h-6 w-6 mb-1" /><span className="text-[9px]">Add device</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2">
        <span className="text-xs text-gray-400">Page {activePage + 1} — {page.phones.length} device{page.phones.length !== 1 ? "s" : ""}, {page.texts.length} text{page.texts.length !== 1 ? "s" : ""}</span>
        <Button size="sm" variant="secondary" disabled={saving || loadingSaved || loadError || !hasContent(page)} onClick={() => exportPage(activePage)} className="gap-1.5 text-xs"><Download className="h-3 w-3" /> Export page {activePage + 1}</Button>
      </div>
    </div>
  );
};
