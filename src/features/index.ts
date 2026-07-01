import type { Feature } from "../core.js";
import { jdFeature } from "./jd.js";
import { interviewFeature } from "./interview.js";
import { debriefFeature } from "./debrief.js";
import { sourcingFeature } from "./sourcing.js";
import { brandingFeature } from "./branding.js";

/**
 * 기능 레지스트리 — 배열 순서가 곧 화면 탭 순서.
 * 흐름: JD 작성 → 인터뷰 질문 → 인터뷰 결과 논의 → 소싱 메시지 → 채용 브랜딩
 */
export const features: Feature[] = [jdFeature, interviewFeature, debriefFeature, sourcingFeature, brandingFeature];

const byId = new Map(features.map((f) => [f.id, f]));

export function getFeature(id: string): Feature | undefined {
  return byId.get(id);
}

/** 화면 탭 렌더용 메타 (시스템 프롬프트 등은 제외) */
export function listFeatures(): { id: string; label: string; hint?: string; inputs: Feature["inputs"] }[] {
  return features.map((f) => ({ id: f.id, label: f.label, hint: f.hint, inputs: f.inputs }));
}
