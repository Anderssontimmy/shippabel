import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScanResultsSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import { ShipFlowGuide } from "@/components/ShipFlowGuide";
import { AppPotentialCard } from "@/components/AppPotentialCard";
import { useFix } from "@/hooks/useFix";
import { useConvert } from "@/hooks/useConvert";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentHead } from "@/hooks/useDocumentHead";
import { supabase } from "@/lib/supabase";
import type { Issue, IssueSeverity, ScanResult } from "@/lib/types";

// Fallback demo data for when Supabase isn't connected
const demoScanResult: ScanResult = {
  score: 73,
  project_type: "react-web",
  needs_conversion: true,
  conversion_message: "Your app is a web app built with React. We can wrap it as a mobile app and publish it to the App Store and Google Play.",
  issues: [
    {
      id: "1", project_id: "demo", severity: "critical", category: "assets",
      title: "Missing app icon",
      description: "Your project is missing a 1024x1024 app icon. The App Store requires this exact size without transparency. Without it, your submission will be rejected.",
      auto_fixable: false, fix_description: "Add a 1024x1024 PNG file without alpha channel as your app icon in app.json.", fixed: false,
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
      description: "No privacy policy URL is set. Both Apple and Google require a privacy policy.",
      auto_fixable: true, fix_description: "We can generate and host a privacy policy for your app.", fixed: false,
    },
    {
      id: "5", project_id: "demo", severity: "warning", category: "config",
      title: "Build number not set",
      description: "Your build number is missing. Each submission requires an incremented build number.",
      auto_fixable: true, fix_description: "Set ios.buildNumber and android.versionCode in app.json.", fixed: false,
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
      auto_fixable: true, fix_description: "Add ios.appStoreCategory to app.json.", fixed: false,
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
  critical: "text-red-400",
  warning: "text-amber-400",
  info: "text-blue-400",
};

const IssueCard = ({ issue, onFix, fixingId }: { issue: Issue; onFix: (id: string) => void; fixingId: string | null }) => {
  const [open, setOpen] = useState(false);
  const Icon = severityIcon[issue.severity];
  const isFixing = fixingId === issue.id;

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${issue.fixed ? "border-green-500/20 bg-green-500/5" : "border-surface-800"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-800/30 transition-colors cursor-pointer"
      >
        <Icon className={`h-4 w-4 shrink-0 ${issue.fixed ? "text-green-400" : severityColor[issue.severity]}`} />
        <span className={`flex-1 text-sm font-medium ${issue.fixed ? "text-surface-500 line-through" : "text-surface-200"}`}>{issue.friendly_title || issue.title}</span>
        <div className="flex items-center gap-2">
          {issue.fixed && (
            <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Fixed</span>
          )}
          {!issue.fixed && issue.auto_fixable && (
            <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Auto-fix</span>
          )}
          {open ? <ChevronDown className="h-4 w-4 text-surface-500" /> : <ChevronRight className="h-4 w-4 text-surface-500" />}
        </div>
      </button>
      {open && !issue.fixed && (
        <div className="px-4 pb-4 pt-1 border-t border-surface-800/50">
          <p className="text-sm text-surface-400 leading-relaxed mb-3">{issue.friendly_description || issue.description}</p>
          {issue.fix_description && (
            <div className="rounded-lg bg-surface-800/50 px-3 py-2.5 flex items-start gap-2">
              <Wrench className="h-3.5 w-3.5 text-primary-400 mt-0.5 shrink-0" />
              <p className="text-sm text-surface-300">{issue.fix_description}</p>
            </div>
          )}
          {issue.auto_fixable && (
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => onFix(issue.id)} disabled={isFixing}>
              {isFixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
              {isFixing ? "Fixing..." : "Fix this issue"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

const ScoreRing = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="relative h-36 w-36 sm:h-44 sm:w-44">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-800" />
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
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>("");
  const { fixingIssueId, fixing, fixAll, fixOne } = useFix(id ?? "");
  const { converting, error: convertError, convert } = useConvert(id ?? "");
  const { user } = useAuth();

  useDocumentHead({
    title: projectName ? `${projectName} — Score: ${scan?.score ?? "..."}` : "Scan Results",
    description: scan
      ? `${projectName} scored ${scan.score}/100 for store readiness. ${scan.summary.critical} critical, ${scan.summary.warning} warnings found.`
      : "App store readiness scan results",
  });
  const { toast } = useToast();

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
      window.location.href = "/login";
      return;
    }

    // Check if user has a paid plan (Launch or Pro)
    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const hasPaidPlan = metadata?.stripe_customer_id && metadata?.plan;
    if (!hasPaidPlan) {
      toast("error", "Conversion requires a paid plan. Check out our pricing options.");
      window.location.href = "/pricing";
      return;
    }

    const result = await convert();
    if (result) {
      toast("success", result.message);
      // Wait a moment for re-scan to complete, then reload
      setTimeout(() => reload(), 3000);
    } else if (convertError) {
      toast("error", convertError);
    }
  };

  const handleFixOne = async (issueId: string) => {
    const result = await fixOne(issueId);
    if (result && result.fixed > 0) {
      toast("success", "Issue fixed successfully!");
      await reload();
    } else {
      toast("error", "Could not fix this issue automatically.");
    }
  };

  const handleFixAll = async () => {
    const result = await fixAll();
    if (result && result.fixed > 0) {
      toast("success", `Fixed ${result.fixed} issue${result.fixed > 1 ? "s" : ""}!`);
      await reload();
    } else {
      toast("error", "No issues could be auto-fixed.");
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
        setScan(demoScanResult);
        setProjectName("my-app");
      } else {
        setScan(data.scan_result as ScanResult);
        setProjectName(data.name);
      }
      setLoading(false);
    };

    loadProject();
  }, [id]);

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

  const autoFixable = scan.issues.filter((i) => i.auto_fixable).length;

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
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-800 text-surface-400">
                {scan.project_type === "react-web" ? "Web App" : scan.project_type === "nextjs" ? "Next.js" : scan.project_type === "vue" ? "Vue" : scan.project_type === "expo" ? "Expo" : scan.project_type === "react-native" ? "React Native" : scan.project_type === "static" ? "Website" : "Project"}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Readiness Report</h1>
          <p className="text-surface-400 mb-4">
            {scan.score >= 80
              ? "Almost there! A few tweaks and you're ready to ship."
              : scan.score >= 50
              ? "Getting closer. Fix the critical issues to improve your score."
              : "Needs work. Several issues must be resolved before submission."}
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
            <Badge severity="critical">{scan.summary.critical} critical</Badge>
            <Badge severity="warning">{scan.summary.warning} warnings</Badge>
            <Badge severity="info">{scan.summary.info} info</Badge>
          </div>
          <div className="mt-4 flex gap-3 justify-center sm:justify-start">
            {autoFixable > 0 && (
              <Button size="sm" className="gap-1.5" onClick={handleFixAll} disabled={fixing}>
                {fixing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                {fixing ? "Fixing..." : `Auto-fix ${autoFixable} issues`}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(window.location.href); toast("success", "Link copied!"); }}>
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Conversion CTA — for non-Expo projects */}
      {scan.needs_conversion && (
        <div className="mb-8 rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-transparent p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">
              <Rocket className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">We can make your app store-ready</h3>
              <p className="text-surface-400 text-sm leading-relaxed mb-4">
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
                    Make it App Store ready
                  </>
                )}
              </Button>
              {convertError && (
                <p className="text-sm text-red-400 mt-2">{convertError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* App Potential Analysis */}
      {scan.potential_analysis && (
        <div className="mb-10">
          <AppPotentialCard analysis={scan.potential_analysis} projectId={id ?? "demo"} />
        </div>
      )}

      {/* Issues */}
      <div id="issues-section" />
      {(["critical", "warning", "info"] as const).map((severity) => {
        const issues = groupedIssues[severity];
        if (issues.length === 0) return null;
        return (
          <div key={severity} className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-surface-500 mb-3 flex items-center gap-2">
              {severity === "critical" && <AlertCircle className="h-4 w-4 text-red-400" />}
              {severity === "warning" && <AlertTriangle className="h-4 w-4 text-amber-400" />}
              {severity === "info" && <Info className="h-4 w-4 text-blue-400" />}
              {severity} ({issues.length})
            </h2>
            <div className="space-y-2">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} onFix={handleFixOne} fixingId={fixingIssueId} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Success banner — when app is ready */}
      {scan.summary.critical === 0 && scan.score >= 80 && id && id !== "demo" && (
        <div className="mt-8 rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <h3 className="text-lg font-bold mb-1">Your app looks great!</h3>
          <p className="text-sm text-surface-400 mb-4">No critical issues. You're ready for the next step.</p>
          <Link to={`/app/${id}/listing`}>
            <Button className="gap-2">
              Create your store page
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* Guided next step */}
      {id && id !== "demo" && (
        <div className="mt-8">
          <ShipFlowGuide projectId={id} />
        </div>
      )}

      {/* Quick links (for demo or returning users) */}
      {id === "demo" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <Link to="/scan">
            <Card hover className="text-center py-6 h-full">
              <ArrowRight className="h-6 w-6 text-primary-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold">Scan Your App</h4>
              <p className="text-xs text-surface-500 mt-1">Try with your own project</p>
            </Card>
          </Link>
          <Link to="/pricing">
            <Card hover className="text-center py-6 h-full">
              <ArrowRight className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold">See Pricing</h4>
              <p className="text-xs text-surface-500 mt-1">Launch $99, Pro $29/mo</p>
            </Card>
          </Link>
          <Link to="/login">
            <Card hover className="text-center py-6 h-full">
              <ArrowRight className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold">Sign Up</h4>
              <p className="text-xs text-surface-500 mt-1">Save scans & unlock features</p>
            </Card>
          </Link>
        </div>
      )}
    </div>
    </div>
  );
};
