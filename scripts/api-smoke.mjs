import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

loadEnvFile(path.resolve(process.cwd(), ".env"));

const apiPort = Number(process.env.SMOKE_API_PORT ?? 4100);
const aiPort = Number(process.env.SMOKE_AI_PORT ?? 4101);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const aiBaseUrl = `http://127.0.0.1:${aiPort}/v1`;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for api smoke test");
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = parseEnvValue(line.slice(separatorIndex + 1));
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

let aiHitCount = 0;
const aiServer = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
    response.writeHead(404).end();
    return;
  }

  aiHitCount += 1;
  await readBody(request);
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      model: "smoke-model",
      choices: [
        {
          message: {
            content: JSON.stringify({
              originalText: "Hello world.",
              language: "en",
              translation: "你好，世界。",
              tokens: [
                {
                  text: "Hello",
                  lemma: "hello",
                  partOfSpeech: "interjection",
                  meaning: "你好"
                }
              ],
              grammar: [
                {
                  title: "Simple greeting",
                  explanation: "A short greeting sentence."
                }
              ],
              usageNotes: ["Common everyday expression."],
              similarExpressions: ["Hi there."]
            })
          }
        }
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 24,
        total_tokens: 36
      }
    })
  );
});

await listen(aiServer, aiPort);

const apiProcess = spawn("pnpm", ["--filter", "@scenego/api", "dev"], {
  cwd: process.cwd(),
  detached: process.platform !== "win32",
  env: {
    ...process.env,
    PORT: String(apiPort),
    CORS_ORIGIN: "http://localhost:5173,http://localhost:5174",
    JWT_SECRET: "smoke-test-secret",
    OPENAI_COMPATIBLE_BASE_URL: aiBaseUrl,
    OPENAI_COMPATIBLE_API_KEY: "smoke-key",
    AI_MODEL: "smoke-model"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

apiProcess.stdout.on("data", (chunk) => process.stdout.write(`[api] ${chunk}`));
apiProcess.stderr.on("data", (chunk) => process.stderr.write(`[api] ${chunk}`));

try {
  await waitForApi();
  await runSmoke();
  console.log("API smoke test passed");
} finally {
  await stopProcess(apiProcess);
  await closeServer(aiServer);
}

async function runSmoke() {
  const apiInfo = await request("/api/v1");
  assert(
    JSON.stringify(apiInfo.sourceTypes) === JSON.stringify(["local_file", "network_url", "external_embed"]),
    "API advertises only v0.1 source types"
  );
  assert(!apiInfo.sourceTypes.includes("official_licensed"), "API does not advertise future source types");

  const email = `smoke-${Date.now()}@example.com`;
  const password = "password123";
  const registerResponse = await request("/api/v1/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      nickname: "Smoke"
    }
  });
  assert(registerResponse.accessToken, "register returns token");
  assert(registerResponse.user.email === email, "register returns user profile");

  const meResponse = await request("/api/v1/auth/me", { token: registerResponse.accessToken });
  assert(meResponse.user.email === email, "auth me returns current user");

  const rejectedProjects = await request("/api/v1/projects", { expectStatus: 401 });
  assert(rejectedProjects.error?.code === "AUTH_REQUIRED", "protected routes require JWT auth");

  const rejectedLogin = await request("/api/v1/auth/login", {
    method: "POST",
    expectStatus: 401,
    body: {
      email,
      password: "wrong-password"
    }
  });
  assert(rejectedLogin.error?.code === "INVALID_CREDENTIALS", "login rejects invalid credentials");

  const loginResponse = await request("/api/v1/auth/login", {
    method: "POST",
    body: {
      email,
      password
    }
  });
  assert(loginResponse.accessToken, "login returns token");
  assert(loginResponse.user.email === email, "login returns user profile");
  const token = loginResponse.accessToken;

  const invalidLocalProject = await request("/api/v1/projects", {
    method: "POST",
    token,
    expectStatus: 400,
    body: {
      title: "Missing Local Video",
      language: "en",
      sourceType: "local_file",
      subtitleFileName: "smoke.srt",
      subtitleFormat: "srt",
      subtitleText: `1
00:00:00,000 --> 00:00:02,000
Hello world.`
    }
  });
  assert(invalidLocalProject.error?.code === "LOCAL_VIDEO_REQUIRED", "local projects require a selected video file");

  const invalidUrlProject = await request("/api/v1/projects", {
    method: "POST",
    token,
    expectStatus: 400,
    body: {
      title: "Missing Source URL",
      language: "en",
      sourceType: "external_embed"
    }
  });
  assert(invalidUrlProject.error?.code === "SOURCE_URL_REQUIRED", "URL-based projects require a source URL");

  const reimportProjectResponse = await request("/api/v1/projects", {
    method: "POST",
    token,
    body: {
      title: "Smoke Reimport Project",
      language: "en",
      sourceType: "local_file",
      videoFileName: "reimport.mp4",
      subtitleFileName: "before.srt",
      subtitleFormat: "srt",
      subtitleText: `1
00:00:00,000 --> 00:00:02,000
Before import.`
    }
  });
  const reimportProjectId = reimportProjectResponse.project.id;
  const reimportDetail = await request(`/api/v1/projects/${reimportProjectId}`, { token });
  assert(reimportDetail.subtitleLines.length === 1, "reimport test project starts with one subtitle line");
  await request("/api/v1/sentences/progress", {
    method: "POST",
    token,
    body: {
      projectId: reimportProjectId,
      subtitleLineId: reimportDetail.subtitleLines[0].id,
      status: "viewed",
      isFavorite: true
    }
  });
  const reimportResponse = await request(`/api/v1/projects/${reimportProjectId}/subtitles`, {
    method: "POST",
    token,
    body: {
      subtitleText: `1
00:00:00,000 --> 00:00:02,000
After import.`,
      subtitleFileName: "after.srt",
      subtitleFormat: "srt"
    }
  });
  assert(reimportResponse.subtitleLines[0].textOriginal === "After import.", "subtitle reimport replaces lines");
  assert(reimportResponse.project.learnedSentenceCount === 0, "subtitle reimport clears old learned sentence count");
  assert(reimportResponse.project.favoriteSentenceCount === 0, "subtitle reimport clears old favorite sentence count");
  const progressAfterReimport = await request(`/api/v1/sentences/progress?projectId=${reimportProjectId}`, { token });
  assert(progressAfterReimport.progresses.length === 0, "subtitle reimport removes old line-bound progress");
  await request(`/api/v1/projects/${reimportProjectId}`, {
    method: "DELETE",
    token,
    expectEmpty: true
  });

  const projectResponse = await request("/api/v1/projects", {
    method: "POST",
    token,
    body: {
      title: "Smoke Local Project",
      language: "en",
      sourceType: "local_file",
      videoFileName: "smoke.mp4",
      subtitleFileName: "smoke.srt",
      subtitleFormat: "srt",
      subtitleText: `1
00:00:00,000 --> 00:00:02,000
Hello world.

2
00:00:02,000 --> 00:00:04,000
Goodbye.

3
00:00:04,000 --> 00:00:06,000
Hello world.`
    }
  });
  assert(projectResponse.project?.subtitleLineCount === 3, "project has parsed subtitle lines");

  const projectId = projectResponse.project.id;
  const detail = await request(`/api/v1/projects/${projectId}`, { token });
  assert(detail.subtitleLines.length === 3, "project detail returns subtitle lines");
  const firstLine = detail.subtitleLines[0];
  const duplicateLine = detail.subtitleLines[2];

  const invalidProjectUpdate = await request(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    token,
    expectStatus: 400,
    body: {
      videoFileName: null
    }
  });
  assert(invalidProjectUpdate.error?.code === "LOCAL_VIDEO_REQUIRED", "local projects keep a selected video file");

  const updatedProject = await request(`/api/v1/projects/${projectId}`, {
    method: "PATCH",
    token,
    body: {
      title: "Smoke Local Project Updated",
      language: "ja"
    }
  });
  assert(updatedProject.project.title === "Smoke Local Project Updated", "project title can be updated");
  assert(updatedProject.project.language === "ja", "project language can be updated");

  const progress = await request(`/api/v1/projects/${projectId}/progress`, {
    method: "PATCH",
    token,
    body: { lastPosition: 1.25, duration: 6 }
  });
  assert(progress.project.lastPosition === 1.25, "project progress is saved");
  assert(progress.project.duration === 6, "project duration is saved with progress");

  const sentenceProgress = await request("/api/v1/sentences/progress", {
    method: "POST",
    token,
    body: {
      projectId,
      subtitleLineId: firstLine.id,
      status: "viewed",
      isFavorite: true,
      note: "Smoke note"
    }
  });
  assert(sentenceProgress.progress.isFavorite === true, "sentence favorite is saved");

  const listenedProgress = await request("/api/v1/sentences/progress", {
    method: "POST",
    token,
    body: {
      projectId,
      subtitleLineId: firstLine.id,
      listenCountIncrement: 1
    }
  });
  assert(
    listenedProgress.progress.listenCount === sentenceProgress.progress.listenCount + 1,
    "sentence listen count increments"
  );

  const masteredProgress = await request(`/api/v1/sentences/progress/${sentenceProgress.progress.id}`, {
    method: "PATCH",
    token,
    body: {
      status: "mastered"
    }
  });
  assert(masteredProgress.progress.status === "mastered", "sentence learning status can be updated");

  const replayAfterMastered = await request("/api/v1/sentences/progress", {
    method: "POST",
    token,
    body: {
      projectId,
      subtitleLineId: firstLine.id,
      listenCountIncrement: 1
    }
  });
  assert(replayAfterMastered.progress.status === "mastered", "listen count update does not downgrade sentence status");

  const projectSentenceProgress = await request(`/api/v1/sentences/progress?projectId=${projectId}`, { token });
  assert(
    projectSentenceProgress.progresses.some(
      (progress) =>
        progress.subtitleLineId === firstLine.id &&
        progress.status === "mastered" &&
        progress.isFavorite === true &&
        progress.note === "Smoke note"
    ),
    "project sentence progress can be listed"
  );

  const favorites = await request("/api/v1/sentences/favorites", { token });
  assert(favorites.sentences.length >= 1, "favorite sentence is listed");

  const unfavoriteResponse = await request(`/api/v1/sentences/progress/${sentenceProgress.progress.id}`, {
    method: "PATCH",
    token,
    body: {
      isFavorite: false
    }
  });
  assert(unfavoriteResponse.progress.isFavorite === false, "favorite sentence can be unfavorited");
  const favoritesAfterUnfavorite = await request("/api/v1/sentences/favorites", { token });
  assert(
    !favoritesAfterUnfavorite.sentences.some((sentence) => sentence.id === sentenceProgress.progress.id),
    "unfavorited sentence is removed from favorites"
  );
  const refavoriteResponse = await request(`/api/v1/sentences/progress/${sentenceProgress.progress.id}`, {
    method: "PATCH",
    token,
    body: {
      isFavorite: true
    }
  });
  assert(refavoriteResponse.progress.isFavorite === true, "favorite sentence can be favorited again");

  const invalidVocabulary = await request("/api/v1/vocabulary", {
    method: "POST",
    token,
    expectStatus: 400,
    body: {
      subtitleLineId: firstLine.id,
      word: "orphan",
      language: "en"
    }
  });
  assert(
    invalidVocabulary.error?.code === "VALIDATION_ERROR" &&
      invalidVocabulary.error?.details?.fieldErrors?.projectId?.length >= 1,
    "subtitle-linked vocabulary requires a project id"
  );

  const vocabulary = await request("/api/v1/vocabulary", {
    method: "POST",
    token,
    body: {
      projectId,
      subtitleLineId: firstLine.id,
      word: "hello",
      meaning: "你好"
    }
  });
  assert(vocabulary.item.word === "hello", "vocabulary item is created");

  const vocabularyList = await request("/api/v1/vocabulary", { token });
  assert(vocabularyList.items.some((item) => item.word === "hello"), "vocabulary item is listed");

  const updatedVocabulary = await request(`/api/v1/vocabulary/${vocabulary.item.id}`, {
    method: "PATCH",
    token,
    body: {
      masteryStatus: "learning"
    }
  });
  assert(updatedVocabulary.item.masteryStatus === "learning", "vocabulary mastery status is updated");

  await request(`/api/v1/vocabulary/${vocabulary.item.id}`, {
    method: "DELETE",
    token,
    expectEmpty: true
  });
  const vocabularyListAfterDelete = await request("/api/v1/vocabulary", { token });
  assert(
    !vocabularyListAfterDelete.items.some((item) => item.id === vocabulary.item.id),
    "vocabulary item is deleted"
  );

  const firstAnalysis = await request("/api/v1/analysis/sentence", {
    method: "POST",
    token,
    body: {
      projectId,
      subtitleLineId: firstLine.id
    }
  });
  assert(firstAnalysis.cached === false, "first analysis is not cached");
  assert(firstAnalysis.analysis.translation === "你好，世界。", "analysis returns structured JSON");

  const secondAnalysis = await request("/api/v1/analysis/sentence", {
    method: "POST",
    token,
    body: {
      projectId,
      subtitleLineId: firstLine.id
    }
  });
  assert(secondAnalysis.cached === true, "second analysis is cached");
  assert(aiHitCount === 1, "AI provider was called once");

  const duplicateTextAnalysis = await request("/api/v1/analysis/sentence", {
    method: "POST",
    token,
    body: {
      projectId,
      subtitleLineId: duplicateLine.id
    }
  });
  assert(duplicateTextAnalysis.cached === false, "duplicate text on another subtitle line gets its own cache entry");
  assert(aiHitCount === 2, "duplicate text on another subtitle line calls AI provider for line-specific context");

  const externalProjectResponse = await request("/api/v1/projects", {
    method: "POST",
    token,
    body: {
      title: "Smoke External Companion",
      language: "en",
      sourceType: "external_embed",
      sourceUrl: "https://example.com/watch"
    }
  });
  const externalProjectId = externalProjectResponse.project.id;
  assert(externalProjectResponse.project.subtitleLineCount === 0, "external companion project has no imported subtitles");

  const rejectedExternalSubtitle = await request(`/api/v1/projects/${externalProjectId}/subtitles`, {
    method: "POST",
    token,
    expectStatus: 400,
    body: {
      subtitleText: `1
00:00:00,000 --> 00:00:02,000
External subtitle.`,
      subtitleFileName: "external.srt",
      subtitleFormat: "srt"
    }
  });
  assert(
    rejectedExternalSubtitle.error?.code === "EXTERNAL_MODE_MANUAL_ONLY",
    "external companion mode rejects full subtitle import"
  );

  const manualText = "Manual sentence.";
  const firstManualAnalysis = await request("/api/v1/analysis/sentence", {
    method: "POST",
    token,
    body: {
      projectId: externalProjectId,
      text: manualText,
      language: "en"
    }
  });
  assert(firstManualAnalysis.cached === false, "first manual analysis is not cached");
  assert(aiHitCount === 3, "manual analysis calls AI provider");

  const secondManualAnalysis = await request("/api/v1/analysis/sentence", {
    method: "POST",
    token,
    body: {
      projectId: externalProjectId,
      text: manualText,
      language: "en"
    }
  });
  assert(secondManualAnalysis.cached === true, "second manual analysis is cached");
  assert(aiHitCount === 3, "cached manual analysis does not call AI provider again");

  const manualSentenceProgress = await request("/api/v1/sentences/progress", {
    method: "POST",
    token,
    body: {
      projectId: externalProjectId,
      manualText,
      isFavorite: true,
      note: "Manual note"
    }
  });
  assert(manualSentenceProgress.progress.isFavorite === true, "manual sentence can be favorited");

  const externalSentenceProgress = await request(`/api/v1/sentences/progress?projectId=${externalProjectId}`, {
    token
  });
  assert(
    externalSentenceProgress.progresses.some(
      (progress) =>
        progress.manualText === manualText &&
        progress.isFavorite === true &&
        progress.note === "Manual note"
    ),
    "manual sentence progress can be restored"
  );

  const manualUnfavorite = await request(`/api/v1/sentences/progress/${manualSentenceProgress.progress.id}`, {
    method: "PATCH",
    token,
    body: {
      isFavorite: false
    }
  });
  assert(manualUnfavorite.progress.isFavorite === false, "manual sentence can be unfavorited");

  await request(`/api/v1/projects/${externalProjectId}`, {
    method: "DELETE",
    token,
    expectEmpty: true
  });

  await request(`/api/v1/projects/${projectId}`, {
    method: "DELETE",
    token,
    expectEmpty: true
  });

  const projectsAfterDelete = await request("/api/v1/projects", { token });
  assert(
    !projectsAfterDelete.projects.some((project) => project.id === projectId),
    "deleted project is removed from project list"
  );
  const favoritesAfterProjectDelete = await request("/api/v1/sentences/favorites", { token });
  assert(
    !favoritesAfterProjectDelete.sentences.some((sentence) => sentence.projectId === projectId),
    "deleted project removes sentence progress and favorites"
  );
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (options.expectStatus) {
    const responseBody = await parseResponseBody(response);
    if (response.status !== options.expectStatus) {
      throw new Error(
        `${options.method ?? "GET"} ${path} expected ${options.expectStatus} but received ${response.status} ${JSON.stringify(responseBody)}`
      );
    }

    return responseBody;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
  }

  if (options.expectEmpty || response.status === 204) {
    return null;
  }

  return response.json();
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function waitForApi() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      await delay(500);
    }
  }

  throw new Error("API server did not become ready");
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function stopProcess(childProcess) {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return;
  }

  sendSignal(childProcess, "SIGINT");

  try {
    await waitForProcessExit(childProcess, 5000);
    return;
  } catch {
    sendSignal(childProcess, "SIGTERM");
  }

  try {
    await waitForProcessExit(childProcess, 3000);
    return;
  } catch {
    sendSignal(childProcess, "SIGKILL");
  }

  await waitForProcessExit(childProcess, 3000);
}

function sendSignal(childProcess, signal) {
  try {
    if (process.platform !== "win32" && childProcess.pid) {
      process.kill(-childProcess.pid, signal);
      return;
    }

    childProcess.kill(signal);
  } catch (error) {
    if (error?.code !== "ESRCH") {
      throw error;
    }
  }
}

function waitForProcessExit(childProcess, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      childProcess.off("exit", onExit);
      reject(new Error("Timed out waiting for child process to exit"));
    }, timeoutMs);

    const onExit = () => {
      clearTimeout(timeout);
      resolve();
    };

    childProcess.once("exit", onExit);
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Smoke assertion failed: ${message}`);
  }
}
