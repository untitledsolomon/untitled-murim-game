import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * The simulation must be pure: the same commands in the same order always
 * produce the same state. Any wall-clock or global-random source breaks that
 * guarantee, so this test scans the source tree for them and fails the build
 * if one appears. All randomness must come from the seeded rng in rng.ts.
 */
const FORBIDDEN = [
  { pattern: /\bMath\.random\b/, label: "Math.random" },
  { pattern: /\bDate\.now\b/, label: "Date.now" },
  { pattern: /\bperformance\.now\b/, label: "performance.now" },
  { pattern: /\bnew Date\(/, label: "new Date(" },
];

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

const srcDir = join(import.meta.dir, "..", "src");
const files = sourceFiles(srcDir);

/** Drop comments so a guard like "never use Math.random" does not trip itself. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("sim purity", () => {
  for (const { pattern, label } of FORBIDDEN) {
    test(`no ${label} anywhere in the sim`, () => {
      const hits: string[] = [];
      for (const file of files) {
        const content = stripComments(readFileSync(file, "utf8"));
        if (pattern.test(content)) hits.push(relative(srcDir, file));
      }
      expect(hits).toEqual([]);
    });
  }
});
