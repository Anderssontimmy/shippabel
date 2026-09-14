import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Wrench,
  Share2,
  ArrowRight,
  Loader2,
  Rocket,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScanResultsSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import { ShipFlowGuide } from "@/components/ShipFlowGuide";
import { AppPotentialCard } from "@/components/AppPotentialCard";
import { useFix } from "@/hooks/useFix";
import { useConvert } from "@/hooks/useConvert";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { supabase } from "@/lib/supabase";
import type { Issue, IssueSeverity, ScanResult } from "@/lib/types";

// Fallback demo data for when Supabase isn't connected
const demoScanResult: ScanResult = {
  score: 73,
  project_type: "react-web",
  needs_conversion: true,
  conversion_message: "Your app is a web app built with React. We can wrap it as a mobile app and publish it to Google Play.",
  issues: [
    {
      id: "1", project_id: "demo", severity: "critical", category: "assets",
      title: "Missing app icon",
      description: "Your project is missing a 512x512 app icon. Google Play requires this exact size. Without it, your submission will be rejected.",
      auto_fixable: false, fix_description: "Add a 512x512 PNG file as your app icon in app.json.", fixed: false,
    },
    {
      id: "2", project_id: "demo", severity: "critical", category: "security",
      title: "Hardcoded API key in source code",
      description: "Found a hardcoded API key in src/config.ts (line 12). This key will be visible in your published app bundle.",
      auto_fixable: true, fix_description: "Move the API key to environment variables using expo-constants.", fixed: false,
    },
    {
      id: "3", project_id: "demo", severity: "warning", category: "config",
      title: "Default bundle identifier",
      description: "Your bundle identifier is set to 'com.example.myapp'. This default value won't pass review.",
      auto_fixable: true, fix_description: "Update the bundle identifier in app.json to use your domain.", fixed: false,
    },
    {
      id: "4", project_id: "demo", severity: "warning", category: "config",
      title: "Missing privacy policy URL",
      description: "No privacy policy URL is set. Google Play requires a privacy policy.",
      auto_fixable: true, fix_description: "We can generate and host a privacy policy for your app.", fixed: false,
    },
    {
      id: "5", project_id: "demo", severity: "warning", category: "config",
      title: "Build number not set",
      description: "Your build number is missing. Each submission requires an incremented build number.",
      auto_fixable: true, fix_description: "Set android.versionCode in app.json.", fixed: false,
    },
    {
      id: "6", project_id: "demo", severity: "warning", category: "assets",
      title: "Splash screen uses default",
      description: "Your splash screen is using the Expo default. A custom splash screen looks more professional.",
      auto_fixable: false, fix_description: "Replace the splash screen image and update app.json.", fixed: false,
    },
    {
      id: "7", project_id: "demo", severity: "warning", category: "assets",
      title: "No adaptive icon for Android",
      description: "Android adaptive icons aren't configured. Modern devices show distorted icons without them.",
      auto_fixable: false, fix_description: "Add adaptiveIcon configuration in app.json.", fixed: false,
    },
    {
      id: "8", project_id: "demo", severity: "info", category: "config",
      title: "Consider setting app category",
      description: "No app category is specified. Setting a category helps with store discoverability.",
      auto_fixable: true, fix_description: "Choose a category for your Google Play listing.", fixed: false,
    },
    {
      id: "9", project_id: "demo", severity: "info", category: "code",
      title: "No error boundary detected",
      description: "No React error boundaries were found. They prevent the entire app from crashing.",
      auto_fixable: false, fix_description: "Wrap your main app component in an error boundary.", fixed: false,
    },
    {
      id: "10", project_id: "demo", severity: "info", category: "permissions",
      title: "Camera permission declared but unused",
      description: "Camera permission is declared but no camera code was detected. Unused permissions may trigger review questions.",
      auto_fixable: true, fix_description: "Remove the camera permission from app.json if not needed.", fixed: false,
    },
  ],
  summary: { critical: 2, warning: 5, info: 3, total: 10 },
  potential_analysis: {
    app_description: "A fitness tracking app with workout logging, progress charts, and social challenges built with React Native and Firebase.",
    market_potential: {
      comparable_apps: [
        "Fitbod — $10M+ ARR, premium workout tracking",
        "Strong — Top 50 Health & Fitness, 4.9 stars",
        "JEFIT — 10M+ downloads on Google Play",
      ],
      market_size: "The global fitness app market is projected to reach $30B by 2028, growing at 21% CAGR.",
    },
    revenue_potential: "Top fitness apps earn $5-15M ARR through subscriptions. Even niche fitness apps with 10K users can generate $50-150K/year with a $9.99/month premium tier. Your Firebase backend means you're already set up for user accounts and data sync.",
    strengths: [
      "Firebase backend enables real-time sync across devices",
      "React Navigation gives a native multi-screen experience",
      "Social features increase retention by 40% vs solo-tracking apps",
    ],
    growth_suggestions: [
      "Add Apple Health / Google Fit integration for automatic tracking",
      "Implement push notification reminders to boost daily active users",
      "Add a freemium tier with premium workout plans to monetize",
    ],
    excitement_hook: "Your app has the technical foundation to compete in one of the fastest-growing app categories — ship it and start building your user base.",
  },
};

