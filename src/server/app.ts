import http from "node:http";
import { executeScan } from "../engine/scheduler.js";
import { systemPlugin } from "../diagnostics/system.js";
import { runtimesPlugin } from "../diagnostics/runtimes.js";
import { pathPlugin } from "../diagnostics/path.js";
import { envPlugin } from "../diagnostics/env.js";
import { projectPlugin } from "../diagnostics/project.js";
import { gitPlugin } from "../diagnostics/git.js";
import { dockerPlugin } from "../diagnostics/docker.js";
import { portsPlugin } from "../diagnostics/ports.js";
import { formatJsonReport } from "../reporters/json.js";
import { formatMarkdownReport } from "../reporters/markdown.js";
import { getDashboardHtml } from "./ui.js";
import type { DiagnosticPlugin, ScanReport } from "../types.js";

const DEFAULT_PLUGINS: DiagnosticPlugin[] = [
  systemPlugin,
  runtimesPlugin,
  pathPlugin,
  envPlugin,
  projectPlugin,
  gitPlugin,
  dockerPlugin,
  portsPlugin,
];

export interface ServerOptions {
  port?: number;
  projectRoot?: string;
}

export function createDashboardServer(options: ServerOptions = {}): {
  server: http.Server;
  start(port?: number): Promise<{ port: number; url: string }>;
  stop(): Promise<void>;
} {
  const projectRoot = options.projectRoot || process.cwd();
  let lastReport: ScanReport | null = null;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");

    if (url.pathname === "/" && req.method === "GET") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.writeHead(200);
      res.end(getDashboardHtml());
      return;
    }

    if (url.pathname === "/api/scan" && req.method === "GET") {
      try {
        const report = await executeScan(DEFAULT_PLUGINS, {
          projectRoot,
          platform: process.platform,
          timeoutMs: 5000,
        });
        lastReport = report;
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(formatJsonReport(report));
      } catch (err: unknown) {
        res.setHeader("Content-Type", "application/json");
        res.writeHead(500);
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
      }
      return;
    }

    if (url.pathname === "/api/export/markdown" && req.method === "GET") {
      if (!lastReport) {
        lastReport = await executeScan(DEFAULT_PLUGINS, {
          projectRoot,
          platform: process.platform,
          timeoutMs: 5000,
        });
      }
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.writeHead(200);
      res.end(formatMarkdownReport(lastReport));
      return;
    }

    if (url.pathname === "/api/export/json" && req.method === "GET") {
      if (!lastReport) {
        lastReport = await executeScan(DEFAULT_PLUGINS, {
          projectRoot,
          platform: process.platform,
          timeoutMs: 5000,
        });
      }
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(formatJsonReport(lastReport));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  return {
    server,
    start(targetPort?: number): Promise<{ port: number; url: string }> {
      const port = targetPort || options.port || 4173;
      return new Promise((resolve, reject) => {
        server.listen(port, "127.0.0.1", () => {
          const addr = server.address();
          const actualPort = typeof addr === "object" && addr ? addr.port : port;
          resolve({
            port: actualPort,
            url: `http://127.0.0.1:${actualPort}`,
          });
        });
        server.on("error", (err) => reject(err));
      });
    },
    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}
