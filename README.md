# Api2img Skill

[中文](README.md) | [English](README.en.md)

## 功能

`让任何使用非官方 API-Key 的 Agent 具备接近原生的生图能力。`

api2img 专门面向通过中转 API 使用 Agent，同时又有图片生成和图片编辑需求的人。

支持 `Codex`、`Claude Code`、`OpenClaw`、`Hermes` 等可安装技能的 Agent，也兼容其他可手动接入的 Agent。

## 优势

- **简单**：一条指令安装，并支持自动识别 Agent。
- **安全**：API Key 会优先使用当前系统可用的本机安全存储，不要求把密钥贴到聊天里。
- **全兼容**：支持 Windows、macOS、Linux 系统下，所有可安装技能的 Agent。
- **不污染环境**：生图的 API-Key 独立命名，安全储存，不会覆盖你原来的 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 等变量。


## 安装

方式1（新手推荐）复制以下指令给 Agent：

```powershell
帮我安装技能：npx api2img
```

方式2：命令行安装

```powershell
npx api2img
```

## 生图 API 中转商推荐

[https://cc-vibe.com](https://cc-vibe.com/register?aff=7LBQWRFY5ETG)

朋友搭的，低价走量：

- 个人请求数据每天删除，隐私放心
- 支持生图（1k图=0.01元/张，2k图=0.02元/张，4k图/张=0.03元/张）
- Claude Code / Codex 都支持（8.8 人民币 = 100 美元 API 额度，地板价可验模型）

---

## 调用方式

会在必要时自动被 Agent 调用，正常生图用也可以使用，比如：

- 【生成】生成一张xxx图
- 【修改】替换图片里的某个部分
- 【上传】修改我上传图片里的xxx

## 支持指令

用自然语言跟 Agent 说：

```powershell
安装：
- 把 api2img 安装成全局技能（默认）
- 把 api2img 安装到当前项目

配置：
- 帮我配置 api2img 的 base url
- 帮我更新 api2img 的 api key
- 帮我清空 api2img 的配置
```

## 隐私声明

- 本技能本身不会主动上传你本地的其他数据，也可以让 Agent 先做安全审查
- 生成图片时会把你上传的图片、提示词发送到你配置的三方中转商，请尽量不要处理身份证件、人脸、工作机密等各类私人敏感内容。
