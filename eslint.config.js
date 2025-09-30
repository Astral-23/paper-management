import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    // Base config for all JS files
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        // Custom Globals for the app
        "firebase": "readonly",
        "marked": "readonly",
        "markedKatex": "readonly",
        "Chart": "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-prototype-builtins": "error"
    }
  },
  {
    // Override for test files
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node, // Use Node.js globals for tests
        "vi": "readonly",
        "describe": "readonly",
        "it": "readonly",
        "expect": "readonly",
        "beforeEach": "readonly",
        "afterEach": "readonly"
      }
    }
  }
];