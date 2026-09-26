import type { XYZ } from "../types";

export const LM = {
  nose: 0,
  lEye: 2,
  rEye: 5,
  lEar: 7,
  rEar: 8,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
  lFoot: 31,
  rFoot: 32,
} as const;

const PAIRS: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [13, 14],
  [15, 16],
  [17, 18],
  [19, 20],
  [21, 22],
  [23, 24],
  [25, 26],
  [27, 28],
  [29, 30],
  [31, 32],
];

export function sub(a: XYZ, b: XYZ): XYZ {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function add(a: XYZ, b: XYZ): XYZ {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function scale(a: XYZ, s: number): XYZ {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dot(a: XYZ, b: XYZ): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: XYZ, b: XYZ): XYZ {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function mag(a: XYZ): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function dist(a: XYZ, b: XYZ): number {
  return mag(sub(a, b));
}

export function mid(a: XYZ, b: XYZ): XYZ {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

export function normalize(a: XYZ): XYZ | null {
  const m = mag(a);
  if (m < 1e-6) return null;
  return scale(a, 1 / m);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function wrap180(d: number): number {
  return (((d + 180) % 360) + 360) % 360 - 180;
}

/** Angle at `b`, in degrees. 180 is a straight line. */
export function angleDeg(a: XYZ, b: XYZ, c: XYZ): number | null {
  const u = sub(a, b);
  const v = sub(c, b);
  const mu = mag(u);
  const mv = mag(v);
  if (mu < 1e-5 || mv < 1e-5) return null;
  const cos = clamp(dot(u, v) / (mu * mv), -1, 1);
  return (Math.acos(cos) * 180) / Math.PI;
}

export type FrameSigns = { ySign: 1 | -1; zSign: 1 | -1 };

/**
 * MediaPipe documents smaller world-Z as closer to the camera, and in practice
 * Y grows downward. Lock the opposite if a clear face frame disagrees.
 */
export function chooseSigns(world: XYZ[]): FrameSigns {
  const shoulderY = (world[LM.lShoulder].y + world[LM.rShoulder].y) / 2;
  const hipY = (world[LM.lHip].y + world[LM.rHip].y) / 2;
  const ySign: 1 | -1 = shoulderY <= hipY ? 1 : -1;
  const noseZ = world[LM.nose].z;
  const shoulderZ = (world[LM.lShoulder].z + world[LM.rShoulder].z) / 2;
  const zSign: 1 | -1 = noseZ <= shoulderZ ? 1 : -1;
  return { ySign, zSign };
}

export function applySigns(world: XYZ[], signs: FrameSigns): XYZ[] {
  return world.map((p) => ({
    x: p.x,
    y: p.y * signs.ySign,
    z: p.z * signs.zSign,
  }));
}

/** Reflect through the hip midline and swap left/right so a left-sided throw matches right-sided targets. */
export function mirrorPose(world: XYZ[]): XYZ[] {
  const hipX = (world[LM.lHip].x + world[LM.rHip].x) / 2;
  const out = world.map((p) => ({ ...p, x: hipX * 2 - p.x }));
  swapPairs(out);
  return out;
}

export function mirrorVisibility(visibility: number[]): number[] {
  const out = visibility.slice();
  swapPairs(out);
  return out;
}

function swapPairs<T>(out: T[]): void {
  for (const [a, b] of PAIRS) {
    const tmp = out[a];
    out[a] = out[b];
    out[b] = tmp;
  }
}
