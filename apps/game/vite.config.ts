import { shallot } from "@dylanebert/shallot/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [shallot(), svelte()],
    optimizeDeps: {
        // The sim workspace package ships raw TypeScript exports.
        exclude: ["@murim/sim"],
    },
});
