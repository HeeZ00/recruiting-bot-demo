/**
 * 웹 화면 서버 — 메인 UI.
 * 브라우저에서 채용요청 입력 → JD 생성(화면 표시) → "슬랙으로 알림" 발송.
 * 코어(generateJD)를 그대로 재사용. 키 없으면 자동으로 mock 모드.
 *
 * 실행: npm run web  →  http://localhost:3000
 */
import express from "express";
import { resolve } from "node:path";
import { runFeature, searchReference } from "../core.js";
import { listFeatures, getFeature } from "../features/index.js";
import { loadEnv } from "../env.js";

loadEnv();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(resolve(process.cwd(), "src/web/public")));

const hasKey = !!process.env.ANTHROPIC_API_KEY;

// 화면이 시작 상태를 알 수 있게
app.get("/api/status", (_req, res) => {
  res.json({ hasKey, slackConfigured: !!process.env.SLACK_WEBHOOK_URL });
});

// 화면 탭 목록
app.get("/api/features", (_req, res) => {
  res.json(listFeatures());
});

// 생성 (기능 선택 + 다중 입력 필드, 키 없으면 자동 mock)
app.post("/api/generate", async (req, res) => {
  const featureId: string = req.body?.feature ?? "jd";
  const values: Record<string, string> = req.body?.values ?? {};
  const feature = getFeature(featureId);
  if (!feature) {
    res.status(400).json({ error: `알 수 없는 기능: ${featureId}` });
    return;
  }
  const filled = Object.values(values).some((v) => typeof v === "string" && v.trim());
  if (!filled) {
    res.status(400).json({ error: "입력 내용이 비어 있어요." });
    return;
  }
  const useMock = Boolean(req.body?.mock) || !hasKey;
  try {
    const output = await runFeature(feature, values, () => {}, { mock: useMock });
    res.json({ output, mock: useMock, label: feature.label });
  } catch (e) {
    res.status(500).json({ error: (e as Error)?.message ?? String(e) });
  }
});

// 타 회사 JD 레퍼런스 검색 (live: web_search, mock: 예시 브리프)
app.post("/api/search-reference", async (req, res) => {
  const query: string = (req.body?.query ?? "").trim();
  if (!query) {
    res.status(400).json({ error: "검색할 직무/키워드를 입력해 주세요." });
    return;
  }
  const useMock = Boolean(req.body?.mock) || !hasKey;
  try {
    const output = await searchReference(query, { mock: useMock });
    res.json({ output, mock: useMock });
  } catch (e) {
    res.status(500).json({ error: (e as Error)?.message ?? String(e) });
  }
});

// 슬랙 알림 발송 (Incoming Webhook)
app.post("/api/notify", async (req, res) => {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    res.status(400).json({ error: "SLACK_WEBHOOK_URL 이 .env 에 없어요. (슬랙 Incoming Webhook URL)" });
    return;
  }
  const text: string = req.body?.text ?? "";
  if (!text.trim()) {
    res.status(400).json({ error: "보낼 알림 내용이 비어 있어요." });
    return;
  }
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) throw new Error(`Slack 응답 ${r.status}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error)?.message ?? String(e) });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`🌐 JD봇 웹 화면: http://localhost:${port}`);
  console.log(hasKey ? "   (실제 생성 모드 — API 키 감지됨)" : "   (mock 모드 — 키 없이 동작, 과금 0)");
});
