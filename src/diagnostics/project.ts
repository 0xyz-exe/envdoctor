import fs from "node:fs";
import path from "node:path";
import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "../types.js";

export const projectPlugin: DiagnosticPlugin = {
  id: "plugin-project",
  name: "Project Configuration Inspector",
  category: "project",
  description: "Detects project ecosystem, validates manifest syntax, lockfiles, and configuration files.",
  async run(context: DiagnosticContext): Promise<DiagnosticResult[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];
    const root = context.projectRoot;

    // Detect ecosystems
    const ecosystems: string[] = [];
    const hasPkgJson = fs.existsSync(path.join(root, "package.json"));
    const hasPyProject =
      fs.existsSync(path.join(root, "pyproject.toml")) ||
      fs.existsSync(path.join(root, "requirements.txt"));
    const hasComposer = fs.existsSync(path.join(root, "composer.json"));
    const hasCargo = fs.existsSync(path.join(root, "Cargo.toml"));
    const hasGoMod = fs.existsSync(path.join(root, "go.mod"));
    const hasDocker =
      fs.existsSync(path.join(root, "Dockerfile")) ||
      fs.existsSync(path.join(root, "compose.yaml")) ||
      fs.existsSync(path.join(root, "docker-compose.yml"));

    if (hasPkgJson) ecosystems.push("Node.js/JavaScript");
    if (hasPyProject) ecosystems.push("Python");
    if (hasComposer) ecosystems.push("PHP");
    if (hasCargo) ecosystems.push("Rust");
    if (hasGoMod) ecosystems.push("Go");
    if (hasDocker) ecosystems.push("Docker Containerized");

    const durationMs = Date.now() - startTime;

    results.push({
      id: "project-ecosystem-detection",
      category: "project",
      title: "Project Ecosystem Detection",
      status: "passed",
      severity: "info",
      summary:
        ecosystems.length > 0
          ? `Detected stack: ${ecosystems.join(", ")}`
          : "Generic project (no standard manifest detected)",
      actual: ecosystems.join(", ") || "Generic",
      remediation: [],
      durationMs,
      detectedAt: new Date().toISOString(),
      metadata: { ecosystems },
    });

    // Node.js specific validations
    if (hasPkgJson) {
      const pkgPath = path.join(root, "package.json");
      let pkgValid = false;
      let pkgData: Record<string, unknown> = {};

      try {
        const raw = fs.readFileSync(pkgPath, "utf-8");
        pkgData = JSON.parse(raw);
        pkgValid = true;

        results.push({
          id: "project-package-json-valid",
          category: "project",
          title: "package.json Syntax",
          status: "passed",
          severity: "info",
          summary: `Valid JSON with package name '${pkgData.name || "unnamed"}'`,
          remediation: [],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          id: "project-package-json-valid",
          category: "project",
          title: "package.json Syntax Error",
          status: "failed",
          severity: "critical",
          summary: `Invalid JSON syntax in package.json: ${msg}`,
          remediation: ["Fix JSON syntax error in package.json using a linter or validator"],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      }

      // Check lockfile consistency
      const hasNpmLock = fs.existsSync(path.join(root, "package-lock.json"));
      const hasYarnLock = fs.existsSync(path.join(root, "yarn.lock"));
      const hasPnpmLock = fs.existsSync(path.join(root, "pnpm-lock.yaml"));

      const lockCount = [hasNpmLock, hasYarnLock, hasPnpmLock].filter(Boolean).length;

      if (lockCount > 1) {
        const found = [
          hasNpmLock && "package-lock.json",
          hasYarnLock && "yarn.lock",
          hasPnpmLock && "pnpm-lock.yaml",
        ].filter(Boolean);

        results.push({
          id: "project-lockfile-conflict",
          category: "project",
          title: "Conflicting Package Lockfiles",
          status: "warning",
          severity: "medium",
          summary: `Multiple lockfiles detected: ${found.join(", ")}`,
          expected: "Single canonical lockfile for the team's chosen package manager",
          actual: found.join(", "),
          remediation: [
            "Retain only the lockfile corresponding to your team's designated package manager (npm, yarn, or pnpm)",
            "Remove redundant lockfiles to prevent divergent dependency resolution",
          ],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      } else if (lockCount === 1) {
        results.push({
          id: "project-lockfile-consistency",
          category: "project",
          title: "Package Lockfile Presence",
          status: "passed",
          severity: "info",
          summary: `Canonical lockfile detected (${hasPnpmLock ? "pnpm-lock.yaml" : hasNpmLock ? "package-lock.json" : "yarn.lock"})`,
          remediation: [],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      } else {
        results.push({
          id: "project-lockfile-consistency",
          category: "project",
          title: "Missing Lockfile",
          status: "warning",
          severity: "medium",
          summary: "No package manager lockfile found (package-lock.json, pnpm-lock.yaml, yarn.lock)",
          expected: "Committed lockfile for reproducible builds",
          actual: "Missing lockfile",
          remediation: [
            "Run your package manager install command (pnpm install / npm install) and commit the generated lockfile",
          ],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      }

      // node_modules existence
      const hasNodeModules = fs.existsSync(path.join(root, "node_modules"));
      results.push({
        id: "project-node-modules",
        category: "project",
        title: "node_modules Dependency Directory",
        status: hasNodeModules ? "passed" : "warning",
        severity: hasNodeModules ? "info" : "medium",
        summary: hasNodeModules
          ? "node_modules directory is present"
          : "node_modules directory is missing (dependencies not installed)",
        actual: hasNodeModules ? "Present" : "Missing",
        remediation: hasNodeModules
          ? []
          : ["Run 'pnpm install' or 'npm install' to install dependencies before development"],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    }

    // Gitignore check
    const hasGitignore = fs.existsSync(path.join(root, ".gitignore"));
    results.push({
      id: "project-gitignore",
      category: "project",
      title: ".gitignore File Presence",
      status: hasGitignore ? "passed" : "warning",
      severity: hasGitignore ? "info" : "low",
      summary: hasGitignore
        ? ".gitignore file is present"
        : ".gitignore file is missing from project root",
      actual: hasGitignore ? "Present" : "Missing",
      remediation: hasGitignore
        ? []
        : ["Create a .gitignore file to prevent committing node_modules, .env, and build artifacts"],
      durationMs,
      detectedAt: new Date().toISOString(),
    });

    return results;
  },
};
