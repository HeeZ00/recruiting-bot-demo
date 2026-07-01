import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { generateJD } from "./jd-bot.js";
import { loadEnv } from "./env.js";

/** stdin 전체를 문자열로 읽기 (파일 인자가 없을 때) */
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  loadEnv();

  const args = process.argv.slice(2);
  const mock = args.includes("--mock") || process.env.JD_BOT_MOCK === "true";
  const fileArg = args.find((a) => !a.startsWith("--"));

  // mock 모드는 키 없이 동작 (API 미호출)
  if (!mock && !process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY 가 없습니다. .env 에 키를 넣거나, 키 없이 보려면 --mock 을 붙이세요.");
    process.exit(1);
  }

  let requestText: string;

  if (fileArg) {
    const path = resolve(process.cwd(), fileArg);
    if (!existsSync(path)) {
      console.error(`❌ 파일을 찾을 수 없습니다: ${fileArg}`);
      process.exit(1);
    }
    requestText = readFileSync(path, "utf8");
  } else if (!process.stdin.isTTY) {
    requestText = await readStdin();
  } else {
    console.error("사용법: npm run jd -- <채용요청서.txt>   또는   cat 요청서.txt | npm run jd");
    process.exit(1);
  }

  if (!requestText.trim()) {
    console.error("❌ 채용 요청서 내용이 비어 있습니다.");
    process.exit(1);
  }

  console.error(
    mock
      ? "🧪 [mock 모드] API 호출 없이 골든 레퍼런스를 재생합니다 (과금 0).\n"
      : "⏳ JD 생성 중… (경쟁사 리서치 포함 시 수십 초 걸릴 수 있어요)\n"
  );
  await generateJD(requestText, (delta) => process.stdout.write(delta), { mock });
  process.stdout.write("\n");
}

main().catch((err) => {
  console.error("\n❌ 오류:", err?.message ?? err);
  process.exit(1);
});
