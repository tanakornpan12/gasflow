const js = require("@eslint/js");

const commonGlobals = {
  AbortController: "readonly",
  Blob: "readonly",
  Buffer: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  crypto: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  process: "readonly",
  queueMicrotask: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
};

const browserGlobals = {
  ...commonGlobals,
  alert: "readonly",
  confirm: "readonly",
  document: "readonly",
  Event: "readonly",
  File: "readonly",
  FileReader: "readonly",
  Image: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  prompt: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  ...commonGlobals,
  __dirname: "readonly",
  module: "readonly",
  require: "readonly",
};

module.exports = [
  {
    ignores: [
      ".codex/**",
      "AGENTS.md",
      "artifacts/**",
      "build/**",
      "dist/**",
      "docs/**",
      "gasflow-ad-hyperframes/**",
      "gasflow-intro-video/**",
      "mobile-app/node_modules/**",
      "node_modules/**",
      "out/**",
      "second brain/**",
      "tmp/**",
    ],
  },
  js.configs.recommended,
  {
    rules: {
      "no-control-regex": "off",
      "no-useless-assignment": "off",
      "preserve-caught-error": "off",
    },
  },
  {
    files: ["backend/**/*.js", "scripts/**/*.cjs", "mobile-app/babel.config.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    files: ["web-admin/src/**/*.js", "mobile-app/App.js", "mobile-app/src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: browserGlobals,
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
];
