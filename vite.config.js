import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Served from https://julianschelb.github.io/loci-similes-demo-page/
export default defineConfig({
  base: "/loci-similes-demo-page/",
  plugins: [react(), tailwindcss()],
});
