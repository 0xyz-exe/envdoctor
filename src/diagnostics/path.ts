import fs from "node:fs";
import path from "node:path";
import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "../types.js";
import { sanitizePath } from "../security/redactor.js";

export const pathPlugin: DiagnosticPlugin = {
  id: "plugin-path",
  name: "PATH Environment Validator",
  category: "path",
  description: "Inspects system PATH for invalid directories, duplicates, empty segments, and formatting errors.",
  async run(_context: DiagnosticContext): Promise<DiagnosticResult[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    const rawPath = process.env.PATH || "";
    const delimiter = path.delimiter;
    const segments = rawPath.split(delimiter);

    const emptyEntries: number[] = [];
    const nonExistentDirs: string[] = [];
    const duplicates: string[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].trim();
      if (!seg) {
        emptyEntries.push(i);
        continue;
      }

      // Check duplicate (normalized)
      const normalized = path.normalize(seg).toLowerCase();
      if (seen.has(normalized)) {
        duplicates.push(seg);
      } else {
        seen.add(normalized);
      }

      // Check existence
      try {
        if (!fs.existsSync(seg)) {
          nonExistentDirs.push(seg);
        }
      } catch {
        nonExistentDirs.push(seg);
      }
    }

    const durationMs = Date.now() - startTime;

    // 1. Overall PATH integrity
    results.push({
      id: "path-segments-total",
      category: "path",
      title: "PATH Segment Count",
      status: "passed",
      severity: "info",
      summary: `Found ${segments.length} entries in active PATH environment`,
      actual: `${segments.length} entries`,
      remediation: [],
      durationMs,
      detectedAt: new Date().toISOString(),
      metadata: {
        totalEntries: segments.length,
        uniqueEntries: seen.size,
      },
    });

    // 2. Empty Entries Check
    if (emptyEntries.length > 0) {
      results.push({
        id: "path-empty-segments",
        category: "path",
        title: "Empty PATH Entries",
        status: "warning",
        severity: "low",
        summary: `Detected ${emptyEntries.length} empty entry/delimiter in PATH`,
        expected: "No consecutive or trailing delimiters in PATH",
        actual: `${emptyEntries.length} empty segment(s)`,
        remediation: [
          "Clean up trailing or consecutive delimiters (;; or ::) in PATH environment variables",
        ],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    } else {
      results.push({
        id: "path-empty-segments",
        category: "path",
        title: "Empty PATH Entries",
        status: "passed",
        severity: "info",
        summary: "No empty delimiters detected in PATH",
        remediation: [],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    }

    // 3. Non-existent Directories Check
    if (nonExistentDirs.length > 0) {
      const sample = nonExistentDirs.slice(0, 3).map((d) => sanitizePath(d));
      results.push({
        id: "path-nonexistent-directories",
        category: "path",
        title: "Non-Existent PATH Directories",
        status: "warning",
        severity: "medium",
        summary: `${nonExistentDirs.length} directory entry in PATH does not exist on disk`,
        expected: "All PATH directories exist on disk",
        actual: `${sample.join(", ")}${nonExistentDirs.length > 3 ? ` (+${nonExistentDirs.length - 3} more)` : ""}`,
        remediation: [
          "Remove uninstalled software directories or stale paths from user/system PATH",
        ],
        durationMs,
        detectedAt: new Date().toISOString(),
        metadata: {
          count: nonExistentDirs.length,
          directories: sample,
        },
      });
    } else {
      results.push({
        id: "path-nonexistent-directories",
        category: "path",
        title: "Non-Existent PATH Directories",
        status: "passed",
        severity: "info",
        summary: "All PATH entries resolve to valid directories on disk",
        remediation: [],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    }

    // 4. Duplicate Entries Check
    if (duplicates.length > 0) {
      const sample = duplicates.slice(0, 3).map((d) => sanitizePath(d));
      results.push({
        id: "path-duplicate-entries",
        category: "path",
        title: "Duplicate PATH Entries",
        status: "warning",
        severity: "low",
        summary: `Detected ${duplicates.length} duplicate directory entry in PATH`,
        expected: "Each directory occurs once in PATH",
        actual: `${duplicates.length} duplicate(s): ${sample.join(", ")}`,
        remediation: [
          "Deduplicate entries in your shell profile or system environment variables to speed up command lookups",
        ],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    } else {
      results.push({
        id: "path-duplicate-entries",
        category: "path",
        title: "Duplicate PATH Entries",
        status: "passed",
        severity: "info",
        summary: "No duplicate directories found in PATH",
        remediation: [],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    }

    return results;
  },
};
