import { describe, expect, it } from "vitest";
import { compareAttempt, motionAmount } from "../src/pose/compare";
import { extractFeatures } from "../src/pose/features";
import { angleDeg, applySigns, chooseSigns, mirrorPose, wrap180 } from "../src/pose/geometry";
import { advanceHold, arcContains, scorePhase } from "../src/pose/score";
import { THROWS } from "../src/throws";
import type { Features, XYZ } from "../src/types";

function blank(): XYZ[] {
  return Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
}

function baseFacing(): XYZ[] {
  const lm = blank();
  const set = (i: number, x: number, y: number, z: number) => {
    lm[i] = { x, y, z };
  };
  set(0, 0, -0.62, -0.08);
  set(2, 0.03, -0.64, -0.07);
  set(5, -0.03, -0.64, -0.07);
  set(11, 0.18, -0.48, 0);
  set(12, -0.18, -0.48, 0);
  set(13, 0.24, -0.2, -0.04);
  set(14, -0.24, -0.2, -0.04);
  set(15, 0.2, 0.02, -0.1);
  set(16, -0.2, 0.02, -0.1);
  set(23, 0.1, 0.02, 0);
  set(24, -0.1, 0.02, 0);
  set(25, 0.12, 0.48, 0.02);
  set(26, -0.12, 0.48, 0.02);
  set(27, 0.12, 0.92, 0.02);
  set(28, -0.12, 0.92, 0.02);
  return lm;
}

function turn180(world: XYZ[]): XYZ[] {
  const hip = {
    x: (world[23].x + world[24].x) / 2,
    y: 0,
    z: (world[23].z + world[24].z) / 2,
  };
  return world.map((p) => ({ x: hip.x - (p.x - hip.x), y: p.y, z: hip.z - (p.z - hip.z) }));
}

function rotateXZ(world: XYZ[], degrees: number): XYZ[] {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hip = {
    x: (world[23].x + world[24].x) / 2,
    z: (world[23].z + world[24].z) / 2,
  };
  return world.map((p) => {
    const x = p.x - hip.x;
    const z = p.z - hip.z;
    return { x: hip.x + x * c - z * s, y: p.y, z: hip.z + x * s + z * c };
  });
}

function poseTsukuri(): XYZ[] {
  return turn180(baseFacing()).map((p, i) => {
    if (i === 25 || i === 26) return { x: p.x, y: 0.32, z: p.z + 0.2 };
    if (i === 27 || i === 28) return { x: p.x, y: 0.62, z: p.z + 0.04 };
    return p;
  });
}

function poseKake(): XYZ[] {
  return poseTsukuri().map((p, i) => {
    if (i === 11 || i === 12 || i === 0) return { x: p.x, y: p.y + 0.16, z: p.z + 0.28 };
    if (i === 25 || i === 26) return { x: p.x, y: 0.46, z: p.z - 0.08 };
    if (i === 27 || i === 28) return { x: p.x, y: 0.9, z: p.z };
    return p;
  });
}

function poseOsoto(): XYZ[] {
  const osoto = baseFacing().map((p) => ({ ...p }));
  osoto[27] = { x: 0.14, y: 0.9, z: -0.28 };
  osoto[25] = { x: 0.12, y: 0.5, z: -0.1 };
  osoto[28] = { x: -0.16, y: 0.9, z: 0.42 };
  osoto[26] = { x: -0.14, y: 0.48, z: 0.16 };
  osoto[11] = { ...osoto[11], z: -0.12, y: -0.42 };
  osoto[12] = { ...osoto[12], z: -0.12, y: -0.42 };
  osoto[15] = { x: 0.05, y: -0.05, z: -0.28 };
  osoto[16] = { x: -0.22, y: -0.08, z: -0.3 };
  return osoto;
}

function poseSeoi(): XYZ[] {
  const seoi = poseTsukuri().map((p) => ({ ...p }));
  seoi[14] = { x: seoi[12].x + 0.04, y: seoi[12].y - 0.06, z: seoi[12].z + 0.08 };
  seoi[16] = { x: seoi[12].x + 0.02, y: seoi[12].y + 0.02, z: seoi[12].z + 0.12 };
  seoi[25] = { x: seoi[25].x, y: 0.28, z: seoi[25].z + 0.06 };
  seoi[26] = { x: seoi[26].x, y: 0.28, z: seoi[26].z + 0.06 };
  return seoi;
}

