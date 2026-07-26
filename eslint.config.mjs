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
    // not, and these alone contributed 8,705 of 8,737 reported problems.
    ".netlify/**",
    ".vercel/**",
  ]),
]);

export default eslintConfig;
