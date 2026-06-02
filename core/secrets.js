const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const { ensureDir, secretFile, platformName } = require("./paths");

const SERVICE_NAME = "api2img";
const ACCOUNT_NAME = "default";

function commandExists(command, args = ["--help"]) {
  try {
    childProcess.execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch (error) {
    if (error && (error.code === "ENOENT" || error.code === "ENOTFOUND")) {
      return false;
    }
    return true;
  }
}

function fileBackendGet() {
  try {
    const parsed = JSON.parse(fs.readFileSync(secretFile(), "utf8"));
    return parsed.apiKey || null;
  } catch {
    return null;
  }
}

function fileBackendSet(apiKey) {
  ensureDir(path.dirname(secretFile()));
  fs.writeFileSync(secretFile(), JSON.stringify({ apiKey }, null, 2), "utf8");
  if (platformName() !== "win32") {
    fs.chmodSync(secretFile(), 0o600);
  }
}

function fileBackendDelete() {
  try {
    fs.unlinkSync(secretFile());
  } catch {}
}

function execText(command, args, input) {
  return childProcess.execFileSync(command, args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();
}

function macosGet() {
  try {
    return execText("security", [
      "find-generic-password",
      "-a", ACCOUNT_NAME,
      "-s", SERVICE_NAME,
      "-w",
    ]) || null;
  } catch {
    return null;
  }
}

function macosSet(apiKey) {
  try {
    execText("security", ["delete-generic-password", "-a", ACCOUNT_NAME, "-s", SERVICE_NAME], "");
  } catch {}
  execText("security", [
    "add-generic-password",
    "-a", ACCOUNT_NAME,
    "-s", SERVICE_NAME,
    "-w", apiKey,
    "-U",
  ], "");
}

function macosDelete() {
  try {
    execText("security", ["delete-generic-password", "-a", ACCOUNT_NAME, "-s", SERVICE_NAME], "");
  } catch {}
}

function linuxGet() {
  try {
    return execText("secret-tool", ["lookup", "service", SERVICE_NAME, "account", ACCOUNT_NAME], "") || null;
  } catch {
    return null;
  }
}

function linuxSet(apiKey) {
  execText("secret-tool", ["store", "--label", SERVICE_NAME, "service", SERVICE_NAME, "account", ACCOUNT_NAME], apiKey);
}

function linuxDelete() {
  try {
    execText("secret-tool", ["clear", "service", SERVICE_NAME, "account", ACCOUNT_NAME], "");
  } catch {}
}

function selectBackend() {
  const platform = platformName();
  if (platform === "darwin") {
    return {
      name: "macos-keychain",
      available: commandExists("security", ["-h"]),
      get: macosGet,
      set: macosSet,
      delete: macosDelete,
    };
  }

  if (platform === "linux") {
    return {
      name: "linux-secret-tool",
      available: commandExists("secret-tool", ["--help"]),
      get: linuxGet,
      set: linuxSet,
      delete: linuxDelete,
    };
  }

  return {
    name: "file",
    available: true,
    get: fileBackendGet,
    set: fileBackendSet,
    delete: fileBackendDelete,
  };
}

function getSecretState() {
  const preferred = selectBackend();
  if (preferred.available) {
    try {
      const apiKey = preferred.get();
      if (apiKey) {
        return { apiKey, backend: preferred.name, preferredBackend: preferred.name, fallbackUsed: false };
      }
    } catch {}
  }

  const fileKey = fileBackendGet();
  if (fileKey) {
    return {
      apiKey: fileKey,
      backend: "file",
      preferredBackend: preferred.name,
      fallbackUsed: preferred.name !== "file",
    };
  }

  return {
    apiKey: null,
    backend: preferred.available ? preferred.name : "file",
    preferredBackend: preferred.name,
    fallbackUsed: !preferred.available && preferred.name !== "file",
  };
}

function saveSecret(apiKey) {
  const preferred = selectBackend();
  if (preferred.available) {
    try {
      preferred.set(apiKey);
      if (preferred.name !== "file") {
        fileBackendDelete();
      }
      return { backend: preferred.name, fallbackUsed: false };
    } catch {}
  }

  fileBackendSet(apiKey);
  return {
    backend: "file",
    fallbackUsed: preferred.name !== "file",
  };
}

function clearSecret() {
  const preferred = selectBackend();
  if (preferred.available) {
    try {
      preferred.delete();
    } catch {}
  }
  fileBackendDelete();
}

function describeBackend() {
  const preferred = selectBackend();
  return {
    preferredBackend: preferred.name,
    preferredAvailable: Boolean(preferred.available),
    fileFallbackPath: secretFile(),
  };
}

module.exports = {
  getSecretState,
  saveSecret,
  clearSecret,
  describeBackend,
};
