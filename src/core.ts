import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.JD_BOT_MODEL ?? "claude-opus-4-8";
const WEB_SEARCH_ENABLED = (process.env.JD_BOT_WEB_SEARCH ?? "true") !== "false";

/** 화면에 렌더링할 입력 필드 정의 */
export interface InputField {
  name: string;
  label: string;
  type: "textarea" | "text" | "jd" | "select" | "searchref"; // jd = 생성한 JD 선택 + 붙여넣기, searchref = 타 회사 JD 레퍼런스 검색
  placeholder?: string;
  /** select 타입의 선택지 */
  options?: string[];
  /** textarea 옆 파일(.txt) 업로드 버튼 노출 */
  allowFile?: boolean;
}

/** 기능 모듈 인터페이스 — 각 기능(JD/소싱/면접/브랜딩…)이 이 형태로 플러그인된다. */
export interface Feature {
  id: string;
  label: string;
  /** 결과 영역 빈 상태 안내 문구 (기능별) */
  hint?: string;
  /** true 면 생성 시 web_search 사용 */
  web?: boolean;
  inputs: InputField[];
  buildSystem(): string;
  buildUser(values: Record<string, string>): string;
  /** API 없이 보여줄 골든 레퍼런스 */
  mockText(values: Record<string, string>): string;
}

export interface GenOptions {
  mock?: boolean;
}

const webSearchTool = {
  type: "web_search_20260209" as const,
  name: "web_search" as const,
  max_uses: 5,
};

/** mock: 레퍼런스를 줄 단위로 흘려보내 스트리밍 UX 재현 (API 미호출) */
export async function streamMock(text: string, onText: (d: string) => void): Promise<string> {
  for (const line of text.split("\n")) {
    onText(line + "\n");
    await new Promise((r) => setTimeout(r, 20));
  }
  return text;
}

/** 실제 Claude 호출 (스트리밍 + web_search pause_turn 루프) */
async function callClaude(
  system: string,
  userPrompt: string,
  web: boolean,
  onText: (d: string) => void
): Promise<string> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt }];
  let final = "";

  for (let guard = 0; guard < 6; guard++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      system,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      tools: web && WEB_SEARCH_ENABLED ? [webSearchTool] : [],
      messages,
    });
    stream.on("text", (d) => {
      final += d;
      onText(d);
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }
    break;
  }
  return final;
}

/** 기능 실행: 키 없거나 opts.mock 이면 mock, 아니면 실제 생성 */
export async function runFeature(
  feature: Feature,
  values: Record<string, string>,
  onText: (d: string) => void,
  opts: GenOptions = {}
): Promise<string> {
  const useMock = !!opts.mock || !process.env.ANTHROPIC_API_KEY;
  if (useMock) return streamMock(feature.mockText(values), onText);
  return callClaude(feature.buildSystem(), feature.buildUser(values), feature.web ?? false, onText);
}

/**
 * 타 회사 JD 레퍼런스 검색.
 * - live(키 있음): Claude web_search 로 실제 여러 회사 JD를 찾아 레퍼런스 브리프 작성.
 * - mock(키 없음): 직군 키워드로 라우팅한 예시 브리프를 재생 (과금 0).
 */
export async function searchReference(query: string, opts: GenOptions = {}): Promise<string> {
  const useMock = !!opts.mock || !process.env.ANTHROPIC_API_KEY;
  if (useMock) return mockReference(query);

  const system = [
    "당신은 채용 리서처입니다. 한국어로 작성합니다.",
    "사용자가 준 직무/키워드에 대해 web_search로 여러 회사의 실제 채용공고(JD)를 찾아, JD 작성에 참고할 '레퍼런스 브리프'를 만듭니다.",
    "[규칙]",
    "- 반드시 web_search 결과에 근거한다. 확인되지 않은 회사·내용을 지어내지 않는다.",
    "- 각 회사에 출처 URL을 붙인다.",
    "[출력 형식 — 정확히 이 헤더]",
    "## 🔎 타 회사 JD 레퍼런스: <직무>",
    "- 회사별로: **회사명** — 핵심 책임 3~4개 / 자주 요구되는 자격 3~4개 / 눈에 띄는 표현·복지. (출처: URL)",
    "- 3~5개 회사.",
    "## 📌 공통 패턴",
    "(여러 JD에서 반복되는 요건·표현을 3~5줄로 요약)",
  ].join("\n");
  const user = `직무/키워드: ${query}\n이 직무의 타 회사 JD를 검색해 레퍼런스 브리프를 만들어 주세요.`;
  return callClaude(system, user, true, () => {});
}

