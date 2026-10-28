import { describe, it, expect } from "vitest";
import {
  isSensitiveKey,
  redactString,
  sanitizePath,
  deepRedact,
} from "../../src/security/redactor.js";

describe("Security Redactor", () => {
  it("identifies sensitive keys", () => {
    expect(isSensitiveKey("API_KEY")).toBe(true);
    expect(isSensitiveKey("DATABASE_URL")).toBe(true);
    expect(isSensitiveKey("GITHUB_TOKEN")).toBe(true);
    expect(isSensitiveKey("JWT_SECRET")).toBe(true);
    expect(isSensitiveKey("AUTH_PASSWORD")).toBe(true);
    expect(isSensitiveKey("NODE_ENV")).toBe(false);
    expect(isSensitiveKey("PORT")).toBe(false);
  });

  it("redacts secret patterns in strings", () => {
    const rawApiKey = "Connecting with sk-proj-1234567890abcdef12345678 to api";
    expect(redactString(rawApiKey)).toContain("[REDACTED_SECRET]");
    expect(redactString(rawApiKey)).not.toContain("1234567890abcdef12345678");

    const rawGithubPat = "Using token ghp_123456789012345678901234567890123456 for git";
    expect(redactString(rawGithubPat)).toContain("[REDACTED_SECRET]");
    expect(redactString(rawGithubPat)).not.toContain("ghp_");

    const rawAwsKey = "Key AKIAIOSFODNN7EXAMPLE detected";
    expect(redactString(rawAwsKey)).toContain("[REDACTED_SECRET]");
    expect(redactString(rawAwsKey)).not.toContain("AKIAIOSFODNN7EXAMPLE");

    const rawDbUrl = "postgres://admin:super_secret_password_123@localhost:5432/mydb";
    expect(redactString(rawDbUrl)).toContain("[REDACTED_SECRET]");
    expect(redactString(rawDbUrl)).not.toContain("super_secret_password_123");
  });

  it("sanitizes user home path", () => {
    const home = "C:/Users/testuser";
    const input = "C:/Users/testuser/projects/envdoctor/src";
    expect(sanitizePath(input, home)).toBe("~/projects/envdoctor/src");
  });

  it("deeply redacts objects and sensitive keys", () => {
    const data = {
      name: "test-app",
      API_KEY: "secret123",
      nested: {
        DATABASE_URL: "postgres://u:p@localhost/db",
        safe: "hello",
      },
      list: ["sk-1234567890abcdef1234567890", "plain text"],
    };

    const redacted = deepRedact(data);
    expect(redacted.API_KEY).toBe("[REDACTED_CONFIGURED]");
    expect(redacted.nested.DATABASE_URL).toBe("[REDACTED_CONFIGURED]");
    expect(redacted.nested.safe).toBe("hello");
    expect(redacted.list[0]).toContain("[REDACTED_SECRET]");
  });
});
