import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated deploy output, not source. `next lint` excluded build
    // directories implicitly; the ESLint CLI that replaced it in Next 16 does
    // not, so they have to be listed.
    ".vercel/**",
    // Agent worktrees are full checkouts of this repo. Without this, every
    // problem in src/ is reported twice — once here, once in the copy.
    ".claude/**",
  ]),
]);

export default eslintConfig;
