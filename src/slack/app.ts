/**
 * 슬랙 앱(Bolt) 래퍼 — 2차 빌드.
 * CLI와 동일한 코어(generateJD)를 슬랙에서 호출한다.
 * 슬래시 커맨드 `/jd작성 <요청서 텍스트>` → 스레드에 JD 3종 묶음을 게시.
 *
 * 실행: npm run slack  (단, .env 에 SLACK_* 토큰 + ANTHROPIC_API_KEY 필요)
 * Socket Mode 사용 → 공개 URL 없이 로컬에서 구동 가능.
 */
import boltPkg from "@slack/bolt";
import { generateJD } from "../jd-bot.js";
import { loadEnv } from "../env.js";

const { App } = boltPkg;

loadEnv();

const required = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "SLACK_SIGNING_SECRET", "ANTHROPIC_API_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ .env 에 다음 값이 필요합니다: ${missing.join(", ")}`);
  process.exit(1);
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

/** 슬랙 메시지 길이 한도를 고려해 줄 단위로 청크 분할 (기본 3500자) */
function chunk(text: string, size = 3500): string[] {
  const out: string[] = [];
  let buf = "";
  for (const line of text.split("\n")) {
    if (buf.length + line.length + 1 > size && buf) {
      out.push(buf);
      buf = "";
    }
    buf += (buf ? "\n" : "") + line;
  }
  if (buf) out.push(buf);
  return out;
}

// /jd작성 (또는 /jd) 슬래시 커맨드
app.command(/\/jd.*/, async ({ command, ack, respond, client }) => {
  await ack();
  const requestText = command.text?.trim();
  if (!requestText) {
    await respond("채용 요청서 내용을 함께 적어주세요. 예: `/jd작성 담당 직무명: ... 주요 업무: ...`");
    return;
  }

  // 진행 메시지를 채널에 올리고, 그 스레드에 결과를 단다.
  const posted = await client.chat.postMessage({
    channel: command.channel_id,
    text: "⏳ JD 생성 중이에요… (경쟁사 리서치 포함 시 수십 초 걸릴 수 있어요)",
  });
  const threadTs = posted.ts;

  try {
    const jd = await generateJD(requestText, () => {}); // 슬랙은 스트리밍 대신 완성본 게시
    for (const part of chunk(jd)) {
      await client.chat.postMessage({
        channel: command.channel_id,
        thread_ts: threadTs,
        text: part,
      });
    }
    // TODO: 교정표/검토포인트표는 슬랙이 마크다운 표를 렌더하지 않음 →
    //       추후 Block Kit(불릿/필드)로 변환해 가독성 개선.
    await client.chat.postMessage({
      channel: command.channel_id,
      thread_ts: threadTs,
      text: "✅ 완료. 수정이 필요하면 이 스레드에서 알려주세요.",
    });
  } catch (err) {
    await client.chat.postMessage({
      channel: command.channel_id,
      thread_ts: threadTs,
      text: `❌ 오류: ${(err as Error)?.message ?? err}`,
    });
  }
});

await app.start();
console.log("⚡ JD봇 슬랙 앱이 실행 중입니다 (Socket Mode).");
