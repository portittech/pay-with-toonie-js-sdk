import svelte from "rollup-plugin-svelte";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import livereload from "rollup-plugin-livereload";
import sveltePreprocess from "svelte-preprocess";
import json from "@rollup/plugin-json";
import { config } from "dotenv";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import scss from "rollup-plugin-scss";

// Load environment variables from .env file
config();

const production = !process.env.ROLLUP_WATCH;

function serve() {
  let server;

  function toExit() {
    if (server) server.kill(0);
  }

  return {
    writeBundle() {
      if (server) return;
      server = require("child_process").spawn(
        "npm",
        ["run", "start", "--", "--dev"],
        {
          stdio: ["ignore", "inherit", "inherit"],
          shell: true,
        },
      );

      process.on("SIGTERM", toExit);
      process.on("exit", toExit);
    },
  };
}

export default {
  input: "src/main.js",
  output: {
    sourcemap: true,
    format: "iife",
    name: "PayWithToonie",
    file: "dist/pay-with-toonie.dist.js",
  },
  plugins: [
    svelte({
      compilerOptions: {
        // enable run-time checks when not in production
        dev: !production,
      },
      preprocess: sveltePreprocess(),
    }),

    replace({
      // Replace .env variables with the actual value
      "process.env.PUBLIC_STRIPE_KEY": JSON.stringify(
        process.env.PUBLIC_STRIPE_KEY,
      ),
      "process.env.ENVIRONMENT": JSON.stringify(process.env.ENVIRONMENT),
      preventAssignment: true,
    }),

    // we'll extract any component CSS out into
    // a separate file - better for performance
    scss({ fileName: "pay-with-toonie.dist.css" }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/node-resolve
    nodeResolve({
      browser: true,
      dedupe: ["svelte"],
    }),

    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    commonjs(),

    json(),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload("public"),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
};
