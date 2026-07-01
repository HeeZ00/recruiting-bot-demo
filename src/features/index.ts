import type { Feature } from "../core.js";
import { jdFeature } from "./jd.js";
import { sourcingFeature } from "./sourcing.js";
import { interviewFeature } from "./interview.js";
import { brandingFeature } from "./branding.js";

/** 기능 레지스트리 — 새 기능은 여기 배열에 추가하면 화면 탭/엔드포인트에 자동 반영 */
export const features: Feature[] = [jdFeature, sourcingFeature, interviewFeature, brandingFeature];

const byId = new Map(features.map((f) => [f.id, f]));

export function getFeature(id: string): Feature | undefined {
  return byId.get(id);
}

/** 화면 탭 렌더용 메타 (시스템 프롬프트 등은 제외) */
export function listFeatures(): { id: string; label: string; hint?: string; inputs: Feature["inputs"] }[] {
  return features.map((f) => ({ id: f.id, label: f.label, hint: f.hint, inputs: f.inputs }));
}
