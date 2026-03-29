export type Platform = "ios" | "android" | "both";
export type Framework = "expo" | "react-native";
export type IssueSeverity = "critical" | "warning" | "info";
export type IssueCategory = "config" | "security" | "assets" | "permissions" | "code";

export type ProjectType =
  | "expo"
  | "react-native"
  | "react-web"
  | "nextjs"
  | "vue"
  | "static"
  | "unknown";

export type ProjectStatus =
  | "scanning"
  | "issues_found"
  | "ready"
  | "building"
  | "submitted"
  | "live"
  | "rejected";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  repo_url: string | null;
  platform: Platform;
  framework: Framework;
  status: ProjectStatus;
  scan_result: ScanResult | null;
  created_at: string;
  updated_at: string;
}

export interface AppPotentialAnalysis {
  app_description: string;
  market_potential: {
    comparable_apps: string[];
    market_size: string;
  };
  revenue_potential: string;
  strengths: string[];
  growth_suggestions: string[];
  excitement_hook: string;
}

export interface ScanResult {
  score: number;
  project_type?: ProjectType;
  needs_conversion?: boolean;
  conversion_message?: string | null;
  issues: Issue[];
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
  potential_analysis?: AppPotentialAnalysis | null;
}

export interface Issue {
  id: string;
  project_id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  friendly_title?: string;
  friendly_description?: string;
  auto_fixable: boolean;
  fix_description: string | null;
  fixed: boolean;
}
