import type { Feature } from "../core.js";

interface Ctx {
  topic: string;
  orgLine: string;
  target: string;
  forWhom: string;
}

/**
 * 콘텐츠 유형(ctype)이 글의 '형태'를 결정 — 인터뷰=Q&A, 공고=홍보문, 컬처=원칙 나열 등.
 * 각 원소는 하나의 '블록'(문단/리스트). 상위에서 빈 줄("\n\n")로 이어붙인다.
 */
function contentCore(ctype: string, c: Ctx): string[] {
  const { topic, orgLine, target, forWhom } = c;
  const youLine = target ? `특히 ${target}라면 공감하실 이야기예요.` : "이 방향에 공감하는 분과 나누고 싶은 이야기예요.";
  const title = `**${topic}**`;

  if (/인터뷰/.test(ctype)) {
    return [
      title,
      "**Q. 지금 어떤 일을 하고 계세요?**",
      `A. ${orgLine}`,
      "**Q. 입사 전 기대와 입사 후 현실, 가장 달랐던 점은요?**",
      "A. 솔직히 좋았던 점 하나, 아쉬웠던 점 하나를 담아요. (과장 없이)",
      "**Q. 어떤 동료와 함께 일하고 싶으세요?**",
      `A. ${target ? `${target} 같은 분과 함께라면 좋겠어요.` : "이 방향에 공감하는 분이요."}`,
    ];
  }
  if (/공고/.test(ctype)) {
    return [
      title,
      orgLine,
      "그래서 지금, 이 일을 함께할 분을 찾고 있어요. 합류하면 초반 3개월은 핵심 업무에 빠르게 익숙해지고, 이후 본인만의 영역을 만들어가게 돼요.",
      `${forWhom} 잘 맞는 자리예요.`,
    ];
  }
  if (/컬처|컬쳐|팀/.test(ctype)) {
    return [
      title,
      "우리 팀이 일하는 방식을 세 가지로 요약하면 이래요.",
      ["- 결정의 근거를 투명하게 공유해요.", "- 작게 실험하고, 빠르게 배워요.", "- 실패를 탓하기보다 배움으로 바꿔요."].join("\n"),
      orgLine,
      youLine,
    ];
  }
  if (/직무/.test(ctype)) {
    return [
      title,
      orgLine,
      "이 직무에서 성과를 내는 분들은 대개 공통점이 있어요 — 문제를 스스로 정의하고, 작게 실험하며, 결과를 숫자로 말해요.",
      "우리 팀에선 이 직무가 이런 도구·방식으로 일해요. (구체적인 스택·협업 방식을 여기에 채워요.)",
      youLine,
    ];
  }
  // 자유/기본
  return [
    title,
    orgLine,
    "여기서 무엇을 하고, 왜 하는지, 그리고 함께하면 무엇을 얻는지를 담백하게 풀어써요.",
    target ? `${target}에게 가닿도록 썼어요.` : "",
  ].filter(Boolean);
}

/** 채널(channel)이 '포맷'을 결정 — 해시태그·CTA·길이 프레이밍. 각 원소 = 1블록. */
function channelTail(channel: string, tag: string, forWhom: string): string[] {
  if (/인스타/.test(channel))
    return ["👉 프로필 링크에서 지원", `#채용 #팀문화 #성장 #스타트업채용 #커리어 #일잘러 #${tag} #hiring`];
  if (/블로그/.test(channel)) return ["_(채용 블로그: 소제목을 나눠 서사형으로 길게 완성 — live 모드)_"];
  if (/공고\s*상단/.test(channel)) return [`${forWhom} 딱 맞는 자리예요. 지금 지원해요.`];
  // 링크드인(기본)
  return ["👉 [지원하기]", `#채용 #${tag} #팀문화`];
}

/**
 * 주제 정제: 추천 소재 줄을 통째로 붙여넣어도 '제목'만 깔끔히 추출.
 * 예: `1. **"이 일을 잘하는 사람의 공통점"** — 역량 기준을 구체적으로.` → `이 일을 잘하는 사람의 공통점`
 */
