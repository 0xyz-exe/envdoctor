import type { DiagnosticCategory, DiagnosticPlugin } from "../types.js";

export class DiagnosticRegistry {
  private plugins = new Map<string, DiagnosticPlugin>();

  register(plugin: DiagnosticPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id '${plugin.id}' is already registered.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  get(id: string): DiagnosticPlugin | undefined {
    return this.plugins.get(id);
  }

  list(): DiagnosticPlugin[] {
    return Array.from(this.plugins.values());
  }

  getByCategory(category: DiagnosticCategory): DiagnosticPlugin[] {
    return this.list().filter((p) => p.category === category);
  }
}
