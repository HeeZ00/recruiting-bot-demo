import type { Feature } from "../core.js";

/** "이름 / 현재직장 / 경력..." 형태의 대상자 정보에서 이름과 배경 요약을 뽑는다. */
function parseTarget(target: string): { name: string; background: string } {
  const parts = target
    .split(/[\/\n,·]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const name = parts[0] || "OO";
  const background = parts.slice(1).join(", ") || "관련 경력";
  return { name, background };
}

/** 기능 3: 다이렉트 소싱 메시지 작성 (개인화 제안 메시지, 플랫폼별) */
export const sourcingFeature: Feature = {
  id: "sourcing",
  label: "소싱 메시지",
  web: false,
  hint: "왼쪽에 대상자·포지션 정보를 넣고 '생성'을 누르면 링크드인·이메일 메시지가 나와요.",
  inputs: [
    {
      name: "target",
      label: "대상자 정보",
      type: "textarea",
      placeholder: "이름 / 현재 직장·직무 / 주요 경력 요약",
    },
    {
      name: "position",
      label: "제안 포지션",
      type: "text",
      placeholder: "예: 백엔드 엔지니어 / 세일즈 매니저 / HR Generalist / Recruiter",
    },
    {
      name: "org",
      label: "회사/조직 소개 (참고 콘텐츠 — 미션·하는 일·말투를 학습해요)",
      type: "textarea",
      placeholder: "이 조직의 미션·하는 일·브랜드 보이스를 붙여넣으면 그 톤으로 메시지를 써요. (비워도 동작)",
      allowFile: true,
    },
    {
      name: "emphasis",
      label: "강조 포인트 (선택)",
      type: "text",
      placeholder: "프로젝트·기술스택·복지 등 특별히 어필할 내용",
    },
  ],

  buildSystem() {
    return [
      "당신은 채용팀의 다이렉트 소싱 메시지 작성 봇입니다. 한국어로 작성합니다.",
      "대상자 정보와 제안 포지션을 받아, 개인화된 영입 제안 메시지를 작성합니다.",
      "[규칙]",
      "- 톤: 정중하고 따뜻하게. 스팸/과장 느낌 금지. 대상자의 경력에서 구체적인 지점을 짚어 '왜 당신인지'가 드러나게.",
      "- 사용자가 제공한 [회사/조직 소개]에서 미션·하는 일·말투를 학습해 메시지에 자연스럽게 연결한다. 없으면 일반적인 톤으로 쓰되 회사 고유 사실을 지어내지 않는다.",
      "- 길이: 링크드인용은 짧고 캐주얼하게, 이메일용은 조금 더 격식 있게. 두 버전 모두 제시.",
      "- 상대가 바로 복사해 보낼 수 있는 완성형으로.",
      "[출력 형식 — 정확히 이 헤더]",
      "## 💬 링크드인 메시지",
      "## 📧 이메일 메시지",
      "## ⚠️ 검토포인트표\n| 항목 | 내용 | 사유 |\n|---|---|---|\n(개인화가 약한 부분, 확인이 필요한 정보 등. 없으면 '검토 포인트 없음')",
    ].join("\n\n");
  },

  buildUser(v) {
    return [
      "다음 정보로 소싱 메시지를 작성하세요.",
      `제안 포지션: ${(v.position ?? "").trim()}`,
      v.emphasis?.trim() ? `강조 포인트: ${v.emphasis.trim()}` : "",
      v.org?.trim() ? `----- 회사/조직 소개 (이 톤·미션을 학습) -----\n${v.org.trim()}` : "",
      "----- 대상자 정보 -----",
      (v.target ?? "").trim(),
      "----- 끝 -----",
    ].filter(Boolean).join("\n");
  },

  /** mock: 입력한 대상자·포지션·회사 소개를 그대로 반영한 메시지 skeleton. (API 미호출) */
  mockText(v) {
    const { name, background } = parseTarget((v.target ?? "").trim());
    const position = (v.position ?? "").trim() || "이 포지션";
    const emphasis = (v.emphasis ?? "").trim();
    const org = (v.org ?? "").trim();
    const orgLine = org
      ? `저희가 하는 일을 짧게 소개드리면 — ${org.split(/\r?\n/).find((l) => l.trim().length > 8)?.trim() ?? org.slice(0, 120)}`
      : "저희는 좋은 동료와 함께 성장하는 팀이에요.";

    const table = [
      "| 항목 | 내용 | 사유 |",
      "|---|---|---|",
      `| 대상자 | 이름 '${name}' / 배경 '${background}' 로 입력 인식 | 대상자 정보 파싱 결과 |`,
      "| 발신자 | 서명·발신자 정보는 실제 담당자로 교체 필요 | 자리표시자 |",
    ].join("\n");

    // 각 원소를 '블록'으로 보고 빈 줄로 이어붙임 → 문단이 확실히 분리됨
    return [
      "## 💬 링크드인 메시지",
      `안녕하세요, ${name}님. 채용 관련해 조심스레 연락드려요.`,
      `${name}님의 이력(${background})을 인상 깊게 봤어요. 그 경험이 저희가 찾는 **${position}** 포지션과 잘 맞닿아 있다고 느꼈습니다.`,
      emphasis ? `특히 ${emphasis} 부분에서 함께 만들어갈 수 있는 게 많을 것 같아요.` : "",
      orgLine,
      "혹시 가볍게 이야기 나눠볼 수 있을까요? 편하신 시간 알려주시면 맞추겠습니다. 🙂",
      "## 📧 이메일 메시지",
      `제목: ${position} 포지션 제안 드립니다`,
      `${name}님, 안녕하세요. 채용 담당자입니다.`,
      `${name}님의 이력(${background})을 보고 연락드립니다. 저희가 진행 중인 **${position}** 채용과 잘 맞는 분이라고 생각했어요.`,
      emphasis ? `특히 ${emphasis} 관점에서 기여해 주실 수 있을 것 같습니다.` : "",
      orgLine,
      "관심 있으시면 30분 정도 편하게 이야기 나누고 싶어요. 가능한 시간대를 알려주시면 일정 잡겠습니다.",
      "감사합니다.",
      "## ⚠️ 검토포인트표",
      table,
    ].filter(Boolean).join("\n\n");
  },
};
