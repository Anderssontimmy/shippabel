import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Github, Upload, ArrowRight, FileArchive, Loader2, AlertCircle, Unlock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useScan } from "@/hooks/useScan";
import { useAuth } from "@/hooks/useAuth";
import { useCredentials } from "@/hooks/useCredentials";

export const Scan = () => {
  const { githubToken } = useAuth();
  const { hasCredential } = useCredentials();
  const hasGitHub = !!githubToken || hasCredential("github");
  const navigate = useNavigate();
  const { scanning, progress, error: scanError, scanFromUrl, scanFromFile } = useScan();
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [repoUrl, setRepoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const error = validationError ?? scanError;

  const handleScan = async () => {
    setValidationError(null);

    if (mode === "url") {
      if (!repoUrl.trim()) {
        setValidationError("Please enter a GitHub repository URL.");
        return;
      }
      if (!repoUrl.includes("github.com/")) {
        setValidationError("Please enter a valid GitHub URL (e.g., https://github.com/user/repo).");
        return;
      }
      const projectId = await scanFromUrl(repoUrl.trim());
      if (projectId) navigate(`/scan/${projectId}`);
    } else {
      if (!file) {
        setValidationError("Please upload a zip file.");
        return;
      }
      const projectId = await scanFromFile(file);
      if (projectId) navigate(`/scan/${projectId}`);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith(".zip") || dropped.name.endsWith(".tar.gz"))) {
      setFile(dropped);
      setMode("upload");
      setValidationError(null);
    } else {
      setValidationError("Please drop a .zip or .tar.gz file.");
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold">Scan your app</h1>
        <p className="mt-3 text-surface-400 text-lg">
          Check if your Expo project is ready for the App Store and Google Play.
        </p>
      </div>

      {/* Mode switcher */}
      <div className="flex rounded-xl bg-surface-900 border border-surface-800 p-1 mb-6">
        <button
          onClick={() => { setMode("url"); setValidationError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer ${
            mode === "url"
              ? "bg-surface-800 text-white shadow-sm"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          <Github className="h-4 w-4" />
          GitHub URL
        </button>
        <button
          onClick={() => { setMode("upload"); setValidationError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer ${
            mode === "upload"
              ? "bg-surface-800 text-white shadow-sm"
              : "text-surface-400 hover:text-surface-200"
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload Zip
        </button>
      </div>

      {/* Input area */}
      <Card className="mb-6">
        {mode === "url" ? (
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Repository URL
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); setValidationError(null); }}
              placeholder="https://github.com/username/my-expo-app"
              disabled={scanning}
              className="w-full rounded-lg bg-surface-800 border border-surface-700 px-4 py-3 text-sm text-white placeholder:text-surface-500 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-surface-500">
{hasGitHub ? (
                  <span className="flex items-center gap-1"><Unlock className="h-3 w-3 text-emerald-500" /> Private & public repos supported</span>
                ) : (
                  <span>Public repos only. <Link to="/settings" className="text-primary-400 hover:text-primary-300">Connect GitHub</Link> or use zip upload for private repos.</span>
                )}
            </p>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver
                ? "border-primary-500 bg-primary-500/5"
                : file
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-surface-700 hover:border-surface-600"
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileArchive className="h-10 w-10 text-emerald-400" />
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-surface-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-surface-400 hover:text-red-400 mt-1 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-surface-500" />
                <div>
                  <p className="text-sm text-surface-300">
                    Drag & drop your project zip here
                  </p>
                  <p className="text-xs text-surface-500 mt-1">
                    or{" "}
                    <label className="text-primary-400 hover:text-primary-300 cursor-pointer">
                      browse files
                      <input
                        type="file"
                        accept=".zip,.tar.gz"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { setFile(f); setValidationError(null); }
                        }}
                      />
                    </label>
                  </p>
                </div>
                <p className="text-xs text-surface-600">.zip or .tar.gz, max 100MB</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 mb-6">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Progress */}
      {scanning && progress && (
        <div className="flex items-center gap-2 rounded-lg bg-primary-500/10 border border-primary-500/20 px-4 py-3 mb-6">
          <Loader2 className="h-4 w-4 text-primary-400 animate-spin shrink-0" />
          <p className="text-sm text-primary-300">{progress}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        size="lg"
        className="w-full gap-2"
        onClick={handleScan}
        disabled={scanning}
      >
        {scanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            Scan for free
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>

      {/* What we check */}
      <div className="mt-12">
        <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wider mb-4">
          What we check
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "app.json / app.config.js",
            "Bundle identifier format",
            "App icon & splash screen",
            "SDK version compatibility",
            "Hardcoded API keys",
            "Privacy policy URL",
            "Permission declarations",
            "Navigation structure",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-surface-400">
              <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
