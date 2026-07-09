# Changelog

## v0.2.1 - 2026-07-09

SceneGo public verification release.

### Added

- MIT License.
- GitHub Actions CI for install, build, and test.
- Text-study examples for quick input.
- Result focus after text analysis completes.
- One-click favorite action for the current text analysis result.
- One-click add-all action for AI-returned vocabulary.
- Minimal frontend test for the text-study core flow.
- README status, screenshot/demo placeholders, and local verification command order.

### Changed

- Login and root navigation now default to `/text-study`.
- Package versions bumped to `0.2.1`.

## v0.1.0 - 2026-07-09

SceneGo first open-source release.

### Added

- Local video learning with user-selected video files and user-provided SRT/VTT subtitles.
- Subtitle parsing, timeline matching, current sentence display, previous/next sentence navigation, and current sentence replay.
- Text learning for words, phrases, sentences, paragraphs, and mixed snippets.
- OpenAI-compatible AI adapter with structured JSON validation and cache reuse.
- AI sentence analysis for subtitle lines, external manual companion mode, and text-study items.
- Study history with filters, detail pages, notes, favorites, and deletion.
- Sentence book that includes both video/subtitle sentence favorites and text-study sentence favorites.
- Vocabulary book with source context, mastery status, and deletion.
- External-link companion mode using iframe/open-in-new-tab plus manual sentence input.
- MySQL/Prisma schema, JWT auth, REST APIs, and local Docker MySQL setup.

### Changed

- Renamed the project from VideoGo to SceneGo.
- Made Chinese the primary README and moved English documentation to `README.en.md`.
- Made provider-specific AI request options optional for better OpenAI-compatible provider support.

### Notes

- Recommended OpenAI-compatible provider: SiliconFlow.
- Referral link: https://cloud.siliconflow.cn/i/iA6DF2nP
- SceneGo does not download third-party videos, scrape external platforms, bypass DRM/login/ads/membership restrictions, read cross-origin iframe DOM, or export full subtitle/transcript files.