/** mock 레퍼런스 브리프 — 제목은 '검색어 그대로', 예시 항목만 직군 키워드로 골라 붙임. */
function mockReference(query: string): string {
  const role = (query || "").trim() || "해당 직무";
  const t = role.toLowerCase();
  let rows: string;
  let pattern: string;
  if (/엔지니어|개발자|backend|백엔드|frontend|프론트엔드|풀스택|devops|sre|소프트웨어|데이터|서버/.test(t)) {
    rows = [
      "- **원티드** — 시스템 설계·개발, 확장 아키텍처, 주요 스택 명시.",
      "- **사람인** — 신뢰성 중심 개발, 코드리뷰·테스트 문화.",
      "- **링크드인** — 대규모 트래픽·실시간 처리 경험 우대.",
    ].join("\n");
    pattern = "- 필수: 경력 N년 + 핵심 언어·프레임워크.\n- 우대: 대규모 트래픽·클라우드 운영 경험.";
  } else if (/마케터|마케팅|세일즈|영업|그로스|pr|홍보|브랜드/.test(t)) {
    rows = [
      "- **원티드** — 캠페인 기획·집행, 채널 성과(ROAS) 최적화.",
      "- **사람인** — 리드젠·라이프사이클, A/B 실험 중심.",
      "- **링크드인** — 그로스·CRM, 리텐션 분석 경험 우대.",
    ].join("\n");
    pattern = "- 필수: 경력 N년 + 채널 운영·성과 최적화.\n- 우대: 데이터 분석 툴·글로벌 경험.";
  } else if (/디자이너|디자인|ux|ui|프로덕트|pm|기획/.test(t)) {
    rows = [
      "- **원티드** — 핵심 플로우 설계, 디자인 시스템 운영.",
      "- **사람인** — 프로토타이핑, PM·개발과 밀착 협업.",
      "- **링크드인** — 0→1 제품 경험, 포트폴리오 필수.",
    ].join("\n");
    pattern = "- 필수: 경력 N년 + 대표 작업물(포트폴리오).\n- 우대: 디자인 시스템 구축·글로벌 제품 경험.";
  } else if (/인사|hr|피플|리크루터|recruit|채용/.test(t)) {
    rows = [
      "- **원티드** — 채용 전반(JD·소싱·면접), 데이터 기반 채용.",
      "- **사람인** — 채용 프로세스 설계·개선, ATS 운영.",
      "- **링크드인** — 다이렉트 소싱, 임플로이어 브랜딩.",
    ].join("\n");
    pattern = "- 필수: 채용 실무 경력 N년 + 소싱·면접 운영.\n- 우대: ATS·데이터 분석·다이렉트 소싱 경험.";
  } else {
    rows = [
      "- **원티드** — 주요 책임·성과 지표, 협업 팀·도구 명시.",
      "- **사람인** — 필수 자격·근무 조건을 표준적으로 정리.",
      "- **링크드인** — 성장 기회·조직 문화 등 차별점 전면.",
    ].join("\n");
    pattern = "- 필수: 경력 N년 + 핵심 역량·도구.\n- 우대: 도메인 경험·글로벌/영어 역량.";
  }
  return [
    `## 🔎 타 회사 JD 레퍼런스: ${role}`,
    "",
    "> 데모를 위한 예시 화면입니다.",
    "",
    rows,
    "",
    "## 📌 공통 패턴",
    pattern,
  ].join("\n");
}
