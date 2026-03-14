import { execFile } from "child_process";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 15000;

interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
}

async function runWithTimeout(
  cmd: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await Promise.race([
      execFileAsync(cmd, args, { cwd, maxBuffer: 2 * 1024 * 1024 }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Execution timed out after 15 seconds")), TIMEOUT_MS)
      ),
    ]);
    return result as { stdout: string; stderr: string };
  } catch (err: any) {
    if (err.stdout !== undefined || err.stderr !== undefined) {
      return { stdout: err.stdout || "", stderr: err.stderr || err.message || "" };
    }
    throw err;
  }
}

function sanitizeCode(code: string): string {
  return code
    .replace(/`/g, "")
    .replace(/\$\(/g, "")
    .replace(/\$\{/g, "");
}

function extractJavaClassName(code: string): string {
  const match = code.match(/public\s+class\s+(\w+)/);
  return match ? match[1] : "Main";
}

export async function executeCode(
  language: string,
  code: string
): Promise<ExecutionResult> {
  const safeCode = sanitizeCode(code);
  const workDir = join(tmpdir(), `exec_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  try {
    await mkdir(workDir, { recursive: true });

    if (language === "python") {
      const filePath = join(workDir, "main.py");
      await writeFile(filePath, safeCode, "utf-8");
      try {
        const { stdout, stderr } = await runWithTimeout("python3", ["main.py"], workDir);
        return { output: stdout, error: stderr, exitCode: stderr ? 1 : 0 };
      } catch (err: any) {
        return { output: "", error: err.message || String(err), exitCode: 1 };
      }
    }

    if (language === "java") {
      const className = extractJavaClassName(safeCode);
      const fileName = `${className}.java`;
      const filePath = join(workDir, fileName);
      await writeFile(filePath, safeCode, "utf-8");
      try {
        const compileResult = await runWithTimeout("javac", [fileName], workDir);
        if (compileResult.stderr && compileResult.stderr.includes("error:")) {
          return { output: "", error: compileResult.stderr, exitCode: 1 };
        }
        const { stdout, stderr } = await runWithTimeout("java", [className], workDir);
        return { output: stdout, error: stderr, exitCode: stderr ? 1 : 0 };
      } catch (err: any) {
        return { output: "", error: err.message || String(err), exitCode: 1 };
      }
    }

    if (language === "javascript") {
      const filePath = join(workDir, "main.js");
      await writeFile(filePath, safeCode, "utf-8");
      try {
        const { stdout, stderr } = await runWithTimeout("node", ["main.js"], workDir);
        return { output: stdout, error: stderr, exitCode: stderr ? 1 : 0 };
      } catch (err: any) {
        return { output: "", error: err.message || String(err), exitCode: 1 };
      }
    }

    if (language === "typescript") {
      const filePath = join(workDir, "main.ts");
      await writeFile(filePath, safeCode, "utf-8");
      try {
        const { stdout, stderr } = await runWithTimeout(
          "node",
          ["--experimental-strip-types", "main.ts"],
          workDir
        );
        return { output: stdout, error: stderr, exitCode: stderr ? 1 : 0 };
      } catch (err: any) {
        return { output: "", error: err.message || String(err), exitCode: 1 };
      }
    }

    if (language === "cpp") {
      const filePath = join(workDir, "main.cpp");
      await writeFile(filePath, safeCode, "utf-8");
      try {
        const compileResult = await runWithTimeout("g++", ["main.cpp", "-o", "main", "-std=c++17"], workDir);
        if (compileResult.stderr) {
          return { output: "", error: compileResult.stderr, exitCode: 1 };
        }
        const { stdout, stderr } = await runWithTimeout("./main", [], workDir);
        return { output: stdout, error: stderr, exitCode: stderr ? 1 : 0 };
      } catch (err: any) {
        return { output: "", error: err.message || String(err), exitCode: 1 };
      }
    }

    if (language === "c") {
      const filePath = join(workDir, "main.c");
      await writeFile(filePath, safeCode, "utf-8");
      try {
        const compileResult = await runWithTimeout("gcc", ["main.c", "-o", "main"], workDir);
        if (compileResult.stderr) {
          return { output: "", error: compileResult.stderr, exitCode: 1 };
        }
        const { stdout, stderr } = await runWithTimeout("./main", [], workDir);
        return { output: stdout, error: stderr, exitCode: stderr ? 1 : 0 };
      } catch (err: any) {
        return { output: "", error: err.message || String(err), exitCode: 1 };
      }
    }

    return { output: "", error: `Unsupported language: ${language}`, exitCode: 1 };
  } finally {
    try {
      await rm(workDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
