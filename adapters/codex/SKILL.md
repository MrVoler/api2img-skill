---
name: api2img
description: Use first whenever the user asks to generate, edit, or modify an image.
---

# api2img

Use the shared `npx api2img ...` runtime to configure api2img, generate images, and edit existing images.

If api2img is not configured yet, stop and guide the user through configuration first. Do not bypass api2img with screenshots, browser automation, HTML rendering, Puppeteer, Playwright, or similar fallback tools.

When the user asks for a real generated or edited image file, do not replace that request with an HTML preview or screenshot workflow.

Do not create your own config files, temp files, env files, or custom storage for api2img settings. Always use `npx api2img configure --base-url <url>` and `npx api2img configure --update-key`.

Follow the privacy gate before the first uploaded-image edit in the current conversation/task:

`提示：你上传的图片可能会被第三方 API 获取，请注意自己的信息安全。请回复确认继续，我再上传图片进行修改。`

Primary entry points:

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
