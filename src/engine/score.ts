import type { DiagnosticResult, HealthScore } from "../types.js";

/**
 * Calculates a reproducible, transparent health score (0-100).
 *
 * Methodology:
 * Base: 100 points.
 * Penalties:
 * - Critical failure: -25 pts
 * - High failure: -15 pts
 * - Medium failure: -10 pts
 * - Low failure: -5 pts
 * - Critical warning: -10 pts
 * - High warning: -6 pts
 * - Medium warning: -4 pts
 * - Low warning: -2 pts
 * Score is clamped to [0, 100].
 */
export function calculateHealthScore(results: DiagnosticResult[]): HealthScore {
  let score = 100;
  let passed = 0;
  let warning = 0;
  let failed = 0;
  let skipped = 0;
  let criticalIssues = 0;

  for (const r of results) {
    if (r.status === "passed") {
      passed++;
    } else if (r.status === "skipped") {
      skipped++;
    } else if (r.status === "warning") {
      warning++;
      switch (r.severity) {
        case "critical":
          score -= 10;
          criticalIssues++;
          break;
        case "high":
          score -= 6;
          break;
        case "medium":
          score -= 4;
          break;
        case "low":
          score -= 2;
          break;
      }
    } else if (r.status === "failed") {
      failed++;
      switch (r.severity) {
        case "critical":
          score -= 25;
          criticalIssues++;
          break;
        case "high":
          score -= 15;
          break;
        case "medium":
          score -= 10;
          break;
        case "low":
          score -= 5;
          break;
      }
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let rating: HealthScore["rating"] = "excellent";
  if (score >= 90) rating = "excellent";
  else if (score >= 75) rating = "good";
  else if (score >= 50) rating = "fair";
  else if (score >= 25) rating = "poor";
  else rating = "critical";

  return {
    score,
    rating,
    total: results.length,
    passed,
    warning,
    failed,
    skipped,
    criticalIssues,
  };
}
