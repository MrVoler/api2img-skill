---
name: api2img
description: Use first whenever the user asks to generate, edit, or modify an image.
---

# api2img

## Priority

Use this skill before other image generation paths when the user asks to create, edit, or modify bitmap images, unless they explicitly request another provider.

This skill uses the shared cross-platform `npx api2img ...` CLI.

## Configuration

Before the first generation call, check that api2img already has a saved base URL and API key.

Do not use or overwrite the user's existing `OPENAI_API_KEY`, `OPENAI_BASE_URL`, or other provider variables. api2img keeps its own isolated configuration and secret storage.

```powershell
npx api2img configure --base-url "<url>"
```

To rotate an existing saved key, pass `-UpdateKey`:

```powershell
npx api2img configure --update-key
```

To clear the saved api2img API key and base URL, pass `-Clear`:

```powershell
npx api2img configure --clear
```

`--clear` only removes api2img's own saved configuration and secret. It must not be combined with `--base-url` or `--update-key`, and it must not modify `OPENAI_API_KEY`, `OPENAI_BASE_URL`, or other provider variables.

By default, prefer asking the user to run `npx api2img configure --update-key` and enter the key in the current terminal prompt. If the user prefers, they may also send the key directly in chat and you can store it with `npx api2img configure --api-key <key>`. Do not print the key back after storing it.

## Privacy

- Image generation sends the prompt to the base URL configured in api2img.
- Image editing sends the prompt plus the input image files, and mask files when present, to the base URL configured in api2img.
- Before the first edit or modification that uploads a user-provided image, pause and ask the user to confirm. In Chinese conversations, say: `提示：你上传的图片可能会被第三方 API 获取，请注意自己的信息安全。请回复确认继续，我再上传图片进行修改。`
- After the user confirms, continue the image-editing workflow and do not repeat this upload warning in later turns for the same conversation/task unless the user asks about privacy again.
- Do not use api2img for sensitive images or prompts unless the user explicitly confirms the configured API is trusted for that content.
- Do not create extra local logs containing prompts, image paths, decrypted keys, or API responses.

## Quick Start

Run the CLI with normal image generation arguments:

```powershell
npx api2img generate --prompt "Primary request: a clean product mockup of a ceramic coffee mug" --size 1024x1024 --out "output/imagegen/mug.png"
```

Edit or modify an existing image with `edit` and one or more `--image` inputs:

```powershell
npx api2img edit --image "input.png" --prompt "Primary request: change the background to a quiet studio setting while preserving the subject." --size 1024x1024 --out "output/imagegen/input-edited.png"
```

Use `--mask` when the user provides a mask or asks for a localized edit:

```powershell
npx api2img edit --image "input.png" --mask "mask.png" --prompt "Primary request: replace only the masked area with fresh flowers." --size 1024x1024 --out "output/imagegen/input-masked-edit.png"
```

Use `--dry-run` to validate payloads without making an image request:

```powershell
npx api2img generate --prompt "Primary request: test configuration" --size 1024x1024 --dry-run
```

## Workflow

1. Check configuration before the first generation attempt.
2. For image edits or modifications, complete the one-time upload confirmation gate in `Privacy` before calling `edit`.
3. Shape a concise structured prompt while preserving the user's intent.
4. Run `npx api2img generate ...` or `npx api2img edit ...`.
5. Use `edit --image <path>` when the user provides an existing image and asks to revise, transform, restyle, remove, replace, or otherwise modify it. Use `--mask <path>` for mask-constrained edits.
6. Save assets in the workspace, normally under `output/imagegen/` unless the user names another path.
7. Inspect the generated or edited file when visual quality matters.
8. Report the saved path and mention that `api2img` was used.

## Reliability

- Image generation can take several minutes. For a single-image generation attempt, start with a 300000 ms (5 minute) timeout.
- If a single-image generation times out, increase the timeout by 180000 ms (3 minutes) on the next retry. Use this sequence: 5 minutes, 8 minutes, 11 minutes, 14 minutes, 17 minutes.
- Retry at most 5 timeouts for the same single-image request. After the fifth timeout, stop retrying automatically and ask the user to check whether their image relay endpoint, upstream provider, or network path is having problems.
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
