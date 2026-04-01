import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Github, Upload, ArrowRight, FileArchive, Loader2, AlertCircle, Unlock, CheckCircle2, HelpCircle } from "lucide-react";
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
  const [showHelp, setShowHelp] = useState(false);

  const error = validationError ?? scanError;

  const handleScan = async () => {
    setValidationError(null);

    if (mode === "url") {
      if (!repoUrl.trim()) {
        setValidationError("Paste the link to your app above first.");
        return;
      }
      if (!repoUrl.includes("github.com/")) {
        setValidationError("That doesn't look like a GitHub link. It should start with https://github.com/");
        return;
      }
      const projectId = await scanFromUrl(repoUrl.trim());
      if (projectId) navigate(`/scan/${projectId}`);
    } else {
      if (!file) {
        setValidationError("Choose a file to upload first.");
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
      setValidationError("That file type isn't supported. Please use a .zip file.");
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-semibold text-surface-900">Is your app ready for the store?</h1>
        <p className="mt-3 text-surface-500 text-lg">
          Let's find out. It takes 30 seconds and it's completely free.
        </p>
      </div>

      {/* Mode switcher */}
      <div className="flex rounded-xl bg-surface-50 border border-surface-200 p-1 mb-8">
        <button
          onClick={() => { setMode("url"); setValidationError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer ${
            mode === "url"
              ? "bg-white text-surface-900 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          }`}
        >
          <Github className="h-4 w-4" />
          I have a link
        </button>
        <button
          onClick={() => { setMode("upload"); setValidationError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all cursor-pointer ${
            mode === "upload"
              ? "bg-white text-surface-900 shadow-sm"
              : "text-surface-500 hover:text-surface-700"
          }`}
        >
          <Upload className="h-4 w-4" />
          I have a file
        </button>
      </div>

      {/* Input area */}
      <Card className="mb-6">
        {mode === "url" ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-surface-700">
                Paste your GitHub link here
              </label>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-surface-400 hover:text-surface-600 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="h-3 w-3" />
                Where do I find this?
              </button>
            </div>

            {showHelp && (
              <div className="rounded-lg bg-surface-50 border border-surface-200 px-4 py-3 mb-3 text-sm text-surface-600 space-y-2">
                <p>Your GitHub link is the web address of your app's code. Here's how to find it:</p>
                <ol className="list-decimal list-inside space-y-1 text-surface-700">
                  <li>Go to <span className="font-medium">github.com</span> and sign in</li>
                  <li>Click on your app's project</li>
                  <li>Copy the link from your browser's address bar</li>
                </ol>
                <p className="text-xs text-surface-400">It looks something like: https://github.com/your-name/my-app</p>
              </div>
            )}

            <input
              type="url"
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); setValidationError(null); }}
              placeholder="https://github.com/your-name/your-app"
              disabled={scanning}
              className="w-full rounded-lg bg-surface-50 border border-surface-200 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 outline-none focus:border-surface-400 focus:ring-1 focus:ring-surface-400 transition-colors disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-surface-400">
              {hasGitHub ? (
                <span className="flex items-center gap-1"><Unlock className="h-3 w-3 text-green-600" /> Works with all your apps — private and public</span>
              ) : (
                <span>Works with public apps. <Link to="/settings" className="text-surface-700 hover:text-surface-900 underline">Connect your GitHub account</Link> to check private apps too.</span>
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
                ? "border-surface-400 bg-surface-50"
                : file
                ? "border-green-300 bg-green-50"
                : "border-surface-200 hover:border-surface-300"
            }`}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileArchive className="h-10 w-10 text-green-600" />
                <p className="text-sm font-medium text-surface-900">{file.name}</p>
                <p className="text-xs text-surface-400">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="text-xs text-surface-400 hover:text-red-600 mt-1 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-surface-300" />
                <div>
                  <p className="text-sm text-surface-600">
                    Drop your app's zip file here
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    or{" "}
                    <label className="text-surface-700 hover:text-surface-900 underline cursor-pointer">
                      pick a file from your computer
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
                <p className="text-xs text-surface-300">Zip files up to 100 MB</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={handleScan} className="text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer shrink-0 ml-3">
            Try again
          </button>
        </div>
      )}

      {/* Progress */}
      {scanning && progress && (
        <div className="flex items-center gap-2 rounded-lg bg-surface-50 border border-surface-200 px-4 py-3 mb-6">
          <Loader2 className="h-4 w-4 text-surface-500 animate-spin shrink-0" />
          <p className="text-sm text-surface-600">{progress}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          size="lg"
          className="flex-1 gap-2"
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your app...
            </>
          ) : (
            <>
              Check my app for free
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        <Link to="/scan/demo">
          <Button size="lg" variant="secondary" className="gap-2 whitespace-nowrap">
            Try demo
          </Button>
        </Link>
      </div>

      {/* What we look at */}
      <div className="mt-16">
        <h3 className="text-center text-sm font-medium text-surface-500 mb-8">
          Here's what we look at
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { text: "Does your app have an icon?", detail: "Both stores require one" },
            { text: "Is there a loading screen?", detail: "Makes your app look polished" },
            { text: "Are your app's settings correct?", detail: "Name, version, permissions" },
            { text: "Are any passwords exposed?", detail: "We catch hidden security risks" },
            { text: "Is there a privacy policy?", detail: "Required by Apple & Google" },
            { text: "Is your app ready to build?", detail: "We check the full setup" },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2.5 rounded-xl bg-surface-50 border border-surface-100 px-4 py-3.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-surface-700">{item.text}</p>
                <p className="text-xs text-surface-400">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reassurance */}
      <div className="mt-12 text-center">
        <p className="text-xs text-surface-400">
          We never store your code. Your app is only analyzed, not copied or shared.
        </p>
      </div>
    </div>
  );
};
