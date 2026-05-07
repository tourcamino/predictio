import globals from "globals";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginRouter from "@tanstack/eslint-plugin-router";
import { configs as reactHooksConfigs } from "eslint-plugin-react-hooks";

export default tseslint.config([
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  pluginReact.configs.flat.recommended,
  reactHooksConfigs["recommended-latest"],
  ...pluginRouter.configs["flat/recommended"],
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react/no-children-prop": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
      // Project uses loose boundaries (API JSON, wallets); unsafe-* adds noise without fixes at scale.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      // Async handlers / fire-and-forget are standard in React + Vinxi.
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      // TanStack Router uses `throw redirect()` for control flow.
      "@typescript-eslint/only-throw-error": "off",
      // Many intentional dependency omissions; enable gradually per file if desired.
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    ignores: [
      ".vinxi/",
      ".output/",
      "src/generated",
      "app.config.timestamp_*",
      /** tsc emit uses CommonJS `require()` — do not lint compiled output */
      "**/dist/**",
    ],
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
]);
