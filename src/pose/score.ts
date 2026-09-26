import type { FeatureId, Features, Phase, Target } from "../types";
import { wrap180 } from "./geometry";

export type PartScore = {
  id: FeatureId;
  value: number;
  score: number;
  target: Target;
};

export type PhaseScore = {
  total: number;
  parts: PartScore[];
  cues: string[];
  coverage: number;
};

export function arcContains(value: number, min: number, max: number): boolean {
  const v = wrap180(value);
  if (min <= max) return v >= min && v <= max;
  return v >= min || v <= max;
}

export function arcDistance(value: number, min: number, max: number): number {
  if (arcContains(value, min, max)) return 0;
  const v = wrap180(value);
  return Math.min(Math.abs(wrap180(v - min)), Math.abs(wrap180(v - max)));
}

export function targetCenter(target: Target): number {
  if (target.circular && target.min > target.max) {
    const span = 180 - target.min + (target.max + 180);
    return wrap180(target.min + span / 2);
  }
  return (target.min + target.max) / 2;
}

export function scoreTarget(value: number, target: Target): number {
  const dist = target.circular
    ? arcDistance(value, target.min, target.max)
    : value < target.min
      ? target.min - value
      : value > target.max
        ? value - target.max
        : 0;
  if (dist <= 0) return 1;
  const slack = Math.max(target.slack, 1e-6);
  return Math.max(0, 1 - dist / slack);
}

export function scorePhase(features: Features, phase: Phase): PhaseScore | null {
  const parts: PartScore[] = [];
  let weightSum = 0;
  let available = 0;
  for (const id of Object.keys(phase.targets) as FeatureId[]) {
    const target = phase.targets[id];
    if (!target) continue;
    const w = target.weight ?? 1;
    weightSum += w;
    const value = features[id];
    if (value === undefined || Number.isNaN(value)) continue;
    available += w;
    parts.push({ id, value, score: scoreTarget(value, target), target });
  }
  if (weightSum <= 0) return null;
  const coverage = available / weightSum;
  if (coverage < 0.6 || parts.length === 0) return null;

  let acc = 0;
  let wAcc = 0;
  for (const part of parts) {
    const w = part.target.weight ?? 1;
    acc += part.score * w;
    wAcc += w;
  }
  let total = acc / wAcc;
  // A heavily weighted piece is the point of the phase. Matching everything else
  // cannot pass a reap, a sweep, or a turn that never happened.
  const keyMiss = parts.some((part) => (part.target.weight ?? 1) >= 1.5 && part.score < 0.25);
  if (keyMiss) total = Math.min(total, 0.42);
  const cues = parts
    .filter((part) => speaksAbout(part))
    .sort((a, b) => miss(b) - miss(a))
    .map((part) => cueFor(part))
    .filter((cue): cue is string => Boolean(cue))
    .slice(0, 2);

  return { total, parts, cues, coverage };
}

/** One line for the board: the miss that defines this phase, cut to the action. */
export function coachLine(phase: Phase, result: PhaseScore): string {
  const lead = [...result.parts].filter(speaksAbout).sort((a, b) => miss(b) - miss(a))[0];
  if (!lead) return result.total >= phase.passAt ? "Hold." : phase.intent;
  const text = cueFor(lead) ?? phase.intent;
  const action = text.split(/(?<=[.!?])\s/)[0] ?? text;
  if (lead.score >= 0.62) return `Almost. ${action}`;
  return action;
}

/** Heavy features get a note while they are still off. Small ones only if they are clearly wrong. */
function speaksAbout(part: PartScore): boolean {
  const weight = part.target.weight ?? 1;
  if (weight >= 1.5) return part.score < 0.9;
  return part.score < 0.55;
}

function miss(part: PartScore): number {
  return (1 - part.score) * (part.target.weight ?? 1);
}

function cueFor(part: PartScore): string | undefined {
  if (part.target.off) return part.target.off;
  const below = part.target.circular
    ? signedArcSide(part.value, part.target) < 0
    : part.value < part.target.min;
  return below ? part.target.low : part.target.high;
}

/** Negative when the value sits on the min side of a circular arc. */
function signedArcSide(value: number, target: Target): number {
  const v = wrap180(value);
  const toMin = wrap180(target.min - v);
  const toMax = wrap180(target.max - v);
  // Closer endpoint wins; the sign says which boundary we missed.
  if (Math.abs(toMin) < Math.abs(toMax)) return -1;
  return 1;
}

export function advanceHold(
  holdMs: number,
  score: number | null,
  dtMs: number,
  passAt: number,
  needMs: number,
): { holdMs: number; advanced: boolean } {
  if (score === null) return { holdMs: Math.max(0, holdMs - dtMs * 0.35), advanced: false };
  const next = score >= passAt ? holdMs + dtMs : Math.max(0, holdMs - dtMs * 0.65);
  if (next >= needMs) return { holdMs: 0, advanced: true };
  return { holdMs: next, advanced: false };
}
