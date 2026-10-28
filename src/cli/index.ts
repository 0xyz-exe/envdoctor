import path from "node:path";
import fs from "node:fs";
import { executeScan } from "../engine/scheduler.js";
import { systemPlugin } from "../diagnostics/system.js";
import { runtimesPlugin } from "../diagnostics/runtimes.js";
import { pathPlugin } from "../diagnostics/path.js";
import { envPlugin } from "../diagnostics/env.js";
import { projectPlugin } from "../diagnostics/project.js";
import { gitPlugin } from "../diagnostics/git.js";
import { dockerPlugin } from "../diagnostics/docker.js";
import { portsPlugin } from "../diagnostics/ports.js";
import { formatTerminalReport } from "../reporters/terminal.js";
import { formatJsonReport } from "../reporters/json.js";
import { formatMarkdownReport } from "../reporters/markdown.js";
import { createDashboardServer } from "../server/app.js";
import type { DiagnosticCategory, DiagnosticPlugin } from "../types.js";

const PLUGINS: DiagnosticPlugin[] = [
  systemPlugin,
  runtimesPlugin,
  pathPlugin,
  envPlugin,
  projectPlugin,
  gitPlugin,
  dockerPlugin,
  portsPlugin,
];

function printHelp(): void {
  console.log(`
🩺 EnvDoctor — Developer Environment Configuration Checker

USAGE:
  envdoctor <command> [options]

COMMANDS:
  scan                  Run comprehensive environment diagnostics (default)
  doctor                Full diagnostic scan with health evaluation
  check <tool>          Quick check for a specific tool (e.g., node, python, docker)
  ui, web               Launch the local interactive web dashboard
  report                Generate and print diagnostic report (table, json, or markdown)

OPTIONS:
  --project, -p <dir>   Target project directory (default: current directory)
  --category, -c <cat>  Filter by category (system, runtime, path, environment, project, git, docker, ports)
  --format, -f <fmt>    Output format: table (default), json, markdown
  --port <num>          Port to check or UI server port
  --strict              Treat warnings as failures (exit code 1)
  --timeout <ms>        Per-plugin execution timeout (default: 5000ms)
  --no-color            Disable terminal ANSI color codes
  --version, -v         Display current version
  --help, -h            Show this help reference

EXAMPLES:
  envdoctor scan
  envdoctor scan --project ./my-app --strict
  envdoctor scan --category runtime --format json
  envdoctor check python
  envdoctor ui --port 4173
`);
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  if (argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    return 0;
  }

  if (argv.includes("-v") || argv.includes("--version")) {
    console.log("envdoctor v1.0.0");
    return 0;
  }

  let command = "scan";
  let projectDir = process.cwd();
  let categoryFilter: DiagnosticCategory | undefined;
  let format: "table" | "json" | "markdown" = "table";
  let strict = false;
  let timeoutMs = 5000;
  let customPort: number | undefined;

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (["scan", "doctor", "ui", "web", "report", "check"].includes(arg) && i === 0) {
      command = arg;
      i++;
      continue;
    }

    if (arg === "--project" || arg === "-p") {
      projectDir = path.resolve(process.cwd(), argv[i + 1] || ".");
      i += 2;
    } else if (arg === "--category" || arg === "-c") {
      categoryFilter = argv[i + 1] as DiagnosticCategory;
      i += 2;
    } else if (arg === "--format" || arg === "-f") {
      const f = (argv[i + 1] || "table").toLowerCase();
      if (["table", "json", "markdown"].includes(f)) {
        format = f as "table" | "json" | "markdown";
      }
      i += 2;
    } else if (arg === "--port") {
      customPort = parseInt(argv[i + 1], 10);
      i += 2;
    } else if (arg === "--strict") {
      strict = true;
      i++;
    } else if (arg === "--timeout") {
      timeoutMs = parseInt(argv[i + 1], 10) || 5000;
      i += 2;
    } else {
      if (command === "check" && !categoryFilter) {
        // argument is tool name
        categoryFilter = "runtime";
      }
      i++;
    }
  }

  // Validate projectDir exists
  if (!fs.existsSync(projectDir)) {
    console.error(`Error: Project directory does not exist: ${projectDir}`);
    return 2;
  }

  if (command === "ui" || command === "web") {
    const serverPort = customPort || 4173;
    const serverInstance = createDashboardServer({
      projectRoot: projectDir,
      port: serverPort,
    });
    const info = await serverInstance.start(serverPort);
    console.log(`\n🩺 EnvDoctor Dashboard running at: ${info.url}`);
    console.log(`   Press Ctrl+C to stop.\n`);
    return 0;
  }

  const categories = categoryFilter ? [categoryFilter] : undefined;
  const portsToCheck = customPort ? [customPort] : undefined;

  try {
    const report = await executeScan(
      PLUGINS,
      {
        projectRoot: projectDir,
        platform: process.platform,
        timeoutMs,
        categories,
        portsToCheck,
      },
      { concurrency: 4 }
    );

    if (format === "json") {
      console.log(formatJsonReport(report));
    } else if (format === "markdown") {
      console.log(formatMarkdownReport(report));
    } else {
      console.log(formatTerminalReport(report));
    }

    if (report.health.failed > 0) return 1;
    if (strict && report.health.warning > 0) return 1;
    return 0;
  } catch (err: unknown) {
    console.error("Execution failed:", err instanceof Error ? err.message : String(err));
    return 3;
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes("cli")) {
  runCli().then((code) => {
    // Only exit if not ui/web
    if (!process.argv.includes("ui") && !process.argv.includes("web")) {
      process.exit(code);
    }
  });
}
