import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser
    },
    env: {
      node: true,      // Enable Node.js global variables
      es2022: true,    // Enable modern JavaScript features
    },
    ...pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
  }
];