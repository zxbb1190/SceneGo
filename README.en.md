# SceneGo

[中文文档](README.md)

SceneGo is an AI-assisted language learning workspace for user-provided learning scenes.

It is not a video content platform. SceneGo helps learners study from local videos, user-provided subtitles, external companion links, and manually entered text. It provides playback, subtitle sync, structured AI sentence/text analysis, learning history, sentence favorites, notes, and vocabulary review.

## Current Status

Current public verifiable release: `v0.2.2`.

- Chinese README is the primary document.
- Text study is the default entry after login.
- Text study supports example snippets, result focus after analysis, one-click favorite, and one-click add-all AI vocabulary.
- Daily review, deterministic review scheduling, structured AI quizzes, mistakes, and learning reports are available.
- GitHub Actions CI runs `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm test`.
- The project uses the MIT License.

## What It Does

- Local video learning with user-selected video files and user-provided SRT/VTT subtitles
- Subtitle parsing and current-sentence matching on a deterministic timeline
- Native video playback, previous/next sentence navigation, and replay current sentence
- AI sentence analysis for subtitle lines and manual companion text
- Text learning for words, phrases, sentences, paragraphs, and mixed snippets
- Learning history with filters, detail pages, notes, favorites, and deletion
- Sentence book that includes both video/subtitle favorites and text-study sentence favorites
- Vocabulary book with source context, mastery status, and deletion
- Daily review for due words and study items with known, fuzzy, and unknown outcomes
- Structured AI quizzes generated from study items or vocabulary items
- Mistake history and learning reports for daily study, review, mastery, and mistakes
- External-link companion mode using iframe/open-in-new-tab plus manual sentence input
- OpenAI-compatible AI provider adapter with structured JSON validation and caching

## Product Boundaries

SceneGo intentionally does not provide or fetch copyrighted content.

- No third-party video downloading
- No scraping of Bilibili, iQiyi, YouTube, Netflix, or any external platform
- No DRM, login, ads, membership, hotlink, or iframe restriction bypass
- No reading cross-origin iframe DOM or media state
- No full subtitle export or full transcript download
- External links are embed/manual companion mode only
- User-imported content remains private learning data

## Tech Stack

- Frontend: React, Vite, TypeScript, TailwindCSS, Zustand, TanStack Query
- Backend: Node.js, Express, TypeScript
- Database: MySQL, Prisma
- Package manager: pnpm
- AI: OpenAI-compatible Chat Completions adapter
- Player: native `video`; Video.js/hls.js can be added later if needed

## Repository Layout

```text
apps/web              React frontend
apps/api              Express API and Prisma schema
packages/shared       Shared domain and AI JSON types
packages/subtitles    Subtitle parser and timeline matcher
scripts               Local smoke-test helpers
```

## Screenshots and Demo

No public demo is provided yet. Start the app locally and open the main text-study entry:

```text
http://localhost:5174/text-study
```

Screenshot placeholders:

```text
docs/screenshots/text-study.png
docs/screenshots/sentence-book.png
```

## Quick Start

Requirements:

- Node.js 20+
- pnpm 9+
- MySQL 8.x, or Docker Desktop for the included MySQL service

```bash
pnpm install
cp .env.example .env
pnpm docker:mysql:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

By default:

- Web: `http://localhost:5174`
- API: `http://localhost:4000`
- If `5174` is already in use, Vite automatically uses the next free port.

## Environment Variables

Create `.env` from `.env.example`.

