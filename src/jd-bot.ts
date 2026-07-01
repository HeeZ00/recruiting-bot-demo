import { runFeature, type GenOptions } from "./core.js";
import { jdFeature } from "./features/jd.js";

/**
 * 하위호환 래퍼 — CLI/슬랙이 쓰는 진입점.
 * 코어 엔진(runFeature) + JD 기능 모듈로 위임한다.
 */
export function generateJD(
  requestText: string,
  onText: (delta: string) => void,
  opts: GenOptions = {}
): Promise<string> {
  return runFeature(jdFeature, { request: requestText }, onText, opts);
}
