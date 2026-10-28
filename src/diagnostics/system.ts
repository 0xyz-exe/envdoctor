import os from "node:os";
import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "../types.js";
import { sanitizePath } from "../security/redactor.js";

export const systemPlugin: DiagnosticPlugin = {
  id: "plugin-system",
  name: "System Environment",
  category: "system",
  description: "Inspects operating system, CPU architecture, memory, and shell.",
  async run(context: DiagnosticContext): Promise<DiagnosticResult[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const totalMemGb = (totalMemBytes / 1024 / 1024 / 1024).toFixed(1);
    const freeMemGb = (freeMemBytes / 1024 / 1024 / 1024).toFixed(1);
    const cpus = os.cpus();
    const platform = os.platform();
    const release = os.release();
    const arch = os.arch();
    const defaultShell = process.env.SHELL || process.env.COMSPEC || "unknown";

    // 1. OS & Architecture Check
    results.push({
      id: "system-os",
      category: "system",
      title: "Operating System & Architecture",
      status: "passed",
      severity: "info",
      summary: `${platform} (${release}) on ${arch} with ${cpus.length} CPU core(s)`,
      expected: "Supported 64-bit platform",
      actual: `${platform} ${arch}`,
      remediation: [],
      durationMs: Date.now() - startTime,
      detectedAt: new Date().toISOString(),
      metadata: {
        platform,
        release,
        arch,
        cpuModel: cpus[0]?.model || "unknown",
        cpuCores: cpus.length,
      },
    });

    // 2. Memory Availability Check
    const freeMemMb = Math.round(freeMemBytes / 1024 / 1024);
    const isLowMem = freeMemMb < 1024; // Less than 1GB free
    results.push({
      id: "system-memory",
      category: "system",
      title: "System Memory Capacity",
      status: isLowMem ? "warning" : "passed",
      severity: isLowMem ? "medium" : "info",
      summary: `Total: ${totalMemGb} GB, Available: ${freeMemGb} GB free`,
      expected: ">= 1.0 GB available memory for development tasks",
      actual: `${freeMemGb} GB available`,
      remediation: isLowMem
        ? [
            "Close memory-intensive background processes or Docker containers",
            "Consider increasing system swap or physical RAM",
          ]
        : [],
      durationMs: Date.now() - startTime,
      detectedAt: new Date().toISOString(),
    });

    // 3. Shell Environment Check
    results.push({
      id: "system-shell",
      category: "system",
      title: "Default Terminal Shell",
      status: "passed",
      severity: "info",
      summary: `Active shell: ${sanitizePath(defaultShell)}`,
      actual: sanitizePath(defaultShell),
      remediation: [],
      durationMs: Date.now() - startTime,
      detectedAt: new Date().toISOString(),
    });

    return results;
  },
};
