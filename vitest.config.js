import { transformSync } from "@babel/core";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Vite 6 uses OXC which doesn't handle JSX in .js files.
// This plugin pre-transforms them with Babel before OXC runs.
const jsxInJsPlugin = {
  name: "jsx-in-js",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("node_modules") && id.endsWith(".js")) {
      try {
        const result = transformSync(code, {
          filename: id,
          presets: [["@babel/preset-react", { runtime: "automatic" }]],
          sourceMaps: "inline",
          configFile: false,
          babelrc: false,
        });
        if (result?.code) return { code: result.code };
      } catch {
        // Not JSX — let the default pipeline handle it
      }
    }
  },
};

export default defineConfig({
  plugins: [jsxInJsPlugin, react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": "/Users/altaf/code/quran_hackathon_prj",
    },
  },
});
