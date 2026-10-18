import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { primaryCta } from "@/components/ui/styles";
import { trackEvent } from "@/lib/analytics";

interface ScanFieldProps {
  // Where the field sits, so the analytics can tell the landing page from a guide.
  location: string;
  className?: string;
}

// Paste a GitHub link and go straight to the scan: the first step of the whole product.
export const ScanField = ({ location, className = "" }: ScanFieldProps) => {
  const [url, setUrl] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent("CTA Clicked", { location, action: url.trim() ? "scan_with_url" : "scan_empty" });
    navigate(url.trim() ? `/scan?url=${encodeURIComponent(url.trim())}` : "/scan");
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex max-w-md rounded-full border border-surface-300 bg-white p-1 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-green-700 has-[input:focus-visible]:ring-offset-2">
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-label="GitHub repository link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Your GitHub link"
          className="min-w-0 flex-1 bg-transparent px-4 sm:px-5 py-3 text-base text-surface-900 placeholder:text-surface-500 outline-none"
        />
        <button type="submit" className={`${primaryCta} shrink-0 py-3 max-sm:px-5 cursor-pointer`}>
          Check now
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-sm text-surface-600">
        Free, no account needed. Or{" "}
        <Link
          to="/scan"
          onClick={() => trackEvent("CTA Clicked", { location, action: "upload_zip" })}
          className="font-medium text-green-700 underline hover:text-green-800"
        >
          upload a zip file
        </Link>
        .
      </p>
    </form>
  );
};
