# 3D Portfolio

[简体中文](README.zh-CN.md)

Turn one decision from your résumé into an interactive Three.js portfolio. Visitors start with your profile, explore clues or compare alternatives, make a choice, and then see what you did. You can edit the experience and share it as an offline HTML file or a static website.

## Start locally

Requires Node.js **22.18+ in the 22.x line or 24+**. Use a current desktop browser for authoring.

### Build from source

On GitHub, open **Code → Download ZIP** and extract it, or clone using the URL shown under **Code**. From the project root, run the following.

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm check
pnpm kit
pnpm start
```

Skip the first line if you already have pnpm 11.25.0. Open [http://127.0.0.1:41723/decisions/](http://127.0.0.1:41723/decisions/) or follow the URL printed in the terminal. Keep the terminal open. Stop it with Ctrl+C. After source changes, rebuild using `pnpm kit` before restarting.

### Use the bundled build

`pnpm kit` produces `artifacts/Career-Exhibit-Generator.zip`. Once extracted, open `Your-Turn.html` directly for offline examples, manual editing, and export. For optional AI authoring, run `Start.command` on macOS, `Start.cmd` on Windows, or the following command from the extracted folder on any platform with Node:

```sh
node generator.mjs --open
```

The extracted bundle includes its runtime assets. npm and pnpm are unnecessary for this route.

## Configure the optional AI interview

Copy the appropriate template to `.env`. In a source checkout use `.env.example`. In the extracted bundle use `model-settings.example`. Place the new file in the respective folder and restart the server. From the source directory, run `cp .env.example .env` on macOS or Linux, or `Copy-Item .env.example .env` in PowerShell. In the extracted bundle, use `model-settings.example` as the source file instead.

| Setting | Value |
| --- | --- |
| `MODEL_BASE_URL` | API base URL for Chat Completions, usually ending in `/v1`. Use HTTPS for a remote provider. The local service also accepts HTTP loopback endpoints. |
| `MODEL_NAME` | Exact model ID expected by the provider. The endpoint must support `response_format: {"type":"json_object"}`. |
| `MODEL_API_KEY` | Provider key. Leave empty for a loopback provider that requires no authentication. |
| `STUDIO_PORT` | Optional local port, default `41723`. Keep the address and port stable to reopen the same browser draft. |

The settings ship blank. They live on the authoring server. The interview asks for consent before sending your display name, edited résumé text and interview notes to the provider. You can remove private details from the extracted text first. With empty model settings, the workbench supports manual editing and export.

## Create and share

1. Open **作者工作台** (Author workbench). Upload a text-based PDF, DOCX or UTF‑8 TXT, or paste your résumé. For scanned documents, run OCR elsewhere and paste the text.
2. Choose an episode. If AI is enabled, select a recommended episode and answer its follow-up. Edit the result as an investigation, a priority ranking, or a prototype comparison.
3. Review the source excerpts and edit the public profile, links and case. Keep hypothetical choices separate from the actions and outcomes you observed. Preview the visitor page before downloading.
4. Under **导出与分享** (Export & share), choose **下载离线 HTML** (Download offline HTML) or **下载静态网站 ZIP** (Download static site ZIP). For a shareable URL, publish the extracted `index.html` on your static host. Add your intended URL and cover image URL at export if you want sharing metadata.

The current workbench and examples are in Simplified Chinese. Drafts are stored in the current browser. A project JSON backup contains your original source and notes and is for your own use. The visitor files carry only the approved public content and the viewer. They run without a key or authoring server.

## Validation and examples

Run `pnpm check` for the type check and regression suite. Run `pnpm kit` to build the offline workbench and individual examples in `artifacts/`. The examples include a 3D-printed record and a distributed network based on public sources, plus a clearly labelled fictional software-release exercise. The public-source examples were curated by hand. The AI route was validated with a local test provider. See [the project notes](GENERATOR.md) for sources and the original exhibition editor.
