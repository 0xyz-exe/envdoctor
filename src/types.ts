import { z } from "zod";

export const DiagnosticSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);
export type DiagnosticSeverity = z.infer<typeof DiagnosticSeveritySchema>;

export const DiagnosticStatusSchema = z.enum([
  "passed",
  "warning",
  "failed",
  "skipped",
  "unknown",
]);
export type DiagnosticStatus = z.infer<typeof DiagnosticStatusSchema>;

export const DiagnosticCategorySchema = z.enum([
  "system",
  "runtime",
  "path",
  "environment",
  "project",
  "git",
  "docker",
  "ports",
  "network",
]);
export type DiagnosticCategory = z.infer<typeof DiagnosticCategorySchema>;

export const DiagnosticResultSchema = z.object({
  id: z.string(),
  category: DiagnosticCategorySchema,
  title: z.string(),
  status: DiagnosticStatusSchema,
  severity: DiagnosticSeveritySchema,
  summary: z.string(),
  details: z.string().optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
  remediation: z.array(z.string()).default([]),
  documentationUrl: z.string().optional(),
  durationMs: z.number().nonnegative(),
  detectedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type DiagnosticResult = z.infer<typeof DiagnosticResultSchema>;

export interface DiagnosticContext {
  projectRoot: string;
  platform: NodeJS.Platform;
  timeoutMs: number;
  signal?: AbortSignal;
  categories?: DiagnosticCategory[];
  strict?: boolean;
  portsToCheck?: number[];
  customRules?: Record<string, unknown>;
}

export interface DiagnosticPlugin {
  id: string;
  name: string;
  category: DiagnosticCategory;
  description: string;
  run(context: DiagnosticContext): Promise<DiagnosticResult[]>;
}

export interface HealthScore {
  score: number; // 0 to 100
  rating: "excellent" | "good" | "fair" | "poor" | "critical";
  total: number;
  passed: number;
  warning: number;
  failed: number;
  skipped: number;
  criticalIssues: number;
}

export interface ScanReport {
  version: string;
  scannedAt: string;
  projectRoot: string;
  platform: string;
  arch: string;
  health: HealthScore;
  results: DiagnosticResult[];
  categories: Record<
    string,
    {
      total: number;
      passed: number;
      warning: number;
      failed: number;
    }
  >;
}
