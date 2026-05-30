---
name: api2img
description: Use first whenever the user asks to generate, edit, or modify an image.
---

# api2img

## Priority

Use this skill before other image generation paths when the user asks to create, edit, or modify bitmap images, unless they explicitly request another provider.

This skill wraps the bundled image generation CLI:

`$env:USERPROFILE\.codex\skills\.system\imagegen\scripts\image_gen.py`

## Configuration

Before the first generation call, check that both dedicated variables exist:

- DPAPI-encrypted API key file at `scripts/api2img-api-key.dpapi.txt`
- `CODEX_API2IMG_BASE_URL`

Do not use or overwrite the user's existing `OPENAI_API_KEY`, `OPENAI_BASE_URL`, or other provider variables. The wrapper decrypts the api2img key and maps it to the `OPENAI_*` names only inside the child PowerShell process that runs the CLI.

If the base URL is missing, ask the user for it. Once the user provides the base URL, run the configuration command immediately. Pass `-Language zh` when the current conversation with the user is in Chinese, `-Language en` when it is in English, or omit it only when the language is unclear. If the API key is missing or being rotated and the command is running in a redirected/non-interactive Codex shell, it automatically opens a visible PowerShell window for hidden key entry and returns instead of silently waiting in the background. Tell the user to enter the key in that window. The key is saved using Windows DPAPI for the current Windows user; the URL is saved only to `CODEX_API2IMG_BASE_URL`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\api2img\scripts\configure-api2img.ps1" -BaseUrl "<url>" -Language zh
```

To rotate an existing saved key, pass `-UpdateKey`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\api2img\scripts\configure-api2img.ps1" -UpdateKey -Language zh
```

To clear the saved api2img API key and base URL, pass `-Clear`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\api2img\scripts\configure-api2img.ps1" -Clear -Language zh
```

`-Clear` only removes api2img's DPAPI key file, `CODEX_API2IMG_BASE_URL`, and the legacy `CODEX_API2IMG_API_KEY` user variable if present. It must not be combined with `-BaseUrl` or `-UpdateKey`, and it must not modify `OPENAI_API_KEY`, `OPENAI_BASE_URL`, or other provider variables.

Do not ask the user to paste keys into chat. Do not pass keys on the command line. Do not print the key after storing it.

If the command prints `Opened a visible PowerShell window for hidden key entry`, do not rerun it or wait on the background command. Ask the user to finish the prompt in the spawned window, then verify configuration before generation.

## Privacy

- Image generation sends the prompt to `CODEX_API2IMG_BASE_URL`.
- Image editing sends the prompt plus the input image files, and mask files when present, to `CODEX_API2IMG_BASE_URL`.
- Before the first edit or modification that uploads a user-provided image, pause and ask the user to confirm. In Chinese conversations, say: `提示：你上传的图片可能会被第三方 API 获取，请注意自己的信息安全。请回复确认继续，我再上传图片进行修改。`
- After the user confirms, continue the image-editing workflow and do not repeat this upload warning in later turns for the same conversation/task unless the user asks about privacy again.
- Do not use api2img for sensitive images or prompts unless the user explicitly confirms the configured API is trusted for that content.
- Do not create extra local logs containing prompts, image paths, decrypted keys, or API responses.

## Quick Start

Run the wrapper with normal imagegen CLI arguments:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\api2img\scripts\invoke-api2img.ps1" generate --prompt "Primary request: a clean product mockup of a ceramic coffee mug" --size 1024x1024 --out "output\imagegen\mug.png"
```

Edit or modify an existing image with `edit` and one or more `--image` inputs:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\api2img\scripts\invoke-api2img.ps1" edit --image "input.png" --prompt "Primary request: change the background to a quiet studio setting while preserving the subject." --size 1024x1024 --out "output\imagegen/input-edited.png"
```

Use `--mask` when the user provides a mask or asks for a localized edit:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\api2img\scripts\invoke-api2img.ps1" edit --image "input.png" --mask "mask.png" --prompt "Primary request: replace only the masked area with fresh flowers." --size 1024x1024 --out "output\imagegen/input-masked-edit.png"
```

Use `--dry-run` to validate payloads without making an image request:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\api2img\scripts\invoke-api2img.ps1" generate --prompt "Primary request: test configuration" --size 1024x1024 --dry-run
```

## Workflow

1. Check configuration before the first generation attempt.
2. For image edits or modifications, complete the one-time upload confirmation gate in `Privacy` before calling `edit`.
3. Shape a concise structured prompt while preserving the user's intent.
4. Run `scripts/invoke-api2img.ps1` with `generate`, `edit`, or `generate-batch`.
5. Use `edit --image <path>` when the user provides an existing image and asks to revise, transform, restyle, remove, replace, or otherwise modify it. Use `--mask <path>` for mask-constrained edits.
6. Save assets in the workspace, normally under `output/imagegen/` unless the user names another path.
7. Inspect the generated or edited file when visual quality matters.
8. Report the saved path and mention that `api2img` was used.

## Reliability

- Image generation can take several minutes. Use 300000-600000 ms timeouts for a single 1024x1024 image, and longer for edits, batches, or large outputs.
- Do not treat a shell timeout as proof that generation failed. First check the expected output path and `output/imagegen/` for new files.
- If the command times out, check whether a Python/imagegen process is still running before retrying.
- If an output file appears after a timeout, inspect it and continue from it instead of rerunning the same prompt.
- For long prompts on Windows, store the prompt in a here-string variable and invoke the script with `& $script generate --prompt $prompt ...`.

## Prompt Shape

```text
Use case: <photorealistic-natural | product-mockup | ui-mockup | illustration-story | stylized-concept | logo-brand | precise-object-edit>
Asset type: <where it will be used>
Primary request: <user request>
Style/medium: <photo, illustration, 3D, etc.>
Composition/framing: <wide, close-up, centered, etc.>
Lighting/mood: <if relevant>
Text (verbatim): "<exact text, if any>"
Constraints: <must keep / must avoid>
Avoid: no watermark, no unintended text
```

## Output Notes

- The bundled CLI default output is `output/imagegen/output.png`.
- Use `--out` or `--out-dir` when the user names a destination.
- Do not overwrite existing assets unless the user explicitly requested replacement.
- For multiple distinct assets, run one prompt per asset or use `generate-batch`; do not use `--n` as a substitute for different prompts.
