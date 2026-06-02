const fs = require("fs");
const os = require("os");
const path = require("path");

function homeDir() {
  return os.homedir();
}

function platformName() {
  return process.platform;
}

function workspaceDir(explicitWorkspace) {
  return explicitWorkspace ? path.resolve(explicitWorkspace) : process.cwd();
}

function stateDir() {
  return path.join(homeDir(), ".api2img");
}

function configFile() {
  return path.join(stateDir(), "config.json");
}

function secretFile() {
  return path.join(stateDir(), "secret.json");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

module.exports = {
  homeDir,
  platformName,
  workspaceDir,
  stateDir,
  configFile,
  secretFile,
  ensureDir,
};
