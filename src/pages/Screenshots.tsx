import { useParams, Link } from "react-router-dom";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import { ScreenshotEditor } from "@/components/ScreenshotEditor";
import { ArrowLeft } from "lucide-react";

export const Screenshots = () => {
  const { id } = useParams();

  return (
    <div className="flex flex-col h-screen">
      {id && <ShipFlowBar projectId={id} />}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800 bg-surface-950">
        <Link to={`/scan/${id}`} className="text-surface-500 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">Screenshot Editor</h1>
          <p className="text-surface-500 text-xs">Design your App Store screenshots — drag, drop, resize</p>
        </div>
        <div className="flex-1" />
        <Link to={`/app/${id}/submit`} className="text-xs text-green-400 hover:text-green-300 font-medium">
          Continue to publish →
        </Link>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <ScreenshotEditor />
      </div>
    </div>
  );
};
