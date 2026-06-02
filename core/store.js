const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
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

function legacyWindowsState(scriptDir) {
  const result = {
    apiKey: null,
    baseUrl: process.env.CODEX_API2IMG_BASE_URL || null,
    backend: null,
    keyFileExists: false,
    keyFilePath: null,
  };

  if (platformName() !== "win32" || !scriptDir) {
    return result;
  }

  const keyFile = path.join(scriptDir, "api2img-api-key.dpapi.txt");
  result.keyFilePath = keyFile;
  if (fs.existsSync(keyFile)) {
    result.keyFileExists = true;
    result.backend = "windows-dpapi-legacy";
    result.apiKey = decryptLegacyWindowsKey(keyFile);
  }

  return result;
}

function decryptLegacyWindowsKey(keyFile) {
  if (platformName() !== "win32" || !fs.existsSync(keyFile)) {
    return null;
  }

  const command = [
    "$encryptedKey = (Get-Content -Raw -LiteralPath $args[0]).Trim()",
    "$secureKey = ConvertTo-SecureString -String $encryptedKey",
    "$credential = [System.Management.Automation.PSCredential]::new('api2img', $secureKey)",
    "$credential.GetNetworkCredential().Password",
  ].join("; ");

  try {
    const output = childProcess.execFileSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command, keyFile],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    return output.trim() || null;
  } catch {
    return null;
  }
}

function runtimeState(scriptDir) {
  const config = loadConfig();
  const secret = loadSecret();
  const legacy = legacyWindowsState(scriptDir);

  return {
    baseUrl: config.baseUrl || legacy.baseUrl || null,
    apiKey: secret.apiKey || legacy.apiKey || null,
    secretBackend: secret.backend || legacy.backend || "none",
    configured: Boolean((config.baseUrl || legacy.baseUrl) && (secret.apiKey || legacy.apiKey || legacy.backend)),
    configPath: configFile(),
    secretPath: secret.apiKey ? "managed-by-backend" : null,
    platform: platformName(),
    migration: {
      hasCrossPlatformConfig: Boolean(config.baseUrl || secret.apiKey),
      hasLegacyWindowsKeyFile: legacy.keyFileExists,
      legacyWindowsKeyFilePath: legacy.keyFilePath,
      legacyWindowsKeyReadable: Boolean(legacy.apiKey),
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
