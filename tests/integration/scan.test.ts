import { describe, it, expect } from "vitest";
import { executeScan } from "../../src/engine/scheduler.js";
import { systemPlugin } from "../../src/diagnostics/system.js";
import { projectPlugin } from "../../src/diagnostics/project.js";

describe("Scan Scheduler Integration", () => {
  it("executes built-in plugins concurrently and collects report", async () => {
    const report = await executeScan(
      [systemPlugin, projectPlugin],
      {
        projectRoot: process.cwd(),
        platform: process.platform,
        timeoutMs: 4000,
      },
      { concurrency: 2 }
    );

    expect(report.version).toBe("1.0.0");
    expect(report.results.length).toBeGreaterThan(0);
    expect(report.health.total).toBe(report.results.length);
    expect(report.health.score).toBeGreaterThanOrEqual(0);
    expect(report.health.score).toBeLessThanOrEqual(100);

    const systemItems = report.results.filter((r) => r.category === "system");
    expect(systemItems.length).toBeGreaterThan(0);
    expect(systemItems.some((r) => r.id === "system-os")).toBe(true);
  });
});