function cleanTopic(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^\s*\d+[.)]\s*/, ""); // 앞 번호
  t = t.replace(/\*\*/g, ""); // 볼드 마크
  t = t.split(/\s+[—–-]\s+/)[0]; // 첫 ' — 후킹' 앞부분만
  t = t.replace(/^["'“”‘’]+/, "").replace(/["'“”‘’.]+$/, "").trim(); // 앞뒤 따옴표·마침표
  return t;
}

/** 해시태그용: 한글/영문/숫자만 남김 */
function hashtag(topic: string): string {
  return topic.replace(/[^0-9A-Za-z가-힣]/g, "") || "채용";
}

/** 콘텐츠 유형(ctype)마다 실제로 다른 소재 세트를 제안 */
function contentIdeas(ctype: string, t: string): string[] {
  let ideas: [string, string][];
  if (/공고/.test(ctype)) {
    ideas = [
      ["이 포지션이 특별한 이유 3가지", "왜 지금, 왜 이 자리인지 한눈에"],
      ["합류하면 첫 3개월, 이런 일을 해요", "구체적인 업무를 미리보기로"],
      ["우리가 찾는 사람 vs 아닌 사람", "솔직한 fit 안내로 지원 정확도↑"],
      ["지원부터 합류까지, 채용 과정 한눈에", "프로세스를 투명하게 공개"],
      ["이 자리를 새로 만든 배경", "조직의 방향과 이 채용을 연결"],
      ["합류자에게 주는 것", "보상·성장·환경을 구체적으로"],
    ];
  } else if (/컬처|컬쳐|팀/.test(ctype)) {
    ideas = [
      ["우리가 일하는 3가지 원칙", "문화를 추상어 대신 원칙으로"],
      ["회의는 이렇게 해요", "실제 협업·의사결정 방식 공개"],
      ["우리 팀이 싫어하는 것", "안티패턴으로 문화를 또렷하게"],
      ["실패를 다루는 방식", "심리적 안전감이 드러나는 앵글"],
      ["입사 첫 주 온보딩 풍경", "합류 직후 경험을 미리 보여주기"],
      ["우리 팀의 자랑거리 하나", "구체적 사례로 진정성 있게"],
    ];
  } else if (/인터뷰/.test(ctype)) {
    ideas = [
      ["입사 전 기대 vs 입사 후 현실", "솔직한 후기로 신뢰 형성"],
      ["하루 일과를 시간대별로", "업무의 실제 결을 보여주기"],
      ["가장 기억에 남는 프로젝트", "성취와 배움을 스토리로"],
      ["이직을 결심한 이유, 그리고 지금", "합류 동기에 공감 포인트"],
      ["함께 일하는 동료를 소개한다면", "팀 분위기를 사람으로 전달"],
      ["합류를 고민 중인 분께 한마디", "따뜻한 초대로 마무리"],
    ];
  } else if (/직무/.test(ctype)) {
    ideas = [
      ["이 직무, 우리 회사에선 이렇게 달라요", "타사와의 차별점을 명확히"],
      ["이 일을 잘하는 사람의 공통점", "역량 기준을 구체적으로"],
      ["하루 업무를 실제 예시로", "직무의 현실을 투명하게"],
      ["이 직무가 성장하는 경로", "커리어 패스를 그림으로"],
      ["함께 쓰는 팀·툴 스택", "실무 환경을 미리 공개"],
      ["이 직무의 오해와 진실", "지원 전 궁금증 해소"],
    ];
  } else {
    ideas = [
      [`${t}가 가장 궁금해하는 것`, "솔직하게 답하는 콘텐츠"],
      ["우리 팀의 하루", "실제 일하는 방식을 보여주기"],
      ["이 일을 하면 얻는 것", `${t}에게 주는 성장·기회`],
      ["우리가 일하는 원칙", "문화를 한 문장으로 정의"],
      ["합류 여정 한눈에", "지원부터 온보딩까지"],
      ["솔직한 회사 자랑 하나", "구체적 사례로 진정성 있게"],
    ];
  }
  return ideas.map(([title, hook], i) => `${i + 1}. **"${title}"** — ${hook}.`);
}

/**
 * 기능: 채용 브랜딩 콘텐츠 제작 (글 작성 도구).
 * - 주제를 비우면 '소재 추천 모드' → 콘텐츠 소재를 제안.
 * - 주제가 있으면 '작성 모드' → 콘텐츠 유형이 형태를, 채널이 포맷을 결정.
 */
export const brandingFeature: Feature = {
  id: "branding",
  label: "채용 브랜딩",
  web: false,
  hint: "주제를 비우고 '생성'하면 소재를 추천해줘요. 마음에 드는 소재를 주제 칸에 넣고 다시 생성하면 본문을 써줘요.",
  inputs: [
    {
      name: "org",
      label: "회사/조직 소개 (참고 콘텐츠 — 미션·하는 일·말투를 학습해요)",
      type: "textarea",
      placeholder: "이 조직의 미션·하는 일·브랜드 보이스를 붙여넣으면 그 톤으로 콘텐츠를 써요. (비워도 동작)",
      allowFile: true,
    },
    {
      name: "ctype",
      label: "콘텐츠 유형",
      type: "select",
      options: ["채용 공고 홍보", "팀·컬처 소개", "재직자 인터뷰", "직무 브랜딩", "자유"],
    },
    {
      name: "channel",
      label: "채널 (톤·길이가 자동 조절돼요)",
      type: "select",
      options: ["링크드인", "인스타그램", "채용 블로그", "채용 공고 상단"],
    },
    {
      name: "target",
      label: "타겟 독자 (선택)",
      type: "text",
      placeholder: "예: 개발자·마케터·세일즈 등 다양한 포지션의 잠재 후보자",
    },
    {
      name: "topic",
      label: "주제 (비우면 소재를 추천해줘요)",
      type: "textarea",
      placeholder: "소재가 떠오르면 적고, 아니면 비운 채로 생성 → 추천 소재 중 골라 다시 생성하세요.",
    },
    {
      name: "points",
      label: "꼭 담고 싶은 메시지 (선택)",
      type: "text",
      placeholder: "예: 글로벌 도전, 빠른 실험 문화, 성장 기회",
    },
  ],

  buildSystem() {
    return [
      "당신은 채용팀의 채용 브랜딩 콘텐츠 작성 봇입니다. 한국어로 작성합니다.",
      "회사를 매력적인 일터로 알리는 콘텐츠를 만드는 '글쓰기 도구'로 동작합니다.",
      "두 가지 모드가 있습니다 — 사용자 입력의 '모드' 지시를 따르세요.",
      "[소재 추천 모드] 주제가 비어 있을 때. 입력된 콘텐츠 유형/채널/타겟에 맞는 콘텐츠 소재 6개를 제안합니다.",
      "  각 소재: **제목/앵글** + 한 줄 후킹 + (추천 채널/포맷). 맨 끝에 '마음에 드는 소재를 주제 칸에 넣고 다시 생성하세요' 안내 한 줄.",
      "  출력 헤더: '## 💡 추천 소재'.",
      "[작성 모드] 주제가 있을 때. 그 주제로 콘텐츠 본문을 작성합니다. 출력 헤더: '## ✨ 콘텐츠 본문' + '## 🔁 대안 헤드라인 (3개)'.",
      "[채널별 톤·포맷 — 선택된 채널에 맞춰 자동 조절]",
      "  - 링크드인: 전문적·담백, 250자 내외 단락형, 마지막에 CTA. 해시태그 3~5개.",
      "  - 인스타그램: 짧고 감각적, 줄바꿈 많이, 이모지 적절히, 해시태그 8~12개.",
      "  - 채용 블로그: 서사형, 소제목 포함 길게.",
      "  - 채용 공고 상단: 임팩트 있는 한 줄 + 짧은 3~4문장.",
      "[공통 규칙]",
      "  - 사용자가 제공한 [회사/조직 소개]에서 미션·하는 일·말투를 학습해 콘텐츠에 연결하고 '왜 여기서 일하면 좋은지'를 전면에. 없으면 일반적인 톤으로 쓰되 회사 고유 사실을 지어내지 않는다.",
      "  - 과장·클리셰('열정 가득', '가족 같은') 금지. 구체적·진정성 있게. 어조는 참고 콘텐츠의 보이스를 따른다(없으면 담백하고 초대하는 톤).",
      "[공통 출력 끝에]",
      "## ⚠️ 검토포인트표\n| 항목 | 내용 | 사유 |\n|---|---|---|\n(사실확인·링크·톤 조정 등. 없으면 '검토 포인트 없음')",
    ].join("\n");
  },

  buildUser(v) {
    const topic = (v.topic ?? "").trim();
    const head = topic
      ? ["모드: 작성", `주제: ${topic}`]
      : ["모드: 소재 추천 (주제가 비어 있음 → 소재 6개 제안)"];
    return [
      ...head,
      `콘텐츠 유형: ${(v.ctype ?? "").trim() || "자유"}`,
      `채널: ${(v.channel ?? "").trim() || "링크드인"}`,
      v.target?.trim() ? `타겟 독자: ${v.target.trim()}` : "",
      v.points?.trim() ? `꼭 담을 메시지: ${v.points.trim()}` : "",
      v.org?.trim() ? `----- 회사/조직 소개 (이 톤·미션을 학습) -----\n${v.org.trim()}` : "",
    ].filter(Boolean).join("\n");
  },

  /** mock: 입력한 유형·채널·타겟·주제를 반영한 skeleton. (API 미호출) */
  mockText(v) {
    const ctype = (v.ctype ?? "").trim() || "자유";
    const channel = (v.channel ?? "").trim() || "링크드인";
    const target = (v.target ?? "").trim();
    const topicRaw = (v.topic ?? "").trim();
    const topic = cleanTopic(topicRaw); // 추천 소재 줄을 통째로 붙여넣어도 제목만 사용
    const org = (v.org ?? "").trim();
    const points = (v.points ?? "").trim();
    const meta = `(유형: ${ctype} / 채널: ${channel}${target ? ` / 타겟: ${target}` : ""})`;

    // 소재 추천 모드 (주제 비어 있음) — 소재는 채널 무관(작성 후 여러 채널로 재활용)
    if (!topicRaw) {
      const t = target || "지원자";
      return [
        "## 💡 추천 소재",
        `(유형: ${ctype}${target ? ` / 타겟: ${target}` : ""})`,
        "",
        ...contentIdeas(ctype, t),
        "",
        "👉 마음에 드는 소재를 골라 왼쪽 '주제' 칸에 넣고 다시 생성하면 본문을 써드려요.",
        "",
        "## ⚠️ 검토포인트표",
        "| 항목 | 내용 | 사유 |",
        "|---|---|---|",
        `| 입력 인식 | 유형 '${ctype}'${target ? ` / 타겟 '${target}'` : ""} 반영 (소재는 채널 무관) | 입력 기준 |`,
      ].join("\n");
    }

    // 작성 모드 (주제 있음) — 콘텐츠 유형이 '형태'를, 채널이 '포맷'을 결정
    const orgLine = org
      ? org.split(/\r?\n/).find((l) => l.trim().length > 8)?.trim() ?? org.slice(0, 120)
      : "우리가 하는 일과 일하는 방식을 여기에서 자연스럽게 연결하세요.";
    const tag = hashtag(topic);
    const forWhom = target ? `${target}에게` : "함께할 동료에게";
    const core = contentCore(ctype, { topic, orgLine, target, forWhom });
    const tail = channelTail(channel, tag, forWhom);
    const headlines = [
      `1. "${topic}, 우리는 이렇게 합니다"`,
      `2. "${topic} — 여기서 일하면 달라지는 것"`,
      `3. "${topic}, 궁금하지 않으세요?"`,
    ].join("\n");
    const table = [
      "| 항목 | 내용 | 사유 |",
      "|---|---|---|",
      `| 입력 인식 | 유형 '${ctype}' / 채널 '${channel}' / 주제 '${topic}' 반영 | 입력 기준 |`,
      "| 구성 방식 | 콘텐츠 유형이 글의 형태(예: 인터뷰→Q&A)를, 채널이 포맷(해시태그·길이)을 결정 | 유형·채널 분기 |",
    ].join("\n");

    // 각 원소를 '블록'으로 보고 빈 줄로 이어붙임 → 문단·리스트가 확실히 분리됨
    return [
      "## ✨ 콘텐츠 본문",
      `${meta} — 유형 '${ctype}' 형태 · 채널 '${channel}' 포맷`,
      ...core,
      ...tail,
      points ? `> 꼭 담을 메시지: ${points}` : "",
      "## 🔁 대안 헤드라인 (3개)",
      headlines,
      "## ⚠️ 검토포인트표",
      table,
    ].filter(Boolean).join("\n\n");
  },
};
