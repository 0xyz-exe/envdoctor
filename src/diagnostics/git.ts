import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "../types.js";
import { safeExec } from "../utils/exec.js";

export const gitPlugin: DiagnosticPlugin = {
  id: "plugin-git",
  name: "Git Repository & Identity Inspector",
  category: "git",
  description: "Inspects Git repository state, user identity configuration, active branch, and untracked changes.",
  async run(context: DiagnosticContext): Promise<DiagnosticResult[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];
    const root = context.projectRoot;

    // 1. Git command availability
    const gitVersionRes = await safeExec("git", ["--version"]);
    const durationMs = Date.now() - startTime;

    if (!gitVersionRes.available || gitVersionRes.exitCode !== 0) {
      results.push({
        id: "git-cli-available",
        category: "git",
        title: "Git CLI Availability",
        status: "failed",
        severity: "high",
        summary: "Git CLI is not installed or not in PATH",
        expected: "Installed Git command line utility",
        actual: "Not found",
        remediation: [
          "Install Git from https://git-scm.com/downloads",
          "Ensure Git binary path is included in system PATH",
        ],
        documentationUrl: "https://git-scm.com",
        durationMs,
        detectedAt: new Date().toISOString(),
      });
      return results;
    }

    // 2. Check if inside work tree
    const insideTreeRes = await safeExec("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root });
    const isRepo = insideTreeRes.available && insideTreeRes.stdout.trim() === "true";

    if (!isRepo) {
      results.push({
        id: "git-repo-status",
        category: "git",
        title: "Git Repository Status",
        status: "warning",
        severity: "low",
        summary: "Current directory is not a Git repository",
        expected: "Initialized Git repository",
        actual: "Not a git repository",
        remediation: [
          "Initialize Git repository: git init",
        ],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
      return results;
    }

    results.push({
      id: "git-repo-status",
      category: "git",
      title: "Git Repository Status",
      status: "passed",
      severity: "info",
      summary: "Valid Git repository detected",
      actual: "Initialized work tree",
      remediation: [],
      durationMs,
      detectedAt: new Date().toISOString(),
    });

    // 3. User Identity Check (user.name and user.email)
    const userNameRes = await safeExec("git", ["config", "user.name"], { cwd: root });
    const userEmailRes = await safeExec("git", ["config", "user.email"], { cwd: root });
    const name = userNameRes.stdout.trim();
    const email = userEmailRes.stdout.trim();

    if (!name || !email) {
      results.push({
        id: "git-user-identity",
        category: "git",
        title: "Git Author Identity",
        status: "warning",
        severity: "medium",
        summary: `Git identity incomplete: ${!name ? "user.name missing" : ""} ${!email ? "user.email missing" : ""}`.trim(),
        expected: "user.name and user.email configured",
        actual: `name: '${name || "<empty>"}', email: '${email || "<empty>"}'`,
        remediation: [
          'Configure name: git config --global user.name "Your Name"',
          'Configure email: git config --global user.email "your.email@example.com"',
        ],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    } else {
      results.push({
        id: "git-user-identity",
        category: "git",
        title: "Git Author Identity",
        status: "passed",
        severity: "info",
        summary: `Author identity configured for '${name}' <${email}>`,
        actual: `${name} <${email}>`,
        remediation: [],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    }

    // 4. Branch & Detached HEAD Check
    const branchRes = await safeExec("git", ["branch", "--show-current"], { cwd: root });
    const currentBranch = branchRes.stdout.trim();

    if (!currentBranch) {
      // Possible detached HEAD or empty repo
      const headRes = await safeExec("git", ["rev-parse", "--short", "HEAD"], { cwd: root });
      if (headRes.exitCode === 0) {
        results.push({
          id: "git-branch-state",
          category: "git",
          title: "Git Detached HEAD State",
          status: "warning",
          severity: "medium",
          summary: `Repository is in detached HEAD state at commit ${headRes.stdout.trim()}`,
          expected: "Active named branch (e.g. main or feature-branch)",
          actual: `Detached at ${headRes.stdout.trim()}`,
          remediation: [
            "Switch back to a named branch: git checkout main",
            "Or create a branch from current commit: git checkout -b fix-branch",
          ],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      } else {
        results.push({
          id: "git-branch-state",
          category: "git",
          title: "Git Initial Repository State",
          status: "passed",
          severity: "info",
          summary: "Newly initialized Git repository (initial commit pending)",
          remediation: [],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      }
    } else {
      results.push({
        id: "git-branch-state",
        category: "git",
        title: "Active Git Branch",
        status: "passed",
        severity: "info",
        summary: `On branch '${currentBranch}'`,
        actual: currentBranch,
        remediation: [],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    }

    // 5. Working Tree Dirty State
    const statusRes = await safeExec("git", ["status", "--porcelain"], { cwd: root });
    if (statusRes.exitCode === 0) {
      const changes = statusRes.stdout.split("\n").filter((l) => l.trim().length > 0);
      if (changes.length > 0) {
        results.push({
          id: "git-working-tree",
          category: "git",
          title: "Uncommitted Changes",
          status: "passed",
          severity: "info",
          summary: `${changes.length} uncommitted change(s) in working tree`,
          actual: `${changes.length} modified/untracked files`,
          remediation: [],
          durationMs,
          detectedAt: new Date().toISOString(),
          metadata: { modifiedCount: changes.length },
        });
      } else {
        results.push({
          id: "git-working-tree",
          category: "git",
          title: "Clean Working Tree",
          status: "passed",
          severity: "info",
          summary: "Working tree clean, no uncommitted changes",
          remediation: [],
          durationMs,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  },
};
