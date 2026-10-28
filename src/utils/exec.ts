import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SafeExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  available: boolean;
  error?: string;
}

const ALLOWED_EXECUTABLES = new Set([
  "node",
  "npm",
  "pnpm",
  "yarn",
  "python",
  "python3",
  "pip",
  "pip3",
  "git",
  "docker",
  "docker-compose",
  "php",
  "composer",
  "go",
  "rustc",
  "cargo",
  "java",
  "javac",
  "wsl",
  "pwsh",
  "powershell",
]);

export async function safeExec(
  command: string,
  args: string[],
  options: { timeoutMs?: number; cwd?: string } = {}
): Promise<SafeExecResult> {
  const baseCmd = command.toLowerCase().replace(/\.exe$/i, "");
  if (!ALLOWED_EXECUTABLES.has(baseCmd)) {
    return {
      stdout: "",
      stderr: `Executable '${command}' is not in the security allowlist.`,
      exitCode: 1,
      available: false,
      error: `Executable '${command}' is not in the security allowlist.`,
    };
  }

  const timeout = options.timeoutMs ?? 3000;

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout,
      maxBuffer: 1024 * 512, // 512KB max
      cwd: options.cwd,
      windowsHide: true,
      shell: false,
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      available: true,
    };
  } catch (err: unknown) {
    const errorObj = err as {
      code?: string | number;
      message?: string;
      stdout?: string;
      stderr?: string;
    };

    // On Windows, Node disallows spawning .cmd/.bat files directly without cmd.exe wrapper
    if (process.platform === "win32" && (errorObj.code === "EINVAL" || errorObj.code === "ENOENT")) {
      try {
        const { stdout, stderr } = await execFileAsync(
          "cmd.exe",
          ["/d", "/s", "/c", command, ...args],
          {
            timeout,
            maxBuffer: 1024 * 512,
            cwd: options.cwd,
            windowsHide: true,
            shell: false,
          }
        );
        return {
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
          available: true,
        };
      } catch {
        // Fall through to not found
      }
    }

    if (errorObj.code === "ENOENT" || errorObj.code === "EINVAL") {
      return {
        stdout: "",
        stderr: "",
        exitCode: 127,
        available: false,
        error: "Command not found",
      };
    }

    return {
      stdout: (errorObj.stdout || "").trim(),
      stderr: (errorObj.stderr || "").trim(),
      exitCode: typeof errorObj.code === "number" ? errorObj.code : 1,
      available: true,
      error: errorObj.message || "Execution error",
    };
  }
}
