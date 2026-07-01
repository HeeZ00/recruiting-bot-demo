import type { Feature } from "../core.js";

/** 여러 줄 텍스트 → 항목 배열 (앞 불릿 제거, 빈 줄 제외) */
function toLines(text: string): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-*•·]\s*/, ""))
    .filter(Boolean);
}

// mock 분류용 키워드 (live 모드에선 Claude가 문맥으로 분류)
const POS = /좋|강점|뛰어|우수|인상|훌륭|탄탄|명확|적극|빠르|성실|깊|풍부|강함|플러스|칭찬|설득/;
const NEG = /우려|부족|아쉬|약함|약점|리스크|걱정|미흡|모호|불안|낮|한계|없|짧|의문/;
const CHECK = /확인|체크|궁금|검증|추가|레퍼런스|더\s*알아|재확인|파악/;

/** 기능: 인터뷰 결과 논의 (면접관 피드백 → 강점·우려·추가 확인 사항으로 정리) */
export const debriefFeature: Feature = {
  id: "debrief",
  label: "인터뷰 결과 논의",
  web: false,
  hint: "면접관 피드백을 넣고 '생성'을 누르면 강점·우려·추가 확인 사항으로 정리돼요.",
  inputs: [
    {
      name: "candidate",
      label: "후보자 / 포지션",
      type: "text",
      placeholder: "예: 홍길동 / 백엔드 엔지니어",
    },
    {
      name: "feedback",
      label: "면접관 피드백 (여러 면접관 의견을 한 줄씩 붙여넣기 또는 .txt 업로드)",
      type: "textarea",
      placeholder:
        "면접관들이 남긴 코멘트를 그대로 붙여넣으세요.\n예)\n시스템 설계 깊이가 인상적이었다\n대규모 트래픽 경험은 다소 부족해 보인다\n실제 운영 사례를 다음 라운드에서 더 확인 필요",
      allowFile: true,
    },
  ],

  buildSystem() {
    return [
      "당신은 채용팀의 인터뷰 결과(디브리핑) 정리 봇입니다. 한국어로 작성합니다.",
      "여러 면접관의 피드백을 받아, 채용 담당자가 다음 단계를 판단할 수 있도록 구조화합니다.",
      "[규칙]",
      "- 면접관 피드백을 (1) 강점 (2) 우려 (3) 추가 확인 사항으로 분류·요약한다.",
      "- 서로 엇갈리는 의견이 있으면 그 사실(면접관 간 이견)을 드러낸다.",
      "- 피드백에 근거하고, 없는 내용을 지어내지 않는다.",
      "- 마지막에 종합 의견(진행/보류/추가 검증 등 제안)을 1~2문장으로.",
      "[출력 형식 — 정확히 이 헤더]",
      "## 🧭 인터뷰 결과 정리",
      "### ✅ 강점",
      "### ⚠️ 우려",
      "### 🔎 추가 확인 사항",
      "### 📌 종합 의견",
    ].join("\n");
  },

  buildUser(v) {
    return [
      "다음 면접관 피드백을 강점·우려·추가 확인 사항으로 정리하세요.",
      `후보자/포지션: ${(v.candidate ?? "").trim() || "(미입력)"}`,
      "----- 면접관 피드백 -----",
      (v.feedback ?? "").trim() || "(피드백 미입력)",
      "----- 끝 -----",
    ].join("\n");
  },

  /** mock: 면접관 피드백을 키워드로 강점·우려·추가 확인으로 분류해 배치. (문장 정제·이견 조율은 live) */
  mockText(v) {
    const who = (v.candidate ?? "").trim();
    const lines = toLines(v.feedback ?? "");
    const pos: string[] = [];
    const neg: string[] = [];
    const chk: string[] = [];
    const etc: string[] = [];
    for (const l of lines) {
      if (CHECK.test(l)) chk.push(l);
      else if (NEG.test(l)) neg.push(l);
      else if (POS.test(l)) pos.push(l);
      else etc.push(l);
    }
    const li = (arr: string[], fb: string) => (arr.length ? arr.map((x) => `- ${x}`).join("\n") : `- ${fb}`);

    const blocks = [
      "## 🧭 인터뷰 결과 정리",
      who ? `(후보자/포지션: ${who})` : "",
      "### ✅ 강점",
      li(pos, "(강점으로 분류된 피드백 없음)"),
      "### ⚠️ 우려",
      li(neg, "(우려로 분류된 피드백 없음)"),
      "### 🔎 추가 확인 사항",
      li(chk, "(추가 확인 항목으로 분류된 피드백 없음)"),
    ];
    if (etc.length) {
      blocks.push("### 🗂 기타 (분류 보류)", etc.map((x) => `- ${x}`).join("\n"));
    }
    blocks.push(
      "### 📌 종합 의견",
      lines.length
        ? "강점과 우려를 함께 놓고 다음 단계(진행 / 추가 검증 / 보류)를 결정하세요. (면접관 간 이견 조율·판단 문장은 live 모드에서 완성)"
        : "면접관 피드백을 입력하면 강점·우려·추가 확인 사항으로 정리해드려요."
    );
    return blocks.filter(Boolean).join("\n\n");
  },
};
