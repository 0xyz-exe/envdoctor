import { describe, it, expect } from "vitest";
import { calculateHealthScore } from "../../src/engine/score.js";
import type { DiagnosticResult } from "../../src/types.js";

describe("Health Score Calculator", () => {
  it("calculates 100 for all passed results", () => {
    const results: DiagnosticResult[] = [
      {
        id: "test-1",
        category: "system",
        title: "Test 1",
        status: "passed",
        severity: "info",
        summary: "Passed",
        remediation: [],
        durationMs: 10,
        detectedAt: new Date().toISOString(),
      },
    ];

    const score = calculateHealthScore(results);
    expect(score.score).toBe(100);
    expect(score.rating).toBe("excellent");
    expect(score.passed).toBe(1);
    expect(score.failed).toBe(0);
  });

  it("penalizes critical failure heavily", () => {
    const results: DiagnosticResult[] = [
      {
        id: "test-critical",
        category: "runtime",
        title: "Critical Tool Missing",
        status: "failed",
        severity: "critical",
        summary: "Missing essential runtime",
        remediation: ["Install runtime"],
        durationMs: 10,
        detectedAt: new Date().toISOString(),
      },
    ];

    const score = calculateHealthScore(results);
    expect(score.score).toBe(75);
    expect(score.criticalIssues).toBe(1);
    expect(score.rating).toBe("good");
  });

  it("handles multiple warnings and failures with bounded minimum 0", () => {
    const results: DiagnosticResult[] = Array.from({ length: 5 }, (_, i) => ({
      id: `fail-${i}`,
      category: "runtime",
      title: `Critical Failure ${i}`,
      status: "failed",
      severity: "critical",
      summary: "Failure",
      remediation: [],
      durationMs: 10,
      detectedAt: new Date().toISOString(),
    }));

    const score = calculateHealthScore(results);
    expect(score.score).toBe(0);
    expect(score.rating).toBe("critical");
  });
});
