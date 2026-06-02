# api2img

This is the generic api2img adapter for unsupported or unknown agents.

Point your agent at this directory when you want it to use api2img for image generation or editing.

If api2img is not configured yet, stop and ask the user to configure it first. Do not bypass api2img with screenshots, HTML-to-image, browser automation, Puppeteer, Playwright, or other fallback rendering tools.

When the user asks for a real generated or edited image file, do not replace that request with an HTML preview or screenshot workflow.

Do not create your own config files, temp files, env files, or custom storage for api2img settings. Always use `npx api2img configure --base-url <url>` and `npx api2img configure --update-key`.

Before the first uploaded-image edit in the current conversation/task, the agent should say:

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
