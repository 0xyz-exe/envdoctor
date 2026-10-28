import fs from "node:fs";
import path from "node:path";
import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "../types.js";
import { isSensitiveKey } from "../security/redactor.js";

function parseEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      map.set(key, val);
    }
  }
  return map;
}

export const envPlugin: DiagnosticPlugin = {
  id: "plugin-env",
  name: "Environment Variables & .env Inspector",
  category: "environment",
  description: "Validates project .env configuration, compares against templates, and checks missing variables.",
  async run(context: DiagnosticContext): Promise<DiagnosticResult[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];
    const root = context.projectRoot;

    const envPath = path.join(root, ".env");
    const exampleCandidates = [
      path.join(root, ".env.example"),
      path.join(root, ".env.sample"),
      path.join(root, ".env.template"),
    ];

    const foundExamplePath = exampleCandidates.find((p) => fs.existsSync(p));
    const hasEnv = fs.existsSync(envPath);
    const durationMs = Date.now() - startTime;

    // 1. Template vs Live .env existence
    if (foundExamplePath && !hasEnv) {
      const exampleName = path.basename(foundExamplePath);
      results.push({
        id: "env-file-missing",
        category: "environment",
        title: ".env File Missing",
        status: "failed",
        severity: "high",
        summary: `Project has '${exampleName}' but no active '.env' file`,
        expected: "'.env' file copied from template and configured",
        actual: "Missing .env",
        remediation: [
          `Copy template: cp ${exampleName} .env`,
          "Fill in required development configuration values in .env",
        ],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
      return results;
    }

    if (!hasEnv && !foundExamplePath) {
      results.push({
        id: "env-file-none",
        category: "environment",
        title: "Environment Configuration Files",
        status: "passed",
        severity: "info",
        summary: "No .env or .env.example files declared in project root",
        remediation: [],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
      return results;
    }

    // Both or .env exists
    let envMap = new Map<string, string>();
    try {
      if (hasEnv) {
        const raw = fs.readFileSync(envPath, "utf-8");
        envMap = parseEnvFile(raw);
      }
    } catch {
      results.push({
        id: "env-read-error",
        category: "environment",
        title: ".env File Read Failure",
        status: "failed",
        severity: "high",
        summary: "Could not read .env file due to permissions or format error",
        remediation: ["Check read permissions for .env"],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
      return results;
    }

    results.push({
      id: "env-file-status",
      category: "environment",
      title: ".env Configuration Present",
      status: "passed",
      severity: "info",
      summary: `.env file configured with ${envMap.size} variables (secrets safely redacted)`,
      actual: `${envMap.size} variables parsed`,
      remediation: [],
      durationMs,
      detectedAt: new Date().toISOString(),
      metadata: {
        totalKeys: envMap.size,
        sensitiveKeysCount: Array.from(envMap.keys()).filter(isSensitiveKey).length,
      },
    });

    // 2. If example exists, check missing variables
    if (foundExamplePath && hasEnv) {
      const exampleRaw = fs.readFileSync(foundExamplePath, "utf-8");
      const exampleMap = parseEnvFile(exampleRaw);
      const missingKeys: string[] = [];
      const emptyKeys: string[] = [];

      for (const [key, exampleVal] of exampleMap.entries()) {
        if (!envMap.has(key)) {
          missingKeys.push(key);
        } else {
          const actualVal = envMap.get(key) || "";
          if (actualVal === "" && exampleVal !== "") {
            emptyKeys.push(key);
          }
        }
      }

      if (missingKeys.length > 0) {
        results.push({
          id: "env-keys-missing",
          category: "environment",
          title: "Missing Variables from .env",
          status: "warning",
          severity: "medium",
          summary: `${missingKeys.length} variable(s) found in ${path.basename(foundExamplePath)} are missing in .env`,
          expected: `All variables defined in ${path.basename(foundExamplePath)} exist in .env`,
          actual: `Missing: ${missingKeys.slice(0, 5).join(", ")}${missingKeys.length > 5 ? ` (+${missingKeys.length - 5} more)` : ""}`,
          remediation: [
            `Add the missing variables to .env: ${missingKeys.join(", ")}`,
          ],
          durationMs,
          detectedAt: new Date().toISOString(),
          metadata: { missingKeys },
        });
      } else {
        results.push({
          id: "env-keys-missing",
          category: "environment",
          title: "Environment Variables Parity",
          status: "passed",
          severity: "info",
          summary: "All variables from template are declared in .env",
          remediation: [],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      }

      if (emptyKeys.length > 0) {
        results.push({
          id: "env-keys-empty",
          category: "environment",
          title: "Empty Required Variables",
          status: "warning",
          severity: "low",
          summary: `${emptyKeys.length} variable(s) are empty in .env but defined in template`,
          actual: `Empty: ${emptyKeys.join(", ")}`,
          remediation: [
            `Configure valid values for: ${emptyKeys.join(", ")} in .env`,
          ],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  },
};
