import { useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import { PhoneFrame } from "@/components/PhoneFrame";
import {
  ArrowLeft,
  Smartphone,
  Paintbrush,
  Download,
  Trash2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import html2canvas from "html2canvas";

interface PhoneData {
  id: string;
  screenshotUrl: string | null;
  rotation: number;
  scale: number;
  x: number; // percent
  y: number; // percent
  frameColor: string;
}

interface PageData {
  phones: PhoneData[];
  bgColor: string;
  texts: { id: string; text: string; x: number; y: number; size: number; color: string }[];
}

const PAGE_COUNT = 5;

export const Screenshots = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [pages, setPages] = useState<PageData[]>(() =>
    Array.from({ length: PAGE_COUNT }, () => ({ phones: [], bgColor: "#f0f0ff", texts: [] }))
  );
  const [activePage, setActivePage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const page = pages[activePage]!;
  const selectedPhone = page.phones.find((p) => p.id === selectedId);

  const updatePage = useCallback((idx: number, fn: (p: PageData) => PageData) => {
    setPages((prev) => prev.map((p, i) => (i === idx ? fn(p) : p)));
  }, []);

  const updatePhone = useCallback((phoneId: string, updates: Partial<PhoneData>) => {
    updatePage(activePage, (p) => ({
      ...p,
      phones: p.phones.map((ph) => (ph.id === phoneId ? { ...ph, ...updates } : ph)),
    }));
  }, [activePage, updatePage]);

  // Add phone with file picker
  const addPhone = useCallback((rotation = 0, scale = 100) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      const url = file ? URL.createObjectURL(file) : null;
      const phone: PhoneData = {
        id: crypto.randomUUID(),
        screenshotUrl: url,
        rotation,
        scale,
        x: 25,
        y: 10,
        frameColor: "#1d1d1f",
      };
      updatePage(activePage, (p) => ({ ...p, phones: [...p.phones, phone] }));
      setSelectedId(phone.id);
    };
    input.click();
  }, [activePage, updatePage]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    updatePage(activePage, (p) => ({ ...p, phones: p.phones.filter((ph) => ph.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, activePage, updatePage]);

  const duplicateSelected = useCallback(() => {
    if (!selectedPhone) return;
    const clone = { ...selectedPhone, id: crypto.randomUUID(), x: selectedPhone.x + 5, y: selectedPhone.y + 3 };
    updatePage(activePage, (p) => ({ ...p, phones: [...p.phones, clone] }));
    setSelectedId(clone.id);
  }, [selectedPhone, activePage, updatePage]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, phoneId: string) => {
    e.stopPropagation();
    setSelectedId(phoneId);
    setIsDragging(true);
    // Find the page container (the element with aspectRatio style)
    let pageEl = e.currentTarget.parentElement as HTMLElement;
    const rect = pageEl.getBoundingClientRect();
    // Find phone in any page
    let phone: PhoneData | undefined;
    for (const pg of pages) {
      phone = pg.phones.find((p) => p.id === phoneId);
      if (phone) break;
    }
    if (!phone) return;
    setDragOffset({
      x: e.clientX - rect.left - (phone.x / 100) * rect.width,
      y: e.clientY - rect.top - (phone.y / 100) * rect.height,
    });
  }, [pages]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedId) return;
    const pageEl = pageRefs.current[activePage];
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    updatePhone(selectedId, { x, y });
  }, [isDragging, selectedId, dragOffset, activePage, updatePhone]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // Export
  const exportPage = useCallback(async (idx: number) => {
    const el = pageRefs.current[idx];
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 3, backgroundColor: null, useCORS: true });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `screenshot_${idx + 1}.png`; a.click();
        URL.revokeObjectURL(url);
      });
    } catch {
      toast("error", "Export failed");
    }
  }, [toast]);

  const exportAll = useCallback(async () => {
    for (let i = 0; i < PAGE_COUNT; i++) {
      if (pages[i]!.phones.length > 0) await exportPage(i);
    }
    toast("success", "Screenshots exported!");
  }, [pages, exportPage, toast]);

  return (
    <div className="flex flex-col h-screen">
      {id && <ShipFlowBar projectId={id} />}

      <div className="flex items-center gap-3 px-4 py-2 border-b border-surface-800 bg-surface-950">
        <Link to={`/scan/${id}`} className="text-surface-500 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-sm font-bold">Screenshot Editor</h1>
        <div className="flex-1" />
        <Button size="sm" onClick={exportAll} className="gap-1.5 text-xs"><Download className="h-3 w-3" /> Export all</Button>
        <Link to={`/app/${id}/submit`} className="text-xs text-green-400 hover:text-green-300 font-medium ml-3">Continue →</Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 border-r border-gray-200 bg-white p-3 overflow-y-auto shrink-0 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><Smartphone className="h-3 w-3" /> Add Device</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Front", rot: 0, scale: 45 },
                { label: "Tilted L", rot: -12, scale: 42 },
                { label: "Tilted R", rot: 12, scale: 42 },
                { label: "Small", rot: 0, scale: 30 },
              ].map((d) => (
                <button key={d.label} onClick={() => addPhone(d.rot, d.scale)}
                  className="border border-gray-200 rounded-lg p-2 text-[10px] text-gray-500 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer active:scale-95 text-center">
                  <div className="mx-auto mb-1" style={{ width: 24, transform: `rotate(${d.rot}deg)` }}>
                    <PhoneFrame width={24} />
                  </div>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><Paintbrush className="h-3 w-3" /> Background</h4>
            <div className="grid grid-cols-5 gap-1.5">
              {["#f0f0ff", "#fff", "#000", "#1e1b4b", "#ecfdf5", "#fef3c7", "#fee2e2", "#dbeafe", "#fdf2f8", "#f0fdf4"].map((c) => (
                <button key={c} onClick={() => updatePage(activePage, (p) => ({ ...p, bgColor: c }))}
                  className={`h-6 rounded border cursor-pointer ${page.bgColor === c ? "ring-2 ring-indigo-400" : "border-gray-200"}`} style={{ background: c }} />
              ))}
            </div>
          </div>

          {selectedPhone && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Selected</h4>
              <button onClick={() => {
                const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
                input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) updatePhone(selectedId!, { screenshotUrl: URL.createObjectURL(f) }); };
                input.click();
              }} className="w-full text-xs bg-indigo-50 text-indigo-600 rounded-lg px-3 py-2 hover:bg-indigo-100 cursor-pointer font-medium mb-2">
                {selectedPhone.screenshotUrl ? "Change screenshot" : "Add screenshot"}
              </button>
              <div className="space-y-2">
                <div><label className="text-[10px] text-gray-400">Rotation</label>
                  <input type="range" min="-30" max="30" value={selectedPhone.rotation} onChange={(e) => updatePhone(selectedId!, { rotation: +e.target.value })} className="w-full" /></div>
                <div><label className="text-[10px] text-gray-400">Size</label>
                  <input type="range" min="15" max="80" value={selectedPhone.scale} onChange={(e) => updatePhone(selectedId!, { scale: +e.target.value })} className="w-full" /></div>
                <div><label className="text-[10px] text-gray-400">Frame</label>
                  <div className="flex gap-1 mt-1">
                    {["#1d1d1f", "#f5f5f7", "#4a4a4c", "#1f4e79", "#8b5e3c"].map((c) => (
                      <button key={c} onClick={() => updatePhone(selectedId!, { frameColor: c })}
                        className={`h-5 w-5 rounded-full border-2 cursor-pointer ${selectedPhone.frameColor === c ? "border-indigo-500" : "border-gray-200"}`} style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                <button onClick={duplicateSelected} className="flex-1 text-[10px] bg-gray-100 rounded py-1.5 hover:bg-gray-200 cursor-pointer flex items-center justify-center gap-1"><Copy className="h-3 w-3" /> Copy</button>
                <button onClick={deleteSelected} className="flex-1 text-[10px] bg-red-50 text-red-500 rounded py-1.5 hover:bg-red-100 cursor-pointer flex items-center justify-center gap-1"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas — all 5 pages side by side */}
        <div
          className="flex-1 bg-gray-100 overflow-auto"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="flex gap-3 p-6 min-w-max">
            {pages.map((pg, pageIdx) => (
              <div key={pageIdx} className="relative shrink-0">
                <div className="text-[10px] text-gray-400 font-medium mb-1">Page {pageIdx + 1}</div>
                <div
                  ref={(el) => { pageRefs.current[pageIdx] = el; }}
                  className={`relative select-none overflow-visible ${pageIdx === activePage ? "ring-2 ring-indigo-400 ring-offset-2" : ""}`}
                  style={{ width: 240, aspectRatio: "1290 / 2796", background: pg.bgColor, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) { setSelectedId(null); setActivePage(pageIdx); }
                  }}
                >
                  {pg.phones.map((phone) => (
                    <div
                      key={phone.id}
                      className={`absolute cursor-grab ${isDragging && selectedId === phone.id ? "cursor-grabbing" : ""}`}
                      style={{
                        left: `${phone.x}%`,
                        top: `${phone.y}%`,
                        width: `${phone.scale}%`,
                        transform: `rotate(${phone.rotation}deg)`,
                        filter: "drop-shadow(0 6px 15px rgba(0,0,0,0.2))",
                        zIndex: selectedId === phone.id ? 10 : 1,
                      }}
                      onMouseDown={(e) => { setActivePage(pageIdx); handleMouseDown(e, phone.id); }}
                    >
                      <PhoneFrame frameColor={phone.frameColor}>
                        {phone.screenshotUrl ? (
                          <img src={phone.screenshotUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                        ) : undefined}
                      </PhoneFrame>

                      {selectedId === phone.id && (
                        <div className="absolute inset-0 border-2 border-blue-500 rounded-[15.5%/7.6%] pointer-events-none" />
                      )}
                    </div>
                  ))}

                  {pg.phones.length === 0 && (
                    <button
                      onClick={() => { setActivePage(pageIdx); addPhone(0, 45); }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 hover:text-gray-400 cursor-pointer"
                    >
                      <Smartphone className="h-6 w-6 mb-1" />
                      <span className="text-[9px]">Add device</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2">
        <span className="text-xs text-gray-400">Page {activePage + 1} of {PAGE_COUNT} — {page.phones.length} device{page.phones.length !== 1 ? "s" : ""}</span>
        <Button size="sm" variant="secondary" onClick={() => exportPage(activePage)} className="gap-1.5 text-xs">
          <Download className="h-3 w-3" /> Export page {activePage + 1}
        </Button>
      </div>
    </div>
  );
};
