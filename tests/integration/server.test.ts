import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createDashboardServer } from "../../src/server/app.js";

describe("Dashboard Server Integration", () => {
  const instance = createDashboardServer({ projectRoot: process.cwd(), port: 0 });
  let serverUrl = "";

  beforeAll(async () => {
    const info = await instance.start(0);
    serverUrl = info.url;
  });

  afterAll(async () => {
    await instance.stop();
  });

  it("serves HTML dashboard on root GET /", async () => {
    const res = await fetch(`${serverUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("EnvDoctor");
    expect(html).toContain("score-circle");
  });

  it("returns scan JSON on GET /api/scan", async () => {
    const res = await fetch(`${serverUrl}/api/scan`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const data = (await res.json()) as { health: { score: number }; results: unknown[] };
    expect(data.health.score).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(data.results)).toBe(true);
  });

  it("exports Markdown on GET /api/export/markdown", async () => {
    const res = await fetch(`${serverUrl}/api/export/markdown`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const md = await res.text();
    expect(md).toContain("# 🩺 EnvDoctor Diagnostic Report");
  });
});
