# Changelog

All notable changes to **EnvDoctor** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-28

### Added
- Core modular diagnostic scheduler with concurrency control and timeout management.
- System diagnostics (OS platform, CPU architecture, memory thresholds, default shell).
- Runtime diagnostics (Node.js, npm, pnpm, Git, Python, Docker CLI, PHP, Go, Cargo).
- PATH validation (empty segments, non-existent directories, duplicate entries).
- Environment variable parity inspector with automatic secret redaction.
- Project manifest & lockfile consistency checker (Node, Python, PHP, Rust, Go, Docker).
- Git repository state inspection (branch, dirty status, author identity).
- Docker and Docker Compose availability and daemon status verification.
- Local development port conflict scanner with non-blocking TCP socket probes.
- ANSI-colored terminal reporter, machine-readable JSON reporter, and GitHub Markdown reporter.
- Interactive embedded local web dashboard server with dark mode and export previews.
- GitHub Actions CI workflow supporting Ubuntu, Windows, and macOS test matrix.
