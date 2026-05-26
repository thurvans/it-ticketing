import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const backendRootDir = path.resolve(path.dirname(currentFilePath), "..");
const distDir = path.join(backendRootDir, "dist");

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

fs.cpSync(path.join(backendRootDir, "src"), path.join(distDir, "src"), {
  recursive: true,
});
fs.cpSync(path.join(backendRootDir, "api"), path.join(distDir, "api"), {
  recursive: true,
});
fs.copyFileSync(path.join(backendRootDir, "package.json"), path.join(distDir, "package.json"));

console.log("Backend runtime files prepared in dist");
