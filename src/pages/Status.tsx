import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ShipFlowBar } from "@/components/ShipFlowBar";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Rocket,
  Apple,
  Smartphone,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useBuild, type Submission } from "@/hooks/useBuild";

const timelineSteps = [
  { key: "build", label: "Build" },
  { key: "upload", label: "Upload" },
  { key: "review", label: "Review" },
  { key: "live", label: "Live" },
] as const;

const getTimelineState = (submission: Submission) => {
  const { build_status, review_status } = submission;

  if (build_status === "failed") return { active: 0, failed: true };
  if (build_status === "in_progress" || build_status === "queued") return { active: 0, failed: false };
  if (build_status === "completed" && review_status === "not_submitted") return { active: 1, failed: false };
  if (review_status === "pending_credentials") return { active: 1, failed: true };
  if (review_status === "waiting_for_review" || review_status === "in_review") return { active: 2, failed: false };
  if (review_status === "rejected") return { active: 2, failed: true };
  if (review_status === "approved") return { active: 3, failed: false };
  return { active: 0, failed: false };
};

export const Status = () => {
  const { id } = useParams();
  const { submissions, loading, reload } = useBuild(id ?? "");

  useEffect(() => {
    if (id) reload();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
    {id && <ShipFlowBar projectId={id} />}
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link to={`/scan/${id}`} className="text-surface-500 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Submission Status</h1>
            <p className="text-surface-400 text-sm mt-1">Track your builds and store reviews</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => reload()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {submissions.length === 0 ? (
        <Card className="text-center py-16">
          <Rocket className="h-12 w-12 text-surface-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No submissions yet</h2>
          <p className="text-sm text-surface-400 mb-6">
            Build and submit your app to see the status here.
          </p>
          <Link to={`/app/${id}/submit`}>
            <Button className="gap-2">
              <Rocket className="h-4 w-4" />
              Build & Submit
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {submissions.map((submission) => {
            const timeline = getTimelineState(submission);

            return (
              <Card key={submission.id}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {submission.platform === "ios" ? (
                      <div className="h-10 w-10 rounded-xl bg-surface-800 flex items-center justify-center">
                        <Apple className="h-5 w-5 text-surface-300" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-surface-800 flex items-center justify-center">
                        <Smartphone className="h-5 w-5 text-surface-300" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">
                        {submission.platform === "ios" ? "iOS" : "Android"} Submission
                      </h3>
                      <p className="text-xs text-surface-500">
                        {new Date(submission.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {submission.eas_build_id && (
                    <a
                      href={`https://expo.dev/builds/${submission.eas_build_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                    >
                      EAS Build
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Timeline */}
                <div className="flex items-center">
                  {timelineSteps.map((step, i) => (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            i < timeline.active
                              ? "bg-emerald-500"
                              : i === timeline.active && timeline.failed
                              ? "bg-red-500"
                              : i === timeline.active
                              ? "bg-primary-600"
                              : "bg-surface-800"
                          }`}
                        >
                          {i < timeline.active ? (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          ) : i === timeline.active && timeline.failed ? (
                            <AlertCircle className="h-4 w-4 text-white" />
                          ) : i === timeline.active ? (
                            <Loader2 className="h-4 w-4 text-white animate-spin" />
                          ) : (
                            <Clock className="h-4 w-4 text-surface-600" />
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            i <= timeline.active ? "text-surface-200" : "text-surface-600"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {i < timelineSteps.length - 1 && (
                        <div
                          className={`flex-1 h-px mx-2 ${
                            i < timeline.active ? "bg-emerald-500" : "bg-surface-800"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Status detail */}
                {submission.rejection_reason && (
                  <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                    <p className="text-sm font-medium text-red-300 mb-1">Rejection Reason</p>
                    <p className="text-sm text-surface-400">{submission.rejection_reason}</p>
                  </div>
                )}

                {submission.review_status === "approved" && (
                  <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-emerald-300">
                      Your app is live on the {submission.platform === "ios" ? "App Store" : "Google Play Store"}!
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
};
