import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { toNearbyDiagnostic } from "../../src/features/nearby/service";

const root = process.cwd();

function read(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

function importedFiles(entry: string, seen = new Set<string>()): Set<string> {
  const absolute = resolve(root, entry);
  if (seen.has(absolute)) return seen;
  seen.add(absolute);

  const source = readFileSync(absolute, "utf8");
  for (const match of source.matchAll(/(?:import|export)\s+(?!type\s)(?:[^"']+?\s+from\s+)?["'](@\/[^"']+|\.\.?\/[^"']+)["']/g)) {
    const specifier = match[1];
    const base = specifier.startsWith("@/")
      ? resolve(root, "src", specifier.slice(2))
      : resolve(dirname(absolute), specifier);
    const candidate = [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts"), resolve(base, "index.tsx")]
      .find((path) => {
        try {
          readFileSync(path);
          return true;
        } catch {
          return false;
        }
      });
    if (candidate) importedFiles(candidate, seen);
  }
  return seen;
}

describe("deployment privacy boundaries", () => {
  it("keeps every client import graph away from server-only environment code", () => {
    const clientEntries = execFileSync("rg", ["-l", '^\"use client\"', "src"], { cwd: root, encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
    const reachable = clientEntries.flatMap((entry) => [...importedFiles(entry)]);
    expect(reachable.some((path) => path.endsWith("/src/lib/env/server.ts"))).toBe(false);
  });

  it("does not log nearby request bodies, coordinates, correction bodies or raw IPs", () => {
    for (const path of ["src/app/api/nearby/route.ts", "src/app/api/corrections/route.ts"]) {
      const source = read(path);
      expect(source).not.toMatch(/console\.|logger\.|log\s*\(/);
    }
    expect(read("src/app/api/corrections/route.ts")).not.toMatch(/rawIp|clientIp/);
  });

  it("reduces nearby failures to a safe stage and stable code", () => {
    const diagnostic = toNearbyDiagnostic(
      "persistence",
      Object.assign(new Error("coordinates=121.4,31.2 ip=203.0.113.1 key=secret-key"), { code: "23505" }),
    );

    expect(diagnostic).toEqual({ stage: "persistence", code: "23505" });
    expect(JSON.stringify(diagnostic)).not.toMatch(/121\.4|31\.2|203\.0\.113\.1|secret-key/);
  });

  it("keeps the environment template value-free", () => {
    const lines = read(".env.example").split("\n").filter((line) => line && !line.startsWith("#"));
    expect(lines).not.toHaveLength(0);
    for (const line of lines) expect(line).toMatch(/^[A-Z][A-Z0-9_]*=$/);
  });

  it("ignores local secrets and Vercel metadata", () => {
    const ignored = execFileSync("git", ["check-ignore", ".env.local", ".vercel/project.json"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(ignored).toContain(".env.local");
    expect(ignored).toContain(".vercel/project.json");
  });

  it("exposes the repeatable Shanghai release check", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["validate:shanghai"]).toBe("tsx scripts/validate-shanghai.ts");
  });
});
