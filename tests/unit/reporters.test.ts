import { describe, it, expect } from "vitest";
import { formatJsonReport } from "../../src/reporters/json.js";
import { formatMarkdownReport } from "../../src/reporters/markdown.js";
import { formatTerminalReport } from "../../src/reporters/terminal.js";
import type { ScanReport } from "../../src/types.js";

const mockReport: ScanReport = {
  version: "1.0.0",
  scannedAt: "2026-10-28T12:00:00.000Z",
  projectRoot: "/workspace/my-app",
  platform: "linux",
  arch: "x64",
  health: {
    score: 85,
    rating: "good",
    total: 2,
    passed: 1,
    warning: 1,
    failed: 0,
    skipped: 0,
    criticalIssues: 0,
  },
  results: [
    {
      id: "test-node",
      category: "runtime",
      title: "Node.js Runtime",
      status: "passed",
      severity: "info",
      summary: "Node.js installed (v26.10.0)",
      actual: "26.10.0",
      remediation: [],
      durationMs: 15,
      detectedAt: "2026-10-28T12:00:00.000Z",
    },
    {
      id: "test-env",
      category: "environment",
      title: ".env Parity",
      status: "warning",
      severity: "low",
      summary: "Missing OPTIONAL_KEY in .env",
      remediation: ["Add OPTIONAL_KEY=default to .env"],
      durationMs: 5,
      detectedAt: "2026-10-28T12:00:00.000Z",
    },
  ],
  categories: {
    runtime: { total: 1, passed: 1, warning: 0, failed: 0 },
    environment: { total: 1, passed: 0, warning: 1, failed: 0 },
  },
};

describe("Reporters", () => {
  it("formats valid JSON without corruption", () => {
    const json = formatJsonReport(mockReport);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.health.score).toBe(85);
    expect(parsed.results.length).toBe(2);
  });

  it("formats Markdown with tables and findings", () => {
    const md = formatMarkdownReport(mockReport);
    expect(md).toContain("# 🩺 EnvDoctor Diagnostic Report");
    expect(md).toContain("| **runtime** | 1 | 1 | 0 | 0 |");
    expect(md).toContain("Node.js Runtime");
    expect(md).toContain("Recommended Action:");
  });

  it("formats terminal report with ANSI badges and summaries", () => {
    const term = formatTerminalReport(mockReport);
    expect(term).toContain("EnvDoctor — Developer Environment Diagnostics");
    expect(term).toContain("Health Score:");
    expect(term).toContain("85/100");
    expect(term).toContain("RUNTIME");
  });
});