function poseUchi(): XYZ[] {
  const uchi = turn180(baseFacing()).map((p) => ({ ...p }));
  uchi[26] = { x: uchi[24].x + 0.04, y: 0.05, z: uchi[24].z + 0.28 };
  uchi[28] = { x: uchi[24].x + 0.02, y: 0.42, z: uchi[24].z + 0.42 };
  uchi[25] = { x: uchi[23].x, y: 0.36, z: uchi[23].z + 0.12 };
  uchi[27] = { x: uchi[23].x, y: 0.78, z: uchi[23].z + 0.02 };
  uchi[11] = { ...uchi[11], y: uchi[11].y + 0.1, z: uchi[11].z + 0.2 };
  uchi[12] = { ...uchi[12], y: uchi[12].y + 0.1, z: uchi[12].z + 0.2 };
  return uchi;
}

function poseSweep(): XYZ[] {
  const sweep = baseFacing().map((p) => ({ ...p }));
  sweep[28] = { x: -0.55, y: 0.9, z: 0.05 };
  sweep[26] = { x: -0.34, y: 0.5, z: 0.03 };
  return sweep;
}

function phase(throwId: string, phaseId: string) {
  const def = THROWS.find((item) => item.id === throwId);
  const found = def?.phases.find((item) => item.id === phaseId);
  if (!def || !found) throw new Error(`missing ${throwId}/${phaseId}`);
  return found;
}

function total(features: Features, throwId: string, phaseId: string): number {
  return scorePhase(features, phase(throwId, phaseId))?.total ?? 0;
}

describe("geometry and features", () => {
  it("measures a right angle and wraps the branch cut", () => {
    const angle = angleDeg({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 });
    expect(angle).toBeCloseTo(90, 5);
    expect(wrap180(180)).toBeCloseTo(-180, 5);
    expect(wrap180(-190)).toBeCloseTo(170, 5);
    expect(arcContains(-170, 115, -115)).toBe(true);
    expect(arcContains(0, 115, -115)).toBe(false);
  });

  it("reads a facing pose, a turned pose, and a mirrored side", () => {
    const ready = extractFeatures(baseFacing());
    expect(ready.heading).toBeCloseTo(0, 0);
    expect(ready.kneeR!).toBeGreaterThan(165);
    expect(extractFeatures(turn180(baseFacing())).heading!).toBeLessThan(-150);

    const turned = extractFeatures(rotateXZ(baseFacing(), 60));
    expect(turned.heading!).toBeGreaterThan(50);
    expect(turned.heading!).toBeLessThan(70);
    expect(extractFeatures(mirrorPose(rotateXZ(baseFacing(), -60))).heading!).toBeGreaterThan(50);

    const osoto = poseOsoto();
    const restored = extractFeatures(mirrorPose(mirrorPose(osoto)));
    const original = extractFeatures(osoto);
    expect(restored.footBackR!).toBeCloseTo(original.footBackR!, 5);
    expect(restored.kneeL!).toBeCloseTo(original.kneeL!, 5);
    expect(extractFeatures(mirrorPose(osoto)).kneeR!).toBeCloseTo(original.kneeL!, 5);
  });

  it("flips axes only when the raw frame disagrees", () => {
    const facing = baseFacing();
    expect(chooseSigns(facing)).toEqual({ ySign: 1, zSign: 1 });
    const flipped = facing.map((p) => ({ x: p.x, y: -p.y, z: -p.z }));
    const signs = chooseSigns(flipped);
    expect(signs).toEqual({ ySign: -1, zSign: -1 });
    const fixed = extractFeatures(applySigns(flipped, signs));
    expect(fixed.heading).toBeCloseTo(0, 0);
    expect(fixed.kneeR!).toBeGreaterThan(165);
  });
});

