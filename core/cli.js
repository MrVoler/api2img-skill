const readline = require("readline");
const fs = require("fs");
const { loadConfig, saveConfig, loadSecret, saveSecret, clearAll, runtimeState } = require("./store");
const { stateDir } = require("./paths");
const path = require("path");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
      continue;
    }
    args._.push(arg);
  }
  return args;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.history = rl.history.slice(1);
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });

    rl._writeToOutput = function writeToOutput(text) {
      if (text.includes(question)) {
        rl.output.write(text);
      } else {
        rl.output.write("*");
      }
    };
  });
}

function readPrompt(args) {
  if (args["prompt-file"]) {
    return fs.readFileSync(path.resolve(args["prompt-file"]), "utf8").trim();
  }
  if (args.prompt) {
    return String(args.prompt).trim();
  }
  throw new Error("Missing prompt. Use --prompt or --prompt-file.");
}

function normalizeBaseUrl(baseUrl) {
  const trimmed = String(baseUrl).replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function normalizeOutputFormat(value) {
  const fmt = (value || "png").toLowerCase();
  if (!["png", "jpeg", "jpg", "webp"].includes(fmt)) {
    throw new Error("output-format must be png, jpeg, jpg, or webp.");
  }
  return fmt === "jpg" ? "jpeg" : fmt;
}

function buildOutputPaths({ out, outDir, outputFormat, count }) {
  const ext = `.${outputFormat}`;
  if (outDir) {
    const base = path.resolve(outDir);
    fs.mkdirSync(base, { recursive: true });
    return Array.from({ length: count }, (_, i) => path.join(base, `image_${i + 1}${ext}`));
  }

  let output = path.resolve(out || "output/imagegen/output.png");
  if (!path.extname(output)) {
    output = `${output}${ext}`;
  }
  if (count === 1) {
    return [output];
  }
  const parsed = path.parse(output);
  return Array.from(
    { length: count },
    (_, i) => path.join(parsed.dir, `${parsed.name}-${i + 1}${parsed.ext}`)
  );
}

function writeImages(images, outputs, force) {
  images.forEach((item, index) => {
    const output = outputs[index];
    if (!output) return;
    if (fs.existsSync(output) && !force) {
      throw new Error(`Output already exists: ${output}. Re-run with --force to overwrite.`);
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, Buffer.from(item.b64_json, "base64"));
    console.log(`Wrote ${output}`);
  });
}

function parseImageArgs(args) {
  const images = [];
  const passthrough = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === "--image" && next) {
      images.push(path.resolve(next));
      i += 1;
      continue;
    }
    passthrough.push(arg);
  }
  return { images, passthrough };
}

function buildPayload(commandName, args, images) {
  const prompt = readPrompt(args);
  const payload = {
    model: args.model || "gpt-image-2",
    prompt,
    n: Number(args.n || 1),
    size: args.size || "auto",
    quality: args.quality || "medium",
    output_format: normalizeOutputFormat(args["output-format"]),
  };

  if (args.background) payload.background = args.background;
  if (args.moderation) payload.moderation = args.moderation;
  if (args["output-compression"]) payload.output_compression = Number(args["output-compression"]);
  if (commandName === "edit" && args["input-fidelity"]) payload.input_fidelity = args["input-fidelity"];
  if (commandName === "edit" && images.length === 0) {
    throw new Error("edit requires at least one --image <path>.");
  }
  return payload;
}

async function callGenerateApi(state, payload) {
  const response = await fetch(`${normalizeBaseUrl(state.baseUrl)}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function callEditApi(state, payload, images, maskPath) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  });

  for (const imagePath of images) {
    const fileBuffer = fs.readFileSync(imagePath);
    form.append("image", new Blob([fileBuffer]), path.basename(imagePath));
  }

  if (maskPath) {
    const maskBuffer = fs.readFileSync(maskPath);
    form.append("mask", new Blob([maskBuffer]), path.basename(maskPath));
  }

  const response = await fetch(`${normalizeBaseUrl(state.baseUrl)}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Image edit failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function configureCommand(args) {
  if (args.clear) {
    clearAll();
    console.log("api2img configuration cleared.");
    return 0;
  }

  const config = loadConfig();
  const secret = loadSecret();

  if (args["base-url"]) {
    config.baseUrl = String(args["base-url"]).replace(/\/+$/, "");
  }

  let nextKey = null;
  if (args["api-key"]) {
    nextKey = String(args["api-key"]);
  } else if (args["update-key"]) {
    nextKey = await promptHidden("API key: ");
  }

  if (!config.baseUrl && !nextKey && !secret.apiKey) {
    throw new Error("No changes requested. Provide --base-url, --update-key, or --clear.");
  }

  saveConfig(config);
  let backendName = secret.backend || "none";
  let fallbackUsed = Boolean(secret.fallbackUsed);
  if (nextKey) {
    const saved = saveSecret({ apiKey: nextKey });
    backendName = saved.backend || backendName;
    fallbackUsed = Boolean(saved.fallbackUsed);
  }

  console.log("api2img configuration saved.");
  console.log(`configPath=${stateDir()}`);
  if (config.baseUrl) {
    console.log(`baseUrl=${config.baseUrl}`);
  }
  console.log(`apiKey=${nextKey || secret.apiKey ? "<saved>" : "<missing>"}`);
  console.log(`secretBackend=${backendName}`);
  console.log(`secretFallbackUsed=${fallbackUsed}`);
  return 0;
}

function doctorCommand() {
  const state = runtimeState();
  console.log(JSON.stringify(state, null, 2));
  return state.configured ? 0 : 1;
}

function envCommand() {
  const state = runtimeState();
  console.log(JSON.stringify(state, null, 2));
  return state.configured ? 0 : 1;
}

async function runImageCommand(commandName, rawArgs) {
  const state = runtimeState();
  if (!state.baseUrl || !state.apiKey) {
    throw new Error("api2img is not configured. Run `api2img configure --base-url <url> --api-key <key>` first.");
  }

  const args = parseArgs(rawArgs);
  const { images } = parseImageArgs(rawArgs);
  const payload = buildPayload(commandName, args, images);
  const outputs = buildOutputPaths({
    out: args.out,
    outDir: args["out-dir"],
    outputFormat: payload.output_format,
    count: payload.n,
  });

  if (args["dry-run"]) {
    const preview = {
      endpoint: commandName === "edit" ? "/v1/images/edits" : "/v1/images/generations",
      outputs,
      ...payload,
    };
    if (commandName === "edit") {
      preview.image = images;
      if (args.mask) preview.mask = path.resolve(args.mask);
    }
    console.log(JSON.stringify(preview, null, 2));
    return 0;
  }

  const result = commandName === "edit"
    ? await callEditApi(state, payload, images, args.mask ? path.resolve(args.mask) : null)
    : await callGenerateApi(state, payload);

  if (!result.data || !Array.isArray(result.data)) {
    throw new Error("Unexpected image API response: missing data array.");
  }

  writeImages(result.data, outputs, Boolean(args.force));
  return 0;
}

async function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];

  if (!command || command === "help") {
    console.log("api2img commands: configure, doctor, env, generate, edit");
    return 0;
  }

  if (command === "configure") {
    return configureCommand(args);
  }

  if (command === "doctor") {
    return doctorCommand();
  }

  if (command === "env") {
    return envCommand();
  }

  if (command === "generate" || command === "edit") {
    return runImageCommand(command, argv.slice(1));
  }

  throw new Error(`Unknown command: ${command}`);
}

module.exports = {
  main,
};
