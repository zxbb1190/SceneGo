# SceneGo

[English](README.en.md)

SceneGo 是一个面向用户自有学习材料的 AI 场景化语言学习工作台。

它不是视频内容平台。SceneGo 支持本地视频、用户自备字幕、外链手动伴学和手动输入文本，提供播放器、字幕同步、结构化 AI 句子/文本分析、学习历史、句子收藏、笔记和生词本能力。

## 当前状态

当前公开可验证版本：`v0.2.1`。

- 中文 README 为主文档，英文文档见 [README.en.md](README.en.md)。
- 文本学习是登录后的默认入口。
- 文本学习支持示例句快捷填入、分析后自动聚焦结果区、收藏当前内容、批量加入 AI 返回词汇。
- GitHub Actions CI 会执行 `pnpm install --frozen-lockfile`、`pnpm build` 和 `pnpm test`。
- 项目采用 MIT License。

## 功能

- 本地视频学习：用户选择本地视频文件，并上传或粘贴自备 SRT/VTT 字幕
- 字幕解析：按时间轴解析字幕，并确定当前播放句子
- 原生视频播放：上一句、下一句、重播当前句、暂停后显示当前句
- AI 句子分析：分析字幕句和外链手动输入句
- 文本学习：支持单词、短语、句子、段落和混合文本
- 学习历史：支持筛选、详情页、笔记、收藏和删除
- 句子本：同时展示视频/字幕收藏句和文本学习收藏句
- 生词本：展示来源上下文、掌握状态，并支持删除
- 外链伴学：iframe 或外部打开，加手动输入句子分析
- OpenAI-compatible AI Provider：结构化 JSON 校验和结果缓存

## 产品边界

SceneGo 不提供、下载或抓取版权内容。

- 不实现第三方视频下载
- 不抓取 Bilibili、iQiyi、YouTube、Netflix 或任何外部平台
- 不绕过 DRM、登录、广告、会员、防盗链或 iframe 限制
- 不读取跨域 iframe 的 DOM 或媒体状态
- 不提供完整字幕导出或完整 transcript 下载
- 外链模式只做嵌入/外部打开和手动伴学
- 用户导入的内容属于私有学习数据

## 技术栈

- 前端：React、Vite、TypeScript、TailwindCSS、Zustand、TanStack Query
- 后端：Node.js、Express、TypeScript
- 数据库：MySQL、Prisma
- 包管理：pnpm
- AI：OpenAI-compatible Chat Completions 适配器
- 播放器：原生 `video`，后续可按需接入 Video.js/hls.js

## 目录结构

```text
apps/web              React 前端
apps/api              Express API 和 Prisma schema
packages/shared       前后端共享领域类型与 AI JSON 类型
packages/subtitles    字幕解析与时间轴匹配
scripts               本地 smoke test 辅助脚本
```

## 截图与 Demo

当前仓库暂未提供在线 Demo。你可以按“快速开始”在本地启动后访问文本学习主入口：

```text
http://localhost:5173/text-study
```

截图占位：

```text
docs/screenshots/text-study.png
docs/screenshots/sentence-book.png
```

## 快速开始

环境要求：

- Node.js 20+
- pnpm 9+
- MySQL 8.x，或安装 Docker Desktop 使用内置 MySQL 服务

```bash
pnpm install
cp .env.example .env
pnpm docker:mysql:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:4000`
- 如果 `5173` 已被占用，Vite 会自动使用下一个可用端口。

## 环境变量

从 `.env.example` 创建 `.env`：

```bash
PORT=4000
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
JWT_SECRET=replace-with-a-long-random-secret

DATABASE_URL="mysql://scenego:password@localhost:3306/scenego"

OPENAI_COMPATIBLE_BASE_URL=
OPENAI_COMPATIBLE_API_KEY=
AI_MODEL=
AI_ENABLE_THINKING=
AI_RESPONSE_FORMAT=
AI_MAX_TOKENS=
AI_REQUEST_TIMEOUT_MS=
```

不要把 `.env` 或任何 API Key 提交到仓库。

## AI 配置

SceneGo 不绑定任何固定厂商。后端调用 OpenAI-compatible 的 `/chat/completions` 接口，并在保存前校验 AI 返回的结构化 JSON。

必填配置：

```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_API_KEY=your-api-key
AI_MODEL=provider/model-name
```

可选配置：

```bash
AI_MAX_TOKENS=4096
AI_REQUEST_TIMEOUT_MS=60000
AI_RESPONSE_FORMAT=json_object
AI_ENABLE_THINKING=false
```

兼容说明：

