# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Principles in EnvDoctor

EnvDoctor follows strict security requirements:

1. **Zero Secret Leakage:** Diagnostic output and reports automatically redact API keys, JWTs, AWS credentials, database passwords, and auth tokens.
2. **Safe Subprocess Execution:** Commands are executed strictly via an allowlist with fixed argument arrays. Arbitrary shell strings and unescaped inputs are prohibited.
3. **Local-First & Read-Only:** EnvDoctor performs read-only checks by default. It does not modify system PATH, kill processes, or upload environment data to external servers.
4. **Path Sanitization:** User home directories are sanitized in exported reports to prevent accidental username or file structure leakage.

## Reporting a Vulnerability

If you discover a security vulnerability in EnvDoctor, please do not open a public issue. Instead, report it privately to the maintainer via GitHub Security Advisories or contact `danielachmadf@gmail.com`.
