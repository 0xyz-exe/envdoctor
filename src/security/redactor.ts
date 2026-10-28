/**
 * Secret redactor and path sanitizer for EnvDoctor.
 * Ensures zero secret leakage in logs, reports, and UI.
 */

const SENSITIVE_KEY_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /passwd/i,
  /private[_-]?key/i,
  /jwt/i,
  /bearer/i,
  /credential/i,
  /db[_-]?pass/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /aws[_-]?secret/i,
  /session[_-]?secret/i,
];

const SECRET_VALUE_REGEXES = [
  // OpenAI / standard API key
  /\bsk-[a-zA-Z0-9_-]{20,}\b/g,
  // GitHub PAT
  /\bghp_[a-zA-Z0-9]{36}\b/g,
  // GitHub fine-grained PAT
  /\bgithub_pat_[a-zA-Z0-9_]{40,}\b/g,
  // AWS Access Key ID
  /\bAKIA[0-9A-Z]{16}\b/g,
  // Generic Bearer Token
  /\bBearer\s+[a-zA-Z0-9_\-\.]{20,}\b/gi,
  // Private Key Block
  /-----BEGIN\s+[A-Z\s]+PRIVATE\s+KEY-----[\s\S]*?-----END\s+[A-Z\s]+PRIVATE\s+KEY-----/g,
  // Database URL credentials e.g. postgres://user:pass@host
  /([a-z]+:\/\/[^:]+:)([^@]+)(@)/gi,
];

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

export function redactString(text: string): string {
  if (!text || typeof text !== "string") return text;
  let redacted = text;

  // DB URL credentials
  redacted = redacted.replace(
    /([a-zA-Z0-9+.-]+:\/\/[^:\s]+:)([^@\s]+)(@)/g,
    "$1[REDACTED_SECRET]$3"
  );

  for (const regex of SECRET_VALUE_REGEXES) {
    if (regex.source.includes("-----BEGIN")) {
      redacted = redacted.replace(regex, "[REDACTED_PRIVATE_KEY]");
    } else if (regex.source.includes("Bearer")) {
      redacted = redacted.replace(regex, "Bearer [REDACTED_TOKEN]");
    } else {
      redacted = redacted.replace(regex, "[REDACTED_SECRET]");
    }
  }

  return redacted;
}

export function sanitizePath(inputPath: string, homeDir?: string): string {
  if (!inputPath) return "";
  const home = homeDir || process.env.HOME || process.env.USERPROFILE || "";
  let clean = inputPath.replace(/\\/g, "/");
  if (home) {
    const cleanHome = home.replace(/\\/g, "/");
    if (clean.startsWith(cleanHome)) {
      clean = "~" + clean.slice(cleanHome.length);
    }
  }
  return clean;
}

export function deepRedact<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (typeof input === "string") {
    return redactString(input) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => deepRedact(item)) as unknown as T;
  }
  if (typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (isSensitiveKey(k)) {
        result[k] = "[REDACTED_CONFIGURED]";
      } else {
        result[k] = deepRedact(v);
      }
    }
    return result as T;
  }
  return input;
}