const severityIcon = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColor = {
  critical: "text-red-600",
  warning: "text-amber-600",
  info: "text-blue-600",
};

const IssueCard = ({ issue, onFix, fixingId, canFix, conversionFirst }: { issue: Issue; onFix: (id: string) => void; fixingId: string | null; canFix: boolean; conversionFirst?: boolean }) => {
  const [open, setOpen] = useState(false);
  const Icon = severityIcon[issue.severity];
  const isFixing = fixingId === issue.id;

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${issue.fixed ? "border-green-200 bg-green-50" : "border-surface-200"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-50 transition-colors cursor-pointer"
      >
        <Icon className={`h-4 w-4 shrink-0 ${issue.fixed ? "text-green-600" : severityColor[issue.severity]}`} />
        <span className={`flex-1 text-sm font-medium ${issue.fixed ? "text-surface-400 line-through" : "text-surface-800"}`}>{issue.friendly_title || issue.title}</span>
        <div className="flex items-center gap-2">
          {issue.fixed && (
            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Fixed</span>
          )}
          {!issue.fixed && issue.auto_fixable && (
            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Auto-fix</span>
          )}
          {open ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
        </div>
      </button>
      {open && !issue.fixed && (
        <div className="px-4 pb-4 pt-1 border-t border-surface-100">
          <p className="text-sm text-surface-500 leading-relaxed mb-3">{issue.friendly_description || issue.description}</p>
          {issue.fix_description && (
            <div className="rounded-lg bg-surface-50 px-3 py-2.5 flex items-start gap-2">
              <Wrench className="h-3.5 w-3.5 text-surface-500 mt-0.5 shrink-0" />
              <p className="text-sm text-surface-600">{issue.fix_description}</p>
            </div>
          )}
          {issue.auto_fixable && conversionFirst && (
            <p className="mt-3 text-xs font-medium text-surface-500">
              We'll fix this automatically. First click "Make it Google Play ready" above.
            </p>
          )}
          {issue.auto_fixable && !conversionFirst && canFix && (
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => onFix(issue.id)} disabled={isFixing}>
              {isFixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
              {isFixing ? "Fixing..." : "Fix this issue"}
            </Button>
          )}
          {issue.auto_fixable && !conversionFirst && !canFix && (
            <UpgradePrompt feature="Auto-fix" compact />
          )}
        </div>
      )}
    </div>
  );
};

// Email capture for anonymous scans: magic-link signup that also saves this
// report to the new account (claimed via localStorage + the claim effect).
const SaveReportCard = ({ projectId }: { projectId: string }) => {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSending(true);
    setError(null);
    localStorage.setItem("shippabel-claim-project", projectId);
    const { error: err } = await signInWithEmail(
      email.trim(),
      `${window.location.origin}/login?next=${encodeURIComponent(`/scan/${projectId}`)}`,
    );
    setSending(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 px-6 py-5 text-center">
        <p className="text-sm font-semibold text-green-900">Check your email</p>
        <p className="text-sm text-green-700 mt-1">
          We sent a link to <span className="font-medium">{email}</span>. Click it and this report is saved to your free account.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-surface-200 bg-surface-50 px-6 py-5">
      <div className="sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div className="mb-3 sm:mb-0">
          <p className="text-sm font-semibold text-surface-900">Don't lose this report</p>
          <p className="text-sm text-surface-500 mt-0.5">Save it to a free account and pick up right where you left off.</p>
        </div>
        <form onSubmit={submit} className="flex gap-2 shrink-0">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="you@example.com"
            aria-label="Email address"
            className="w-44 sm:w-52 rounded-lg bg-white border border-surface-200 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 outline-none focus:border-surface-400"
          />
          <Button type="submit" size="sm" disabled={sending} className="gap-1.5 whitespace-nowrap">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save my report
          </Button>
        </form>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
};

const ScoreRing = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div className="relative h-36 w-36 sm:h-44 sm:w-44">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-100" />
        <circle
          cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8"
          className={`${color} transition-all duration-1000 ease-out`}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl sm:text-5xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-surface-500 mt-1">/ 100</span>
      </div>
    </div>
  );
};

