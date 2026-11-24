import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// The Svelte exports map has separate client ("browser") and server
// ("default") entries. Vitest resolves bare imports in a Node/SSR context,
// which would select the server entry and break `mount`. Forcing the
// "browser" condition here makes `import { mount } from "svelte"` resolve to
// the client runtime that UI tests exercise.
export default defineConfig({
    plugins: [svelte()],
    resolve: {
        conditions: ["browser", "module", "node", "development"],
    },
    test: {
        environment: "happy-dom",
        include: ["tests/**/*.test.ts"],
    },
    optimizeDeps: {
        exclude: ["@murim/sim"],
    },
});
