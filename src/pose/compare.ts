import type { FeatureId, Features, ThrowDef } from "../types";
import { FEATURE_SCALE } from "./features";
import { wrap180 } from "./geometry";
import { scorePhase, targetCenter } from "./score";

export type Review = {
  phaseScores: (number | null)[];
  overall: number | null;
  weakest: number | null;
  cues: string[];
  note: string;
  lowMotion: boolean;
  /** Reference phase index aligned to each user sample. -1 if that sample was unused. */
  phaseOfSample: number[];
};

type RefFrame = {
  phase: number;
  values: number[];
  mask: boolean[];
};

function lerp(a: number, b: number, t: number, circular: boolean): number {
  if (!circular) return a + (b - a) * t;
  return wrap180(a + wrap180(b - a) * t);
}

function featureUnion(def: ThrowDef): FeatureId[] {
  const ids = new Set<FeatureId>();
  for (const phase of def.phases) {
    for (const id of Object.keys(phase.targets) as FeatureId[]) ids.add(id);
  }
  return [...ids];
}

function cared(def: ThrowDef, phaseIndex: number, id: FeatureId): boolean {
  return Boolean(def.phases[phaseIndex].targets[id]);
}

function nearestCenter(def: ThrowDef, phaseIndex: number, id: FeatureId): number | null {
  const direct = def.phases[phaseIndex].targets[id];
  if (direct) return targetCenter(direct);
  for (let d = 1; d < def.phases.length; d++) {
    const prev = def.phases[phaseIndex - d]?.targets[id];
    if (prev) return targetCenter(prev);
    const next = def.phases[phaseIndex + d]?.targets[id];
    if (next) return targetCenter(next);
  }
  return null;
}

export function buildReference(def: ThrowDef): { names: FeatureId[]; frames: RefFrame[] } {
  const names = featureUnion(def);
  const frames: RefFrame[] = [];
  def.phases.forEach((phase, phaseIndex) => {
    const samples = Math.max(6, Math.round(phase.holdMs / 120));
    const prev = phaseIndex === 0 ? phaseIndex : phaseIndex - 1;
    for (let i = 0; i < samples; i++) {
      const t = phaseIndex === 0 ? 1 : (i + 1) / samples;
      const eased = t * t * (3 - 2 * t);
      const values: number[] = [];
      const mask: boolean[] = [];
      for (const id of names) {
        const here = nearestCenter(def, phaseIndex, id);
        const before = nearestCenter(def, prev, id);
        const circular = Boolean(phase.targets[id]?.circular || def.phases[prev].targets[id]?.circular);
        values.push(here === null || before === null ? 0 : lerp(before, here, eased, circular));
        mask.push(cared(def, phaseIndex, id) || (eased < 0.999 && cared(def, prev, id)));
      }
      frames.push({ phase: phaseIndex, values, mask });
    }
  });
  return { names, frames };
}

function row(features: Features, names: FeatureId[]): number[] {
  return names.map((id) => {
    const value = features[id];
    return value === undefined || Number.isNaN(value) ? Number.NaN : value;
  });
}

function cost(user: number[], ref: RefFrame, names: FeatureId[]): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < names.length; i++) {
    if (!ref.mask[i] || Number.isNaN(user[i])) continue;
    const d = (user[i] - ref.values[i]) / FEATURE_SCALE[names[i]];
    sum += d * d;
    n += 1;
  }
  return n ? Math.sqrt(sum / n) : 0;
}

/** Classic DTW. Returns the reference index aligned to each user frame. */
export function alignPath(user: number[][], ref: RefFrame[], names: FeatureId[]): number[] {
  const n = user.length;
  const m = ref.length;
  if (n === 0 || m === 0) return [];
  const inf = 1e12;
  const cols = m + 1;
  const dp = new Float64Array((n + 1) * cols).fill(inf);
  const prev = new Int16Array((n + 1) * cols).fill(-1);
  const at = (i: number, j: number) => i * cols + j;
  dp[0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const c = cost(user[i - 1], ref[j - 1], names);
      const choices: [number, number][] = [
        [dp[at(i - 1, j - 1)], 0],
        [dp[at(i - 1, j)], 1],
        [dp[at(i, j - 1)], 2],
      ];
      let best = choices[0];
      for (const choice of choices) if (choice[0] < best[0]) best = choice;
      dp[at(i, j)] = c + best[0];
      prev[at(i, j)] = best[1];
    }
  }
  const path = new Array<number>(n).fill(m - 1);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    path[i - 1] = j - 1;
    const step = prev[at(i, j)];
    if (step === 0) {
      i -= 1;
      j -= 1;
    } else if (step === 1) i -= 1;
    else j -= 1;
  }
  while (i > 0) {
    path[i - 1] = 0;
    i -= 1;
  }
  return path;
}

