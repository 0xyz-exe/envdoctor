import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "../types.js";
import { safeExec } from "../utils/exec.js";

interface RuntimeDefinition {
  id: string;
  name: string;
  commands: string[];
  versionArgs: string[];
  versionRegex: RegExp;
  category: "essential" | "standard" | "optional";
  installDocs: string;
}

const RUNTIMES: RuntimeDefinition[] = [
  {
    id: "runtime-node",
    name: "Node.js",
    commands: ["node"],
    versionArgs: ["-v"],
    versionRegex: /v?(\d+\.\d+\.\d+)/,
    category: "essential",
    installDocs: "https://nodejs.org",
  },
  {
    id: "runtime-npm",
    name: "npm",
    commands: ["npm"],
    versionArgs: ["-v"],
    versionRegex: /(\d+\.\d+\.\d+)/,
    category: "essential",
    installDocs: "https://docs.npmjs.com",
  },
  {
    id: "runtime-pnpm",
    name: "pnpm",
    commands: ["pnpm"],
    versionArgs: ["-v"],
    versionRegex: /(\d+\.\d+\.\d+)/,
    category: "standard",
    installDocs: "https://pnpm.io",
  },
  {
    id: "runtime-git",
    name: "Git",
    commands: ["git"],
    versionArgs: ["--version"],
    versionRegex: /git version (\d+\.\d+\.\d+)/,
    category: "essential",
    installDocs: "https://git-scm.com",
  },
  {
    id: "runtime-python",
    name: "Python",
    commands: ["python", "python3"],
    versionArgs: ["--version"],
    versionRegex: /Python (\d+\.\d+\.\d+)/i,
    category: "standard",
    installDocs: "https://www.python.org",
  },
  {
    id: "runtime-docker",
    name: "Docker CLI",
    commands: ["docker"],
    versionArgs: ["--version"],
    versionRegex: /Docker version (\d+\.\d+\.\d+)/i,
    category: "standard",
    installDocs: "https://docs.docker.com",
  },
  {
    id: "runtime-cargo",
    name: "Cargo (Rust)",
    commands: ["cargo"],
    versionArgs: ["--version"],
    versionRegex: /cargo (\d+\.\d+\.\d+)/i,
    category: "optional",
    installDocs: "https://rustup.rs",
  },
  {
    id: "runtime-go",
    name: "Go",
    commands: ["go"],
    versionArgs: ["version"],
    versionRegex: /go version go(\d+\.\d+\.\d+)/i,
    category: "optional",
    installDocs: "https://golang.org",
  },
  {
    id: "runtime-php",
    name: "PHP",
    commands: ["php"],
    versionArgs: ["-v"],
    versionRegex: /PHP (\d+\.\d+\.\d+)/i,
    category: "optional",
    installDocs: "https://www.php.net",
  },
];

export const runtimesPlugin: DiagnosticPlugin = {
  id: "plugin-runtimes",
  name: "Developer Runtimes",
  category: "runtime",
  description: "Detects installed programming language runtimes, package managers, and developer CLIs.",
  async run(_context: DiagnosticContext): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    for (const rt of RUNTIMES) {
      const startTime = Date.now();
      let detectedVersion: string | null = null;
      let usedCommand: string | null = null;

      for (const cmd of rt.commands) {
        const res = await safeExec(cmd, rt.versionArgs, { timeoutMs: 3000 });
        if (res.available && res.exitCode === 0) {
          const combined = `${res.stdout} ${res.stderr}`;
          const match = combined.match(rt.versionRegex);
          if (match && match[1]) {
            detectedVersion = match[1];
            usedCommand = cmd;
            break;
          }
        }
      }

      const durationMs = Date.now() - startTime;

      if (detectedVersion) {
        results.push({
          id: rt.id,
          category: "runtime",
          title: `${rt.name} Runtime`,
          status: "passed",
          severity: "info",
          summary: `${rt.name} is installed (${detectedVersion}) via '${usedCommand}'`,
          expected: "Installed and accessible in PATH",
          actual: detectedVersion,
          remediation: [],
          documentationUrl: rt.installDocs,
          durationMs,
          detectedAt: new Date().toISOString(),
          metadata: {
            command: usedCommand,
            version: detectedVersion,
            tier: rt.category,
          },
        });
      } else {
        const isEssential = rt.category === "essential";
        results.push({
          id: rt.id,
          category: "runtime",
          title: `${rt.name} Runtime`,
          status: isEssential ? "failed" : "warning",
          severity: isEssential ? "high" : "low",
          summary: `${rt.name} was not found in PATH`,
          expected: `Installed ${rt.name} executable`,
          actual: "Not installed or not in PATH",
          remediation: [
            `Install ${rt.name} from official documentation: ${rt.installDocs}`,
            `Ensure the directory containing ${rt.commands[0]} is added to your PATH environment variable`,
          ],
          documentationUrl: rt.installDocs,
          durationMs,
          detectedAt: new Date().toISOString(),
          metadata: {
            checkedCommands: rt.commands,
            tier: rt.category,
          },
        });
      }
    }

    return results;
  },
};
