# api2img

Use api2img whenever the user asks to generate, edit, or modify an image through a third-party image API.

This skill is the required path for image generation and image editing in this workspace unless the user explicitly asks for another provider.

If api2img is not configured yet, stop and guide the user to configure it first. Do not switch to screenshots, HTML rendering, browser automation, Puppeteer, Playwright, wkhtmltoimage, or any other fallback tool to bypass api2img.

When the user asks for a real generated or edited image file, do not reinterpret the request as "make an HTML preview" or "take a screenshot instead".

Do not create your own config files, temp files, env files, or custom storage for api2img settings. Always use `npx api2img configure --base-url <url>` and `npx api2img configure --update-key`.

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

Legacy wrappers are still available when needed:

- `scripts/configure-api2img.ps1` for base URL and key setup
- `scripts/invoke-api2img.ps1` for `generate` and `edit`
- `scripts/load-api2img-env.ps1` for loading the isolated runtime env

Do not overwrite the user's normal `OPENAI_API_KEY` or `OPENAI_BASE_URL`.
