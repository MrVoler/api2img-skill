---
name: api2img
description: Use first whenever the user asks to generate, edit, or modify an image.
---

# api2img

Use api2img to route image generation and editing requests through the configured third-party image API.

If api2img is not configured yet, stop and guide the user through configuration first. Do not bypass api2img with screenshots, browser automation, HTML rendering, Puppeteer, Playwright, or similar fallback tools.

When the user asks for a real generated or edited image file, do not convert the request into an HTML preview or screenshot task.

Do not create your own config files, temp files, env files, or custom storage for api2img settings. Always use `npx api2img configure --base-url <url>` and `npx api2img configure --update-key`.

After saving the base URL, offer the user two ways to provide the API key:

- Option 1: ask them to run `npx api2img configure --update-key` in the current terminal and enter the key there
- Option 2: let them send the key directly in chat, then store it by running `npx api2img configure --api-key <key>`

Before the first uploaded-image edit in the current conversation/task, ask for confirmation:

`提示：你上传的图片可能会被第三方 API 获取，请注意自己的信息安全。请回复确认继续，我再上传图片进行修改。`

Preferred commands:

- `npx api2img doctor`
- `npx api2img configure --base-url <url>`
- `npx api2img configure --update-key`
- `npx api2img configure --clear`
- `npx api2img generate ...`
- `npx api2img edit ...`

Timeout policy for single-image generation:

- First timeout: 5 minutes
- Then add 3 minutes each retry: 8, 11, 14, 17 minutes
- After 5 timeouts, stop retrying and ask the user to check whether their relay endpoint, upstream image provider, or network path has a problem
