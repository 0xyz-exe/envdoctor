# Contributing to EnvDoctor

Thank you for your interest in contributing to **EnvDoctor**!

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/0xyz-exe/envdoctor.git
   cd envdoctor
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the project:
   ```bash
   pnpm run build
   ```

4. Run tests:
   ```bash
   pnpm run test
   ```

5. Run typecheck:
   ```bash
   pnpm run typecheck
   ```

## Creating a Plugin

Built-in and custom plugins implement the `DiagnosticPlugin` interface:

```typescript
import type { DiagnosticContext, DiagnosticPlugin, DiagnosticResult } from "envdoctor";

export const customPlugin: DiagnosticPlugin = {
  id: "plugin-custom",
  name: "Custom Diagnostic",
  category: "project",
  description: "Verifies custom configuration",
  async run(context: DiagnosticContext): Promise<DiagnosticResult[]> {
    return [{
      id: "custom-check-1",
      category: "project",
      title: "Custom Check",
      status: "passed",
      severity: "info",
      summary: "Everything looks good",
      remediation: [],
      durationMs: 5,
      detectedAt: new Date().toISOString(),
    }];
  }
};
```

## Pull Request Guidelines

- Ensure tests pass with `pnpm run test`.
- Ensure typecheck passes with `pnpm run typecheck`.
- Follow secret-redaction requirements: never log or expose raw secrets in tests or diagnostics.
