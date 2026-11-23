# 3D Portfolio · 互动履历

[English](README.md)

从简历中选一次真实判断，把它做成可编辑的 Three.js 互动作品。访客可以先读个人简介，再调查线索、比较方案或排列优先级，最后看到你当时的做法。作品可导出为离线 HTML 或静态网站。

## 本机启动

需要 **Node.js 22.18 及以上的 22.x 版本，或 Node.js 24 及以上**。建议使用近期的桌面浏览器进行编辑。

### 从源码构建

从 GitHub 的 **Code → Download ZIP** 下载并解压，或复制 **Code** 菜单中的地址执行 Git 克隆。进入项目根目录后运行以下命令。

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm check
pnpm kit
pnpm start
```

已有 pnpm 11.25.0 可跳过第一行。按终端提示打开地址，默认是 [http://127.0.0.1:41723/decisions/](http://127.0.0.1:41723/decisions/)。使用时保持终端开启，按 Ctrl+C 停止。修改源码后，重新运行 `pnpm kit` 再启动。

### 用打包版启动

`pnpm kit` 生成 `artifacts/Career-Exhibit-Generator.zip`。解压后直接打开 `Your-Turn.html`，可离线体验、手动编辑和导出。如果要启用 AI 采访，macOS 运行 `Start.command`，Windows 运行 `Start.cmd`。也可在解压目录用终端运行：

```sh
node generator.mjs --open
```

打包版已经包含运行所需的依赖。启动服务只需要 Node.js。

## 配置可选的 AI 采访

从源码运行时，把 `.env.example` 复制为项目根目录的 `.env`。使用解压后的打包版时，把 `model-settings.example` 复制成同目录的 `.env`。源码版可在 macOS 或 Linux 运行 `cp .env.example .env`，在 PowerShell 运行 `Copy-Item .env.example .env`。打包版把命令中的源文件改为 `model-settings.example`。编辑后重启服务。

| 配置项 | 如何填写 |
| --- | --- |
| `MODEL_BASE_URL` | 兼容 Chat Completions 的 API 基址，通常以 `/v1` 结尾。远程接口使用 HTTPS。本机回环接口也可使用 HTTP。 |
| `MODEL_NAME` | 服务商要求的准确模型 ID。服务需支持 `response_format: {"type":"json_object"}`。 |
| `MODEL_API_KEY` | 服务商的 API 密钥。本机回环服务无需鉴权时可留空。 |
| `STUDIO_PORT` | 可选的本机端口，默认 `41723`。使用同一个地址和端口可重新打开同一份浏览器草稿。 |

模板中的模型值默认留空。密钥由作者的本机服务读取。勾选同意后，采访功能会将展示姓名、编辑后的简历正文和补充材料发送至配置的接口。可以先从正文里删除私人资料。模型配置留空时，可手动编辑并导出。

## 制作和分享

1. 打开「作者工作台」。上传有文字层的 PDF、DOCX 或 UTF‑8 TXT，也可粘贴正文。扫描件请先识别文字。
2. 选一段经历。启用 AI 后可以从推荐经历中选择并回答追问。互动可编辑为线索调查、优先级排序或原型对比。
3. 核对模型引用的原文，编辑公开简介、链接和互动内容。把访客可尝试的假设与真实行动、结果分开，导出前先预览。
4. 打开「导出与分享」，下载离线 HTML 或静态网站 ZIP。需要能转发的网址时，把解压得到的 `index.html` 上传至静态托管平台。导出时可填写计划使用的网址和封面图片地址。

当前工作台和示例界面使用简体中文。草稿保存在当前浏览器，下载的项目 JSON 备份包含原始材料，供作者留存。访客文件只包含确认公开的内容和查看程序，可以独立打开，无需模型密钥或作者服务。

## 验证和示例

运行 `pnpm check` 执行类型检查和回归测试。运行 `pnpm kit` 后可在 `artifacts/` 找到离线工作台及独立示例。3D 打印唱片和分布式网络根据公开履历和项目记载手工编写。软件发布排程为虚构练习。AI 采访流程使用本机模拟接口验证。资料来源和原有展览编辑器可见[项目说明](GENERATOR.md)。
