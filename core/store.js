const fs = require("fs");
const { getSecretState, saveSecret: saveSecretValue, clearSecret, describeBackend } = require("./secrets");
const {
  configFile,
  ensureDir,
  stateDir,
  platformName,
} = require("./paths");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(stateDir());
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
  if (platformName() !== "win32") {
    fs.chmodSync(filePath, 0o600);
  }
}

function loadConfig() {
  return readJson(configFile(), {});
}

function saveConfig(nextConfig) {
  writeJson(configFile(), nextConfig);
}

function loadSecret() {
  const state = getSecretState();
  return state.apiKey ? { apiKey: state.apiKey, backend: state.backend } : { backend: state.backend };
}

function saveSecret(nextSecret) {
  if (!nextSecret || !nextSecret.apiKey) {
    return null;
  }
  return saveSecretValue(nextSecret.apiKey);
}

function clearAll() {
  clearSecret();
  for (const filePath of [configFile()]) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
}

function runtimeState() {
  const config = loadConfig();
  const secret = loadSecret();

  return {
    baseUrl: config.baseUrl || null,
    apiKey: secret.apiKey || null,
    secretBackend: secret.backend || "none",
    configured: Boolean(config.baseUrl && secret.apiKey),
    configPath: configFile(),
    secretPath: secret.apiKey ? "managed-by-backend" : null,
    platform: platformName(),
    migration: {
      hasCrossPlatformConfig: Boolean(config.baseUrl || secret.apiKey),
      hasLegacyWindowsKeyFile: false,
      legacyWindowsKeyFilePath: null,
      legacyWindowsKeyReadable: false,
    },
    secretBackendInfo: describeBackend(),
    secretFallbackUsed: Boolean(secret.fallbackUsed),
    preferredSecretBackend: secret.preferredBackend || null,
  };
}

module.exports = {
  loadConfig,
  saveConfig,
  loadSecret,
  saveSecret,
  clearAll,
  runtimeState,
};