```bash
PORT=4000
CORS_ORIGIN=http://localhost:5174
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

Never commit `.env` or API keys.

## AI Provider Setup

SceneGo is provider-neutral. The backend calls an OpenAI-compatible `/chat/completions` endpoint and validates the returned structured JSON before saving it.

Required AI variables:

```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.example.com/v1
OPENAI_COMPATIBLE_API_KEY=your-api-key
AI_MODEL=provider/model-name
```

Optional AI variables:

```bash
AI_MAX_TOKENS=4096
AI_REQUEST_TIMEOUT_MS=180000
AI_RESPONSE_FORMAT=json_object
AI_ENABLE_THINKING=false
```

Compatibility notes:

- `OPENAI_COMPATIBLE_BASE_URL` should be the API root ending in `/v1`.
- `AI_RESPONSE_FORMAT=json_object` sends `response_format: { "type": "json_object" }`. Leave it empty if your provider does not support this field.
- `AI_ENABLE_THINKING=false` sends the provider extension `enable_thinking: false`. Leave it empty unless your provider supports that option.
- The app still prompts for JSON and validates JSON even when `AI_RESPONSE_FORMAT` is not enabled.
- If the provider returns malformed or truncated JSON, the API returns `502 AI_PROVIDER_INVALID_RESPONSE` instead of a generic 500.

Recommended provider: SiliconFlow.

SiliconFlow supports many OpenAI-compatible models, including DeepSeek-family and Qwen-family models. You can register through this referral link:

https://cloud.siliconflow.cn/i/iA6DF2nP

Example SiliconFlow configuration:

```bash
OPENAI_COMPATIBLE_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_COMPATIBLE_API_KEY=your-siliconflow-key
AI_MODEL=deepseek-ai/DeepSeek-V4-Flash
AI_MAX_TOKENS=4096
AI_REQUEST_TIMEOUT_MS=180000
AI_ENABLE_THINKING=false
```

If you use a model/provider that supports OpenAI JSON mode, you may also add:

```bash
AI_RESPONSE_FORMAT=json_object
```

## Database

The default Docker service creates:

```text
database: scenego
user: scenego
password: password
port: 3306
```

Start MySQL and run migrations:

```bash
pnpm docker:mysql:up
pnpm db:generate
pnpm db:migrate
```

For production, use a managed MySQL 8.x instance or your own MySQL server, then set:

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
```

Apply migrations in deployment:

```bash
pnpm db:deploy
```

## Development

Run all packages:

```bash
pnpm dev
```

Run only the API:

```bash
pnpm --filter @scenego/api dev
```

Run only the web app:

```bash
pnpm --filter @scenego/web dev
```

Build everything:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

## Local Verification Order

Recommended pre-commit or pre-release checks:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

To verify the database-backed API flow:

```bash
pnpm docker:mysql:up
pnpm db:deploy
DATABASE_URL="mysql://scenego:password@localhost:3306/scenego" pnpm smoke:api
```

## Deployment

One simple production deployment shape:

1. Provision MySQL 8.x.
2. Set API environment variables on your server.
3. Install dependencies and build:

```bash
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm build
```

4. Start the API:

```bash
pnpm start:api
```

5. Serve `apps/web/dist` with Nginx, Caddy, Vercel, Netlify, or another static host.
6. Proxy `/api/*` from the web host to the API service, or set `VITE_API_BASE_URL` before building the web app:

```bash
VITE_API_BASE_URL=https://api.your-domain.com pnpm --filter @scenego/web build
```

Local preview for the built web app:

```bash
pnpm preview:web
```

## Main API Routes

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

The API smoke test starts a temporary API process and a fake OpenAI-compatible service. It covers auth, project CRUD, subtitle parsing, progress, favorites, vocabulary, and AI analysis caching.

```bash
DATABASE_URL="mysql://scenego:password@localhost:3306/scenego" pnpm smoke:api
```

Use `GET /health/db` to check whether the API can reach MySQL. If the database is unavailable, the API returns `503 DATABASE_UNAVAILABLE`.

## Open Source Notes

- `.env`, API keys, local logs, `docs/`, and `AGENTS.md` are ignored by git.
- This project is released under the MIT License.
- Review the README and screenshots before creating the GitHub repository.
- Keep provider keys in GitHub Actions secrets or deployment platform secrets.
