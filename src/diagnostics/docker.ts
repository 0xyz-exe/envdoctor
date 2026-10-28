import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "../types.js";
import { safeExec } from "../utils/exec.js";

export const dockerPlugin: DiagnosticPlugin = {
  id: "plugin-docker",
  name: "Docker & Container Diagnostics",
  category: "docker",
  description: "Checks Docker CLI availability, daemon responsiveness, and Docker Compose.",
  async run(_context: DiagnosticContext): Promise<DiagnosticResult[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    // 1. Check Docker CLI
    const cliRes = await safeExec("docker", ["--version"], { timeoutMs: 3000 });
    const durationMs = Date.now() - startTime;

    if (!cliRes.available || cliRes.exitCode !== 0) {
      results.push({
        id: "docker-cli",
        category: "docker",
        title: "Docker CLI Availability",
        status: "warning",
        severity: "low",
        summary: "Docker CLI is not installed or not in PATH",
        expected: "Docker CLI binary",
        actual: "Not found",
        remediation: [
          "Install Docker Desktop or Docker Engine from https://docs.docker.com/get-docker/",
        ],
        documentationUrl: "https://docs.docker.com",
        durationMs,
        detectedAt: new Date().toISOString(),
      });
      return results;
    }

    results.push({
      id: "docker-cli",
      category: "docker",
      title: "Docker CLI Availability",
      status: "passed",
      severity: "info",
      summary: `Docker CLI is installed (${cliRes.stdout.trim()})`,
      actual: cliRes.stdout.trim(),
      remediation: [],
      documentationUrl: "https://docs.docker.com",
      durationMs,
      detectedAt: new Date().toISOString(),
    });

    // 2. Check Docker Daemon Connectivity
    const infoRes = await safeExec("docker", ["info", "--format", "{{.ServerVersion}}"], {
      timeoutMs: 4000,
    });

    if (infoRes.exitCode === 0 && infoRes.stdout.trim()) {
      results.push({
        id: "docker-daemon",
        category: "docker",
        title: "Docker Daemon Status",
        status: "passed",
        severity: "info",
        summary: `Docker daemon is active and responsive (Server version ${infoRes.stdout.trim()})`,
        actual: `Daemon active (v${infoRes.stdout.trim()})`,
        remediation: [],
        durationMs: Date.now() - startTime,
        detectedAt: new Date().toISOString(),
      });
    } else {
      results.push({
        id: "docker-daemon",
        category: "docker",
        title: "Docker Daemon Status",
        status: "warning",
        severity: "medium",
        summary: "Docker CLI is installed but daemon is not running or not responding",
        expected: "Running Docker background daemon/service",
        actual: "Daemon unreachable",
        remediation: [
          "Start Docker Desktop or run: sudo systemctl start docker (on Linux)",
          "Verify user permissions: ensure current user is added to the docker group",
        ],
        documentationUrl: "https://docs.docker.com/config/daemon/",
        durationMs: Date.now() - startTime,
        detectedAt: new Date().toISOString(),
      });
    }

    // 3. Docker Compose check
    const composeRes = await safeExec("docker", ["compose", "version"], { timeoutMs: 3000 });
    if (composeRes.exitCode === 0) {
      results.push({
        id: "docker-compose",
        category: "docker",
        title: "Docker Compose Availability",
        status: "passed",
        severity: "info",
        summary: `Docker Compose plugin is available (${composeRes.stdout.trim()})`,
        actual: composeRes.stdout.trim(),
        remediation: [],
        durationMs: Date.now() - startTime,
        detectedAt: new Date().toISOString(),
      });
    } else {
      results.push({
        id: "docker-compose",
        category: "docker",
        title: "Docker Compose Availability",
        status: "warning",
        severity: "low",
        summary: "Docker Compose plugin is not available",
        expected: "Docker Compose CLI plugin",
        actual: "Not found",
        remediation: ["Install docker-compose-plugin or use Docker Desktop which bundles it"],
        durationMs: Date.now() - startTime,
        detectedAt: new Date().toISOString(),
      });
    }

    return results;
  },
};
