import type { ScanSource } from "./scanSource.ts";

interface ConfigIssue {
  severity: "critical" | "warning";
  category: "config" | "assets";
  title: string;
  description: string;
  auto_fixable: boolean;
  fix_description: string;
}

export function capacitorIssues(source: ScanSource): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const add = (title: string, description: string, severity: ConfigIssue["severity"] = "critical") =>
    issues.push({ title, description, severity, category: "config", auto_fixable: false, fix_description: description });
  const json = source.contents.get("capacitor.config.json");
  if (json !== undefined) {
    try {
      const config = JSON.parse(json);
      if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error();
      if (typeof config.appId !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(config.appId))
        add("Missing Android package name", "Set a valid appId in capacitor.config.json and keep it consistent with your Play Console app.");
      if (typeof config.webDir !== "string" || !config.webDir.trim() || config.webDir === "." || /(^|\/)\.\.(\/|$)/.test(config.webDir))
        add("Missing web build directory", "Set webDir to the folder containing your built index.html, such as dist.");
      if (config.server?.url) add("Mobile app uses a remote development server", "Remove server.url before a store build so the app loads its packaged web assets.", "warning");
    } catch { add("Invalid Capacitor configuration", "Fix the JSON in capacitor.config.json before building."); }
  } else if (source.fileList.some(path => /^capacitor\.config\.(ts|js)$/.test(path))) {
    add("Review dynamic Capacitor settings", "Check appId and webDir in your Capacitor config. The scanner does not execute JavaScript configuration.", "warning");
  } else {
    add("Missing Capacitor configuration", "Add capacitor.config.json with appId, appName and webDir before building.");
  }
  issues.push({ severity: "warning", category: "assets", title: "Review Android app icon", description: "Replace the default Android launcher icon and prepare a store icon before publishing.", auto_fixable: false, fix_description: "Add your own launcher icons to the Android project and a 512×512 PNG for your Play listing." });
  return issues;
}
