import os from "node:os";
import type {
  DiagnosticContext,
  DiagnosticPlugin,
  DiagnosticResult,
  ScanReport,
} from "../types.js";
import { calculateHealthScore } from "./score.js";
import { deepRedact } from "../security/redactor.js";

interface SchedulerOptions {
  concurrency?: number;
}

export async function runPluginWithTimeout(
  plugin: DiagnosticPlugin,
  context: DiagnosticContext
): Promise<DiagnosticResult[]> {
  const timeoutMs = context.timeoutMs || 5000;
  const startTime = Date.now();

  return new Promise<DiagnosticResult[]>((resolve) => {
    let completed = false;

    const timer = setTimeout(() => {
      if (completed) return;
      completed = true;
      const durationMs = Date.now() - startTime;
      resolve([
        {
          id: `${plugin.id}-timeout`,
          category: plugin.category,
          title: `${plugin.name} execution timed out`,
          status: "failed",
          severity: "high",
          summary: `Plugin '${plugin.name}' did not complete within ${timeoutMs}ms limit`,
          durationMs,
          detectedAt: new Date().toISOString(),
          remediation: [
            "Check if background processes or slow system commands are hanging",
            "Increase scan timeout with --timeout flag",
          ],
        },
      ]);
    }, timeoutMs);

    if (context.signal) {
      context.signal.addEventListener("abort", () => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        resolve([
          {
            id: `${plugin.id}-aborted`,
            category: plugin.category,
            title: `${plugin.name} execution cancelled`,
            status: "skipped",
            severity: "info",
            summary: `Scan was aborted by user or timeout signal`,
            durationMs: Date.now() - startTime,
            detectedAt: new Date().toISOString(),
            remediation: [],
          },
        ]);
      });
    }

    Promise.resolve(plugin.run(context))
      .then((results) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        resolve(results.map((r) => deepRedact(r)));
      })
      .catch((err: unknown) => {
        if (completed) return;
        completed = true;
        clearTimeout(timer);
        const message = err instanceof Error ? err.message : String(err);
        resolve([
          {
            id: `${plugin.id}-error`,
            category: plugin.category,
            title: `${plugin.name} failed with unhandled error`,
            status: "failed",
            severity: "medium",
            summary: `Error during plugin execution: ${message}`,
            durationMs: Date.now() - startTime,
            detectedAt: new Date().toISOString(),
            remediation: [
              "Review error details and check file system permissions",
            ],
          },
        ]);
      });
  });
}

export async function executeScan(
  plugins: DiagnosticPlugin[],
  context: DiagnosticContext,
  options: SchedulerOptions = {}
): Promise<ScanReport> {
  const concurrency = options.concurrency ?? 4;
  const filteredPlugins = context.categories?.length
    ? plugins.filter((p) => context.categories!.includes(p.category))
    : plugins;

  const results: DiagnosticResult[] = [];
  const queue = [...filteredPlugins];

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const plugin = queue.shift();
      if (!plugin) break;
      const pluginResults = await runPluginWithTimeout(plugin, context);
      results.push(...pluginResults);
    }
  });

  await Promise.all(workers);

  const health = calculateHealthScore(results);

  // Group by category
  const categories: ScanReport["categories"] = {};
  for (const r of results) {
    if (!categories[r.category]) {
      categories[r.category] = { total: 0, passed: 0, warning: 0, failed: 0 };
    }
    categories[r.category].total++;
    if (r.status === "passed") categories[r.category].passed++;
    else if (r.status === "warning") categories[r.category].warning++;
    else if (r.status === "failed") categories[r.category].failed++;
  }

  return {
    version: "1.0.0",
    scannedAt: new Date().toISOString(),
    projectRoot: context.projectRoot,
    platform: context.platform || process.platform,
    arch: os.arch(),
    health,
    results,
    categories,
  };
}
