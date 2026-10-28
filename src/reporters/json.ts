import type { ScanReport } from "../types.js";
import { deepRedact } from "../security/redactor.js";

export function formatJsonReport(report: ScanReport, pretty = true): string {
  const sanitized = deepRedact(report);
  return pretty ? JSON.stringify(sanitized, null, 2) : JSON.stringify(sanitized);
}