describe("throw phases", () => {
  const ready = extractFeatures(baseFacing());
  const tsukuri = extractFeatures(poseTsukuri());
  const kake = extractFeatures(poseKake());

  it("accepts the stance and rejects it as a finish", () => {
    expect(total(ready, "o-goshi", "kamae")).toBeGreaterThan(0.74);
    expect(total(ready, "o-goshi", "tsukuri")).toBeLessThan(0.5);
    expect(total(ready, "o-goshi", "kake")).toBeLessThan(0.5);
  });

  it("separates the hip fit from the fold", () => {
    expect(total(tsukuri, "o-goshi", "tsukuri")).toBeGreaterThan(0.72);
    expect(total(kake, "o-goshi", "kake")).toBeGreaterThan(0.72);
    expect(total(tsukuri, "o-goshi", "kake")).toBeLessThan(total(kake, "o-goshi", "kake"));
    expect(total(ready, "o-goshi", "tsukuri")).toBeLessThan(total(tsukuri, "o-goshi", "tsukuri"));
  });

  it("scores each throw's defining shape above the plain stance", () => {
    const osoto = extractFeatures(poseOsoto());
    const seoi = extractFeatures(poseSeoi());
    const uchi = extractFeatures(poseUchi());
    const sweep = extractFeatures(poseSweep());
    expect(total(osoto, "osoto-gari", "reap")).toBeGreaterThan(0.8);
    expect(total(ready, "osoto-gari", "reap")).toBeLessThan(0.55);
    expect(total(seoi, "ippon-seoi-nage", "fit")).toBeGreaterThan(0.8);
    expect(total(ready, "ippon-seoi-nage", "fit")).toBeLessThan(0.45);
    expect(total(uchi, "uchi-mata", "lift")).toBeGreaterThan(0.75);
    expect(total(ready, "uchi-mata", "lift")).toBeLessThan(0.45);
    expect(total(sweep, "de-ashi-barai", "sweep")).toBeGreaterThan(0.8);
    expect(total(ready, "de-ashi-barai", "sweep")).toBeLessThan(0.5);
    expect(total(uchi, "de-ashi-barai", "sweep")).toBeLessThan(total(sweep, "de-ashi-barai", "sweep"));
  });
});

describe("comparison", () => {
  it("holds a passing shape and drains a miss", () => {
    expect(advanceHold(400, 0.9, 400, 0.73, 700)).toEqual({ holdMs: 0, advanced: true });
    expect(advanceHold(500, 0.2, 200, 0.73, 700).holdMs).toBeLessThan(500);
    expect(advanceHold(500, 0.2, 200, 0.73, 700).advanced).toBe(false);
  });

  it("aligns a full path and rejects a freeze", () => {
    const ready = extractFeatures(baseFacing());
    const frozen = Array.from({ length: 16 }, () => ready);
    expect(motionAmount(frozen)).toBeLessThan(0.05);
    const frozenReview = compareAttempt(frozen, THROWS[0]);
    expect(frozenReview.lowMotion).toBe(true);
    expect(frozenReview.overall).toBeNull();

    const ogoshi = THROWS[0];
    const moving: Features[] = [];
    const poses = [baseFacing(), rotateXZ(baseFacing(), 50), poseTsukuri(), poseKake()];
    for (let i = 0; i < poses.length - 1; i++) {
      for (let t = 0; t < 6; t++) {
        const a = extractFeatures(poses[i]);
        const b = extractFeatures(poses[i + 1]);
        const mix: Features = {};
        for (const key of Object.keys(a) as (keyof Features)[]) {
          const av = a[key];
          const bv = b[key];
          if (av === undefined || bv === undefined) continue;
          mix[key] = av + ((bv - av) * (t + 1)) / 6;
        }
        moving.push(mix);
      }
    }
    const review = compareAttempt(moving, ogoshi);
    expect(review.lowMotion).toBe(false);
    expect(review.overall).not.toBeNull();
    expect(review.overall!).toBeGreaterThan(0.55);
    expect(review.phaseOfSample.some((phase) => phase === ogoshi.phases.length - 1)).toBe(true);
  });
});
