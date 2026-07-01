import type { Feature } from "../core.js";
import { REFERENCE_LEARNING_RULE, JD_STRUCTURE_GUIDE, OUTPUT_FORMAT } from "../tone-guide.js";

/** 목적격 조사: 받침 있으면 '을', 없으면 '를' (한글이 아니면 기본 '를') */
function objJosa(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "를";
  return (code - 0xac00) % 28 !== 0 ? "을" : "를";
}

/** 여러 줄 텍스트 → 불릿 항목 배열 (앞 불릿기호 제거, 빈 줄 제외) */
function toBullets(text: string): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-*•·]\s*|^\d+[.)]\s*/, ""))
    .filter(Boolean);
}

/** 참고 콘텐츠에서 소개 블록에 쓸 의미있는 문장 2~3줄 발췌 (대괄호 헤더·불릿·짧은 줄 제외) */
function refSnippet(ref: string): string[] {
  return ref
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10 && !l.startsWith("[") && !/^[-*•]/.test(l))
    .slice(0, 3);
}

/** 기능 1: JD 작성 (참고 콘텐츠에서 조직 보이스 학습, 시장 트렌드 web_search 사용) */
export const jdFeature: Feature = {
  id: "jd",
  label: "JD 작성",
  web: true,
  hint: "포지션명·주요업무·자격요건·우대사항을 넣고 '생성'을 누르면 JD 초안·교정표·검토포인트표가 나와요. '참고 콘텐츠'에 회사 소개를 넣으면 그 톤을 반영해요.",
  inputs: [
    {
      name: "position",
      label: "채용 포지션명(직무명)",
      type: "text",
      placeholder: "예: 백엔드 엔지니어 / 퍼포먼스 마케터 / 세일즈 매니저 / HR Generalist / Recruiter",
    },
    {
      name: "refsearch",
      label: "타 회사 JD 레퍼런스 검색 (비우면 위 포지션명으로 검색 → 오른쪽 패널에 표시)",
      type: "searchref",
      placeholder: "예: 백엔드 엔지니어",
    },
    {
      name: "duties",
      label: "주요업무",
      type: "textarea",
      placeholder: "한 줄에 하나씩 적어주세요.\n예)\n채용 전반(JD 작성·소싱·면접 운영)\n데이터 기반 채용 프로세스 개선",
    },
    {
      name: "requirements",
      label: "자격요건 (필수요건)",
      type: "textarea",
      placeholder: "한 줄에 하나씩 적어주세요.\n예)\n채용 실무 경력 3년 이상\n소싱·면접 운영 경험",
    },
    {
      name: "preferred",
      label: "우대사항",
      type: "textarea",
      placeholder: "한 줄에 하나씩 적어주세요.\n예)\nATS 운영 경험\n글로벌 채용 경험",
    },
    {
      name: "reference",
      label: "참고 콘텐츠 (이 회사/조직의 기존 JD·회사 소개·브랜드 보이스 — 붙여넣기 또는 .txt 업로드)",
      type: "textarea",
      placeholder:
        "이 조직의 기존 채용공고나 회사 소개를 붙여넣으면 그 미션·말투·구조를 학습해 같은 톤으로 작성해요. (비워도 동작하지만 톤은 일반 모범 사례)",
      allowFile: true,
    },
  ],

  buildSystem() {
    return [
      "당신은 채용팀의 JD 작성 보조 봇입니다. 한국어로 작성합니다.",
      "아래 톤·구조 규칙은 협상 불가의 고정 규칙입니다. 매번 그대로 적용하세요.",
      "단, 조직 고유의 미션·말투·소개 문구는 하드코딩하지 않고, 사용자가 제공한 [참고 콘텐츠]에서 학습합니다.",
      REFERENCE_LEARNING_RULE,
      JD_STRUCTURE_GUIDE,
      OUTPUT_FORMAT,
      "필요하면 web_search로 동일 직무의 시장 JD 트렌드를 조사한 뒤 작성하되, 규칙 6(시장 표준 갭 처리)을 지키세요.",
    ].join("\n\n");
  },

  buildUser(v) {
    const ref = (v.reference ?? "").trim();
    const role = (v.position ?? "").trim();
    const sec = (label: string, val?: string) => (val?.trim() ? `[${label}]\n${val.trim()}` : "");
    const request = [sec("주요업무", v.duties), sec("자격요건", v.requirements), sec("우대사항", v.preferred)]
      .filter(Boolean)
      .join("\n\n");
    return [
      "다음 채용 요청 정보를 바탕으로 JD 3종 묶음을 작성하세요.",
      role
        ? `채용 포지션명(직무명): ${role}`
        : "직무명이 명시되지 않았으니 업무 내용에서 합리적으로 추론하고, 검토포인트표에 추론 근거를 남기세요.",
      ref
        ? "먼저 아래 [참고 콘텐츠]에서 이 조직의 미션·말투·구조를 학습해 그 톤으로 작성하세요."
        : "[참고 콘텐츠]가 비어 있으니 일반 모범 사례 톤으로 작성하고, 검토포인트표에 톤 확인 필요를 남기세요.",
      "----- 채용 요청 -----",
      request || "(내용 미입력)",
      "----- 참고 콘텐츠 -----",
      ref || "(없음)",
      "----- 끝 -----",
    ].join("\n");
  },

  /**
   * mock: 입력한 포지션명·주요업무·자격요건·우대사항을 그대로 반영한 JD 초안 skeleton.
   * API 미호출 — 문장 다듬기·시장 리서치·조직 보이스 학습은 live 모드에서.
   */
  mockText(v) {
    const ref = (v.reference ?? "").trim();
    const roleRaw = (v.position ?? "").trim();
    const role = roleRaw || "직무 미입력";
    const duties = toBullets(v.duties ?? "");
    const musts = toBullets(v.requirements ?? "");
    const prefers = toBullets(v.preferred ?? "");
    const li = (arr: string[], fallback: string) =>
      arr.length ? arr.map((x) => `- ${x}`).join("\n") : `- ${fallback}`;

    const refLines = ref ? refSnippet(ref) : [];
    const introBlock = refLines.length
      ? [`> 💡 **${role} 채용**`, ...refLines.map((l) => `> ${l}`)]
      : [
          `> 💡 **${role} 채용**`,
          "> (조직 소개 블록 — 참고 콘텐츠를 넣으면 그 조직의 미션·말투가 이 자리에 반영돼요.)",
        ];

    return [
      "## 📄 JD 초안",
      "",
      ...introBlock,
      "",
      `우리는 함께 성장할 **${role}**${objJosa(role)} 찾고 있어요.`,
      "",
      "### 주요업무",
      li(duties, "(주요업무 칸에 항목을 입력해 주세요)"),
      "",
      "### 자격요건",
      li(musts, "(자격요건 칸에 항목을 입력해 주세요)"),
      "",
      "### 우대사항",
      li(prefers, "(우대사항 칸에 항목을 입력해 주세요)"),
      "",
      "## 🔧 교정·수정표",
      "| 위치 | 원문 | 수정 | 사유 |",
      "|---|---|---|---|",
      "| — | — | — | 교정 사항 없음 |",
      "",
      "## ⚠️ 검토포인트표",
      "| 항목 | 내용 | 사유/출처 |",
      "|---|---|---|",
      roleRaw
        ? `| 직무 인식 | '${role}' 로 인식 | 포지션명 입력 기준 |`
        : "| 직무 미입력 | 포지션명을 찾지 못했어요 | 상단 '채용 포지션명' 칸에 직무명을 입력해 주세요 |",
      ref
        ? "| 조직 보이스 | 참고 콘텐츠의 소개 문단을 반영했어요 | 톤 확인 |"
        : "| 조직 보이스 | 참고 콘텐츠 없음 — 소개 블록이 일반 문구로 채워짐 | 톤 확인 필요 |",
    ].join("\n");
  },
};