export function motionAmount(samples: Features[]): number {
  if (samples.length < 3) return 0;
  const ids = Object.keys(FEATURE_SCALE) as FeatureId[];
  const stds: number[] = [];
  for (const id of ids) {
    const values = samples.map((s) => s[id]).filter((v): v is number => v !== undefined && !Number.isNaN(v));
    if (values.length < samples.length * 0.6) continue;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    stds.push(Math.sqrt(variance) / FEATURE_SCALE[id]);
  }
  if (stds.length === 0) return 0;
  return stds.reduce((a, b) => a + b, 0) / stds.length;
}

function meanFeatures(samples: Features[]): Features {
  const acc = new Map<FeatureId, { sum: number; n: number }>();
  for (const sample of samples) {
    for (const id of Object.keys(sample) as FeatureId[]) {
      const value = sample[id];
      if (value === undefined || Number.isNaN(value)) continue;
      const slot = acc.get(id) ?? { sum: 0, n: 0 };
      slot.sum += value;
      slot.n += 1;
      acc.set(id, slot);
    }
  }
  const out: Features = {};
  for (const [id, slot] of acc) out[id] = slot.sum / slot.n;
  return out;
}

export function compareAttempt(samples: Features[], def: ThrowDef): Review {
  const phaseOfSample = new Array<number>(samples.length).fill(-1);
  const lowMotion = motionAmount(samples) < 0.18;
  if (samples.length < 8) {
    return {
      phaseScores: def.phases.map(() => null),
      overall: null,
      weakest: null,
      cues: [],
      note: "That rep was too short to compare. Give the whole path another try, from the stance through the finish.",
      lowMotion: true,
      phaseOfSample,
    };
  }
  if (lowMotion) {
    return {
      phaseScores: def.phases.map(() => null),
      overall: null,
      weakest: null,
      cues: [],
      note: "You held still. A throw is a path — enter, then finish. Study the phases, then record the whole thing.",
      lowMotion: true,
      phaseOfSample,
    };
  }

  const { names, frames } = buildReference(def);
  const rows = samples.map((sample) => row(sample, names));
  const path = alignPath(rows, frames, names);
  const buckets: Features[][] = def.phases.map(() => []);
  path.forEach((refIndex, userIndex) => {
    const phase = frames[refIndex]?.phase ?? 0;
    phaseOfSample[userIndex] = phase;
    buckets[phase].push(samples[userIndex]);
  });

  const phaseScores = def.phases.map((phase, index) => {
    if (buckets[index].length < 2) return null;
    const scored = scorePhase(meanFeatures(buckets[index]), phase);
    return scored ? scored.total : 0;
  });

  const usable = phaseScores.filter((score): score is number => score !== null);
  const overall = usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : null;
  let weakest: number | null = null;
  phaseScores.forEach((score, index) => {
    if (score === null) return;
    if (weakest === null || score < (phaseScores[weakest] ?? 1)) weakest = index;
  });

  const cues: string[] = [];
  if (weakest !== null && (phaseScores[weakest] ?? 1) < 0.82) {
    cues.push(def.phases[weakest].ifMissed);
    const detail = scorePhase(meanFeatures(buckets[weakest]), def.phases[weakest]);
    if (detail?.cues[0]) cues.push(detail.cues[0]);
  }

  const skipped = buckets.findIndex((bucket) => bucket.length < 2);
  const note =
    skipped >= 0
      ? `The path skipped ${def.phases[skipped].name}. ${def.phases[skipped].ifMissed}`
      : weakest !== null && (phaseScores[weakest] ?? 1) < 0.82
        ? def.phases[weakest].ifMissed
        : "The shape of the throw is there. The next gain is a quieter head and the same path, a little cleaner.";

  return { phaseScores, overall, weakest, cues: cues.slice(0, 2), note, lowMotion: false, phaseOfSample };
}