export const ScanResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const { fixingIssueId, fixing, fixAll, fixOne } = useFix(id ?? "");
  const { converting, error: convertError, convert } = useConvert(id ?? "");
  const { user } = useAuth();
  const { isPaid } = usePlan();

  useDocumentHead({
    title: projectName ? `${projectName} — Score: ${scan?.score ?? "..."}` : "Scan Results",
    description: scan
      ? `${projectName} scored ${scan.score}/100 for store readiness. ${scan.summary.critical} critical, ${scan.summary.warning} warnings found.`
      : "App store readiness scan results",
  });
  const { toast } = useToast();

  // Clear the pending post-convert reload if the user navigates away
  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  const reload = async () => {
    if (id === "demo") return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();
    if (data) {
      setScan(data.scan_result as ScanResult);
    }
  };

  const handleConvert = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/scan/${id}`)}`);
      return;
    }
    if (!isPaid) {
      toast("error", "This feature requires the Ship plan.");
      navigate("/pricing");
      return;
    }

    const result = await convert();
    if (result) {
      toast("success", result.message);
      // Wait a moment for re-scan to complete, then reload
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => reload(), 3000);
    } else {
      // convertError state hasn't propagated to this closure yet — the inline
      // error banner shows the details.
      toast("error", "Conversion failed. See the error message for details.");
    }
  };

  const handleFixOne = async (issueId: string) => {
    const result = await fixOne(issueId);
    if (result && result.fixed > 0) {
      toast("success", "Issue fixed successfully!");
      await reload();
    } else {
      toast("error", result?.errorMessage ?? "Could not fix this issue automatically.");
    }
  };

  const handleFixAll = async () => {
    const result = await fixAll();
    if (result && result.fixed > 0) {
      toast("success", `Fixed ${result.fixed} issue${result.fixed > 1 ? "s" : ""}!`);
      await reload();
    } else {
      toast("error", result?.errorMessage ?? "No issues could be auto-fixed.");
    }
  };

  useEffect(() => {
    const loadProject = async () => {
      if (id === "demo") {
        setScan(demoScanResult);
        setProjectName("demo-app");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setScan(null);
        setProjectName("");
        setLoading(false);
        return;
      } else {
        setScan(data.scan_result as ScanResult);
        setProjectName(data.name);
        setOwnerId(data.user_id ?? null);
      }
      setLoading(false);
    };

    loadProject();
  }, [id]);

  // Claim an anonymous scan for the signed-in user (e.g. right after the
  // "email me this report" magic-link login).
  useEffect(() => {
    if (!user || ownerId !== null || !id || id === "demo" || loading) return;
    (async () => {
      const { error } = await supabase
        .from("projects")
        .update({ user_id: user.id })
        .eq("id", id)
        .is("user_id", null).select("id").single();
      if (!error) {
        setOwnerId(user.id);
        localStorage.removeItem("shippabel-claim-project");
        toast("success", "Report saved to your account.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ownerId, id, loading]);

  if (loading) {
    return <ScanResultsSkeleton />;
  }

  if (!scan) {
    return (
      <div className="mx-auto max-w-md px-4 py-32 text-center">
        <h1 className="text-xl font-semibold mb-2">Scan not found</h1>
        <p className="text-sm text-surface-400 mb-6">This scan doesn't exist or has expired.</p>
        <Link to="/scan"><Button>Scan a new project</Button></Link>
      </div>
    );
  }

  const groupedIssues: Record<IssueSeverity, Issue[]> = {
    critical: scan.issues.filter((i) => i.severity === "critical"),
    warning: scan.issues.filter((i) => i.severity === "warning"),
    info: scan.issues.filter((i) => i.severity === "info"),
  };

  const autoFixable = scan.issues.filter((i) => i.auto_fixable && !i.fixed).length;

  // Verdict-first: answer "can my app be on Google Play?" before anything else.
  const isReady = scan.summary.critical === 0 && !scan.needs_conversion;
  const verdict = scan.needs_conversion
    ? {
        title: "Your app can be on Google Play",
        sub: "It needs a quick one-time conversion to a mobile app first. That's one click, and we do it for you.",
      }
    : isReady
    ? {
        title: "Your app is ready for Google Play",
        sub: "Nothing blocks publication. The next step is writing your store page.",
      }
    : {
        title: `Almost there. ${scan.summary.critical} thing${scan.summary.critical > 1 ? "s" : ""} to fix first`,
        sub: autoFixable > 0
          ? "Google would reject the app as it is, but most of it we can fix for you automatically."
          : "Google would reject the app as it is. Open each item below to see exactly what to do.",
      };

  return (
    <div>
      {/* Flow progress bar */}
      {id && id !== "demo" && <ShipFlowBar projectId={id} />}

    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 mb-10">
        <ScoreRing score={scan.score} />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-surface-500">{projectName}</p>
            {scan.project_type && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100 text-surface-500">
                {scan.project_type === "react-web" ? "Web App" : scan.project_type === "nextjs" ? "Next.js" : scan.project_type === "vue" ? "Vue" : scan.project_type === "expo" ? "Expo" : scan.project_type === "react-native" ? "React Native" : scan.project_type === "static" ? "Website" : "Project"}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-surface-900 mb-2">{verdict.title}</h1>
          <p className="text-surface-500 mb-4 max-w-lg">{verdict.sub}</p>
          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
            {scan.summary.critical > 0 && <Badge severity="critical">{scan.summary.critical} must fix</Badge>}
            {scan.summary.warning > 0 && <Badge severity="warning">{scan.summary.warning} good to fix</Badge>}
            {scan.summary.info > 0 && <Badge severity="info">{scan.summary.info} nice to know</Badge>}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 justify-center sm:justify-start">
            {/* One primary action. When the app needs conversion, the green
                panel below IS the next step, so nothing competes with it here. */}
            {!scan.needs_conversion && isReady && id && (
              <Link to={`/app/${id}/listing`}>
                <Button size="sm" className="gap-1.5">
                  Create your store page
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            {!scan.needs_conversion && !isReady && autoFixable > 0 && isPaid && (
              <Button size="sm" className="gap-1.5" onClick={handleFixAll} disabled={fixing}>
                {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                {fixing ? "Fixing..." : `Fix ${autoFixable} issue${autoFixable > 1 ? "s" : ""} for me`}
              </Button>
            )}
            {!scan.needs_conversion && !isReady && autoFixable > 0 && !isPaid && (
              <UpgradePrompt feature="Auto-fix" compact />
            )}
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(window.location.href); toast("success", "Link copied!"); }}>
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Save-report email capture — anonymous scans only */}
      {!user && id && id !== "demo" && ownerId === null && <SaveReportCard projectId={id} />}

      {/* Conversion CTA — for non-Expo projects */}
      {scan.needs_conversion && (
        <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
              <Rocket className="h-6 w-6 text-green-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-surface-900 mb-2">We can make your app store-ready</h3>
              <p className="text-surface-500 text-sm leading-relaxed mb-4">
                {scan.conversion_message}
                {" "}We'll update your code, push the changes to your GitHub, and re-scan to make sure everything passes.
              </p>
              <Button
                onClick={handleConvert}
                disabled={converting}
                className="gap-2"
              >
                {converting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Converting your app...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Make it Google Play ready
                  </>
                )}
              </Button>
              {convertError && (
                <p className="text-sm text-red-600 mt-2">{convertError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* App Potential — the personal hook: what your app is, and what it could become */}
      {scan.potential_analysis && (
        <div className="mb-10">
          <AppPotentialCard analysis={scan.potential_analysis} projectId={id ?? "demo"} />
        </div>
      )}

      {/* Issues — grouped by what they mean for the user, not by jargon */}
      <div id="issues-section" />
      <p className="text-sm text-surface-500 mb-6">
        The security check samples up to 10 JavaScript or TypeScript files. A clean report does not replace a full security review.
      </p>
      {(["critical", "warning", "info"] as const).map((severity) => {
        const issues = groupedIssues[severity];
        if (issues.length === 0) return null;
        const groupLabel =
          severity === "critical" ? "Must fix before publishing"
          : severity === "warning" ? "Good to fix"
          : "Nice to know";
        return (
          <div key={severity} className="mb-8">
            <h2 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
              {severity === "critical" && <AlertCircle className="h-4 w-4 text-red-600" />}
              {severity === "warning" && <AlertTriangle className="h-4 w-4 text-amber-600" />}
              {severity === "info" && <Info className="h-4 w-4 text-blue-600" />}
              {groupLabel}
              <span className="font-normal text-surface-400">({issues.length})</span>
            </h2>
            <div className="space-y-2">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} onFix={handleFixOne} fixingId={fixingIssueId} canFix={isPaid} conversionFirst={scan.needs_conversion} />
              ))}
            </div>
          </div>
        );
      })}


      {/* Guided next step */}
      {id && id !== "demo" && (
        <div className="mt-8">
          <ShipFlowGuide projectId={id} />
        </div>
      )}

      {/* Demo next step — try the full flow */}
      {id === "demo" && (
        <div className="mt-10 rounded-2xl border border-surface-200 bg-surface-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-surface-900 mb-2">Try the full flow</h3>
          <p className="text-sm text-surface-500 mb-5">See how the listing editor, screenshots, and submission works — all with demo data.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/app/demo/listing">
              <Button className="gap-2">
                <FileText className="h-4 w-4" />
                Try store listing
              </Button>
            </Link>
            <Link to="/app/demo/screenshots">
              <Button variant="secondary" className="gap-2">
                Try screenshots
              </Button>
            </Link>
            <Link to="/scan">
              <Button variant="ghost" className="gap-2">
                Scan my own app
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
