import type { DiagnosticResult, ScanReport } from "../types.js";

const isColorSupported =
  !process.env.NO_COLOR &&
  (process.env.FORCE_COLOR !== "0" || process.stdout.isTTY);

const colors = {
  reset: isColorSupported ? "\x1b[0m" : "",
  bold: isColorSupported ? "\x1b[1m" : "",
  dim: isColorSupported ? "\x1b[2m" : "",
  green: isColorSupported ? "\x1b[32m" : "",
  yellow: isColorSupported ? "\x1b[33m" : "",
  red: isColorSupported ? "\x1b[31m" : "",
  cyan: isColorSupported ? "\x1b[36m" : "",
  blue: isColorSupported ? "\x1b[34m" : "",
  magenta: isColorSupported ? "\x1b[35m" : "",
};

function getStatusBadge(status: DiagnosticResult["status"]): string {
  switch (status) {
    case "passed":
      return `${colors.green}✔ PASS${colors.reset}`;
    case "warning":
      return `${colors.yellow}▲ WARN${colors.reset}`;
    case "failed":
      return `${colors.red}✖ FAIL${colors.reset}`;
    case "skipped":
      return `${colors.dim}○ SKIP${colors.reset}`;
    default:
      return `${colors.dim}? UNKN${colors.reset}`;
  }
}

function getRatingColor(rating: string): string {
  switch (rating) {
    case "excellent":
      return colors.green;
    case "good":
      return colors.cyan;
    case "fair":
      return colors.yellow;
    case "poor":
    case "critical":
      return colors.red;
    default:
      return colors.reset;
  }
}

export function formatTerminalReport(report: ScanReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(
    `${colors.bold}${colors.cyan}🩺 EnvDoctor — Developer Environment Diagnostics${colors.reset}`
  );
  lines.push(`${colors.dim}Target: ${report.projectRoot} | Platform: ${report.platform} (${report.arch})${colors.reset}`);
  lines.push("─".repeat(70));

  const ratingColor = getRatingColor(report.health.rating);
  lines.push(
    `Health Score: ${colors.bold}${ratingColor}${report.health.score}/100 [${report.health.rating.toUpperCase()}]${colors.reset}  ` +
      `| Passed: ${colors.green}${report.health.passed}${colors.reset} ` +
      `| Warnings: ${colors.yellow}${report.health.warning}${colors.reset} ` +
      `| Failures: ${colors.red}${report.health.failed}${colors.reset}`
  );
  lines.push("─".repeat(70));

  // Group findings by category
  const grouped = new Map<string, DiagnosticResult[]>();
  for (const r of report.results) {
    const list = grouped.get(r.category) || [];
    list.push(r);
    grouped.set(r.category, list);
  }

  for (const [cat, items] of grouped.entries()) {
    lines.push("");
    lines.push(`${colors.bold}${colors.magenta}▶ ${cat.toUpperCase()}${colors.reset}`);
    for (const item of items) {
      const badge = getStatusBadge(item.status);
      lines.push(`  ${badge}  ${colors.bold}${item.title}${colors.reset}`);
      lines.push(`         ${colors.dim}${item.summary}${colors.reset}`);

      if (item.remediation && item.remediation.length > 0 && item.status !== "passed") {
        for (const rem of item.remediation) {
          lines.push(`         ${colors.cyan}↳ Fix: ${rem}${colors.reset}`);
        }
      }
    }
  }

  lines.push("");
  lines.push("─".repeat(70));
  if (report.health.failed > 0) {
    lines.push(
      `${colors.red}${colors.bold}⚠ Scan finished with ${report.health.failed} failure(s). Check recommendations above.${colors.reset}`
    );
  } else if (report.health.warning > 0) {
    lines.push(
      `${colors.yellow}${colors.bold}✔ Scan completed with ${report.health.warning} recommendation(s). Environment is functional.${colors.reset}`
    );
  } else {
    lines.push(
      `${colors.green}${colors.bold}✔ Perfect! All environment diagnostics passed successfully.${colors.reset}`
    );
  }
  lines.push("");

  return lines.join("\n");
}