- `OPENAI_COMPATIBLE_BASE_URL` 应该是以 `/v1` 结尾的 API 根地址。
- `AI_RESPONSE_FORMAT=json_object` 会发送 `response_format: { "type": "json_object" }`。如果你的 provider 不支持这个字段，请留空。
- `AI_ENABLE_THINKING=false` 会发送厂商扩展参数 `enable_thinking: false`。只有 provider 支持时才建议配置。
- 即使不启用 `AI_RESPONSE_FORMAT`，SceneGo 仍会通过 prompt 要求 JSON，并在服务端严格校验。
- 如果 provider 返回了截断或非法 JSON，API 会返回 `502 AI_PROVIDER_INVALID_RESPONSE`，不会伪装成通用 500。

推荐使用硅基流动。

硅基流动提供大量 OpenAI-compatible 模型，包括 DeepSeek 系列和 Qwen 系列。可以通过这个推广链接注册：

https://cloud.siliconflow.cn/i/iA6DF2nP

硅基流动示例配置：

```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_COMPATIBLE_API_KEY=your-siliconflow-key
AI_MODEL=deepseek-ai/DeepSeek-V4-Flash
AI_MAX_TOKENS=4096
AI_REQUEST_TIMEOUT_MS=60000
AI_ENABLE_THINKING=false
```

如果模型或 provider 支持 OpenAI JSON mode，也可以加上：

```bash
AI_RESPONSE_FORMAT=json_object
```

## 数据库

默认 Docker MySQL 服务会创建：

```text
database: scenego
user: scenego
password: password
port: 3306
```

启动 MySQL 并执行迁移：

```bash
pnpm docker:mysql:up
pnpm db:generate
pnpm db:migrate
```

生产环境建议使用托管 MySQL 8.x 或自建 MySQL，然后配置：

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
```

部署时执行迁移：

```bash
pnpm db:deploy
```

## 开发

运行所有包：

```bash
pnpm dev
```

只运行后端：

```bash
pnpm --filter @scenego/api dev
```

只运行前端：

```bash
pnpm --filter @scenego/web dev
```

构建所有包：

```bash
pnpm build
```

运行测试：

```bash
pnpm test
```

## 本地验证命令顺序

推荐在提交或发布前按下面顺序验证：

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

如果需要验证数据库和 API 主链路：

```bash
pnpm docker:mysql:up
pnpm db:deploy
DATABASE_URL="mysql://scenego:password@localhost:3306/scenego" pnpm smoke:api
```

## 部署

一种简单的生产部署方式：

1. 准备 MySQL 8.x。
2. 在服务器或部署平台配置 API 环境变量。
3. 安装依赖并构建：

```bash
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm build
```

4. 启动 API：

```bash
pnpm start:api
```

5. 使用 Nginx、Caddy、Vercel、Netlify 或其他静态托管服务部署 `apps/web/dist`。
6. 将 Web 域名下的 `/api/*` 代理到 API 服务；或者在构建前设置 `VITE_API_BASE_URL`：

```bash
VITE_API_BASE_URL=https://api.your-domain.com pnpm --filter @scenego/web build
```

本地预览构建后的前端：

```bash
pnpm preview:web
```

## 主要 API

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me

GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId/progress
POST   /api/v1/projects/:projectId/subtitles
DELETE /api/v1/projects/:projectId

POST   /api/v1/analysis/sentence
POST   /api/text/analyze
POST   /api/v1/text/analyze

GET    /api/v1/study-items
GET    /api/v1/study-items/:itemId
PATCH  /api/v1/study-items/:itemId
DELETE /api/v1/study-items/:itemId
PATCH  /api/v1/study-items/:itemId/note
POST   /api/v1/study-items/:itemId/vocabulary

GET    /api/v1/sentences/favorites
GET    /api/v1/sentences/progress?projectId=:projectId
POST   /api/v1/sentences/progress
PATCH  /api/v1/sentences/progress/:progressId

GET    /api/v1/vocabulary
POST   /api/v1/vocabulary
PATCH  /api/v1/vocabulary/:itemId
DELETE /api/v1/vocabulary/:itemId
```

## Smoke Test

API smoke test 会启动临时 API 进程和假的 OpenAI-compatible 服务，覆盖注册、登录、JWT 鉴权、项目、字幕解析、进度、收藏、生词和 AI 分析缓存。

```bash
DATABASE_URL="mysql://scenego:password@localhost:3306/scenego" pnpm smoke:api
```

可以用 `GET /health/db` 检查 API 是否能连接 MySQL。数据库不可用时，API 会返回 `503 DATABASE_UNAVAILABLE`。

## 开源注意事项

- `.env`、API Key、本地日志、`docs/` 和 `AGENTS.md` 已被 git 忽略。
- 本项目使用 MIT License。
- 创建 GitHub 仓库前建议补充截图、演示 GIF 或在线 Demo 地址。
- GitHub Actions 或部署平台中请使用 Secrets 保存 provider key。
