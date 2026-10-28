import net from "node:net";
import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "../types.js";

function checkPort(port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let occupied = false;

    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      occupied = true;
      socket.destroy();
      resolve(true); // Port is occupied
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false); // Port connection timed out (likely free)
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false); // Port connection refused (free)
    });

    socket.connect(port, "127.0.0.1");
  });
}

export const portsPlugin: DiagnosticPlugin = {
  id: "plugin-ports",
  name: "Local Port Diagnostics",
  category: "ports",
  description: "Scans local ports for occupancy and potential conflicts with common development services.",
  async run(context: DiagnosticContext): Promise<DiagnosticResult[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];

    const defaultPorts = [3000, 5173, 8000, 8080, 5432, 3306];
    const portsToCheck = context.portsToCheck?.length ? context.portsToCheck : defaultPorts;

    const occupiedPorts: number[] = [];
    const availablePorts: number[] = [];

    await Promise.all(
      portsToCheck.map(async (port) => {
        const isOccupied = await checkPort(port);
        if (isOccupied) {
          occupiedPorts.push(port);
        } else {
          availablePorts.push(port);
        }
      })
    );

    const durationMs = Date.now() - startTime;

    if (occupiedPorts.length > 0) {
      results.push({
        id: "ports-occupied",
        category: "ports",
        title: "Occupied Development Ports",
        status: "warning",
        severity: "low",
        summary: `Port(s) already in use: ${occupiedPorts.sort((a, b) => a - b).join(", ")}`,
        expected: "Standard development ports available",
        actual: `Occupied: ${occupiedPorts.join(", ")}`,
        remediation: [
          `To find the process using a port on Windows: netstat -ano | findstr :<port>`,
          `To inspect on Linux/macOS: lsof -i :<port>`,
          "Configure your project server to use an alternative port if conflict occurs",
        ],
        durationMs,
        detectedAt: new Date().toISOString(),
        metadata: {
          occupied: occupiedPorts,
          available: availablePorts,
        },
      });
    } else {
      results.push({
        id: "ports-occupied",
        category: "ports",
        title: "Development Port Availability",
        status: "passed",
        severity: "info",
        summary: `All checked ports (${portsToCheck.join(", ")}) are available on localhost`,
        actual: "All ports free",
        remediation: [],
        durationMs,
        detectedAt: new Date().toISOString(),
      });
    }

    return results;
  },
};
