#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const home = process.env.USERPROFILE || process.env.HOME;

if (!home) {
  console.error("Cannot find USERPROFILE or HOME. Please install manually into .codex/skills/api2img.");
  process.exit(1);
}

const target = path.join(home, ".codex", "skills", "api2img");
const entries = ["SKILL.md", "README.md", "agents", "scripts"];
const excludedNames = new Set([
  "api2img-api-key.dpapi.txt",
  "node_modules",
  "output",
  ".git"
]);

function copyRecursive(source, destination) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      if (excludedNames.has(child)) continue;
      copyRecursive(path.join(source, child), path.join(destination, child));
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

fs.mkdirSync(target, { recursive: true });

for (const entry of entries) {
  copyRecursive(path.join(packageRoot, entry), path.join(target, entry));
}

console.log(`api2img Codex skill installed to: ${target}`);
console.log("Restart Codex if it does not pick up the skill immediately.");
