import type { FeatureId, Features, XYZ } from "../types";
import {
  LM,
  angleDeg,
  cross,
  dist,
  dot,
  mag,
  mid,
  normalize,
  scale,
  sub,
  wrap180,
} from "./geometry";

/** Typical size of each feature, used to compare them in time-warping. */
export const FEATURE_SCALE: Record<FeatureId, number> = {
  kneeL: 35,
  kneeR: 35,
  elbowL: 40,
  elbowR: 40,
  forwardLean: 20,
  sideLean: 15,
  heading: 45,
  stanceWidth: 0.4,
  stanceDepth: 0.45,
  hikite: 0.35,
  tsuriteLift: 0.25,
  wristForwardL: 0.3,
  wristForwardR: 0.3,
  footBackR: 0.35,
  footForwardL: 0.35,
  thighLiftR: 30,
  thighForwardR: 0.3,
  ankleLiftR: 0.2,
  footSideR: 0.35,
};

const ANATOMICAL: Record<FeatureId, { right: string; left: string }> = {
  kneeL: { right: "Left knee", left: "Right knee" },
  kneeR: { right: "Right knee", left: "Left knee" },
  elbowL: { right: "Left elbow", left: "Right elbow" },
  elbowR: { right: "Right elbow", left: "Left elbow" },
  forwardLean: { right: "Forward fold", left: "Forward fold" },
  sideLean: { right: "Side lean", left: "Side lean" },
  heading: { right: "Chest turn", left: "Chest turn" },
  stanceWidth: { right: "Stance width", left: "Stance width" },
  stanceDepth: { right: "Front-back split", left: "Front-back split" },
  hikite: { right: "Sleeve hand across", left: "Sleeve hand across" },
  tsuriteLift: { right: "Lapel elbow height", left: "Lapel elbow height" },
  wristForwardL: { right: "Sleeve hand forward", left: "Sleeve hand forward" },
  wristForwardR: { right: "Lapel hand forward", left: "Lapel hand forward" },
  footBackR: { right: "Throwing foot behind", left: "Throwing foot behind" },
  footForwardL: { right: "Support foot forward", left: "Support foot forward" },
  thighLiftR: { right: "Throwing thigh lift", left: "Throwing thigh lift" },
  thighForwardR: { right: "Throwing thigh forward", left: "Throwing thigh forward" },
  ankleLiftR: { right: "Sweeping foot height", left: "Sweeping foot height" },
  footSideR: { right: "Sweeping foot reach", left: "Sweeping foot reach" },
};

export function featureLabel(id: FeatureId, side: "right" | "left"): string {
  return ANATOMICAL[id][side];
}

export function formatFeature(id: FeatureId, value: number): string {
  if (
    id === "stanceWidth" ||
    id === "stanceDepth" ||
    id === "hikite" ||
    id === "tsuriteLift" ||
    id === "wristForwardL" ||
    id === "wristForwardR" ||
    id === "footBackR" ||
    id === "footForwardL" ||
    id === "thighForwardR" ||
    id === "ankleLiftR" ||
    id === "footSideR"
  ) {
    return value.toFixed(2);
  }
  return `${Math.round(value)}°`;
}

const WORLD_UP: XYZ = { x: 0, y: -1, z: 0 };
const WORLD_DOWN: XYZ = { x: 0, y: 1, z: 0 };

function seen(visibility: number[] | undefined, index: number): boolean {
  if (!visibility) return true;
  return (visibility[index] ?? 0) >= 0.45;
}

function flatten(v: XYZ, worldUp: XYZ): XYZ | null {
  const along = dot(v, worldUp);
  return normalize(sub(v, scale(worldUp, along)));
}

/**
 * Joint angles and body-relative positions for one pose.
 * Landmarks are anatomical (index 12 is the person's right) in calibrated camera space.
 * `visibility` uses image-landmark scores; omit it in tests.
 */
export function extractFeatures(world: XYZ[], visibility?: number[]): Features {
  const out: Features = {};
  const need = (...idxs: number[]) => idxs.every((i) => seen(visibility, i));

  if (need(LM.lHip, LM.lKnee, LM.lAnkle)) {
    const a = angleDeg(world[LM.lHip], world[LM.lKnee], world[LM.lAnkle]);
    if (a !== null) out.kneeL = a;
  }
  if (need(LM.rHip, LM.rKnee, LM.rAnkle)) {
    const a = angleDeg(world[LM.rHip], world[LM.rKnee], world[LM.rAnkle]);
    if (a !== null) out.kneeR = a;
  }
  if (need(LM.lShoulder, LM.lElbow, LM.lWrist)) {
    const a = angleDeg(world[LM.lShoulder], world[LM.lElbow], world[LM.lWrist]);
    if (a !== null) out.elbowL = a;
  }
  if (need(LM.rShoulder, LM.rElbow, LM.rWrist)) {
    const a = angleDeg(world[LM.rShoulder], world[LM.rElbow], world[LM.rWrist]);
    if (a !== null) out.elbowR = a;
  }

  if (!need(LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip)) return out;

  const midS = mid(world[LM.lShoulder], world[LM.rShoulder]);
  const midH = mid(world[LM.lHip], world[LM.rHip]);
  const torsoLen = Math.max(dist(midS, midH), 0.15);
  const torsoUp = normalize(sub(midS, midH));
  let bodyRight = normalize(sub(world[LM.rShoulder], world[LM.lShoulder]));
  if (!torsoUp || !bodyRight) return out;
  const rightOrtho = normalize(sub(bodyRight, scale(torsoUp, dot(bodyRight, torsoUp))));
  if (!rightOrtho) return out;
  bodyRight = rightOrtho;
  const chest = normalize(cross(torsoUp, bodyRight));
  if (!chest) return out;

  const chestFlat = flatten(chest, WORLD_UP);
  const rightFlat = flatten(bodyRight, WORLD_UP);
  if (chestFlat && rightFlat) {
    out.heading = wrap180((Math.atan2(chestFlat.x, -chestFlat.z) * 180) / Math.PI);
    const upAmount = dot(torsoUp, WORLD_UP);
    out.forwardLean = (Math.atan2(dot(torsoUp, chestFlat), upAmount) * 180) / Math.PI;
    out.sideLean = (Math.atan2(dot(torsoUp, rightFlat), upAmount) * 180) / Math.PI;
  }

  // Steps and hand reach are measured on the horizontal, so a fold does not
  // pretend the feet have stepped forward along the tilted chest.
  const level = chestFlat && rightFlat
    ? (p: XYZ) => {
        const d = sub(p, midH);
        return { x: dot(d, rightFlat), z: dot(d, chestFlat) };
      }
    : null;

  if (level && need(LM.lAnkle, LM.rAnkle)) {
    const la = world[LM.lAnkle];
    const ra = world[LM.rAnkle];
    const flatL = { x: la.x, y: 0, z: la.z };
    const flatR = { x: ra.x, y: 0, z: ra.z };
    out.stanceWidth = dist(flatL, flatR) / torsoLen;
    const bl = level(la);
    const br = level(ra);
    out.stanceDepth = Math.abs(bl.z - br.z) / torsoLen;
    out.footForwardL = bl.z / torsoLen;
    out.footBackR = -br.z / torsoLen;
    out.footSideR = br.x / torsoLen;
    out.ankleLiftR = (la.y - ra.y) / torsoLen;
  }

  if (level && need(LM.lWrist)) {
    const w = level(world[LM.lWrist]);
    out.hikite = w.x / torsoLen;
    out.wristForwardL = w.z / torsoLen;
  }
  if (level && need(LM.rWrist)) {
    out.wristForwardR = level(world[LM.rWrist]).z / torsoLen;
  }
  if (need(LM.rShoulder, LM.rElbow)) {
    out.tsuriteLift = dot(sub(world[LM.rElbow], world[LM.rShoulder]), torsoUp) / torsoLen;
  }
  if (level && need(LM.rHip, LM.rKnee)) {
    const thigh = sub(world[LM.rKnee], world[LM.rHip]);
    const lift = angleDeg(addDown(world[LM.rHip]), world[LM.rHip], world[LM.rKnee]);
    if (lift !== null) out.thighLiftR = lift;
    if (mag(thigh) > 1e-5) out.thighForwardR = level(world[LM.rKnee]).z / torsoLen;
  }

  return out;
}

function addDown(hip: XYZ): XYZ {
  return { x: hip.x + WORLD_DOWN.x, y: hip.y + WORLD_DOWN.y, z: hip.z + WORLD_DOWN.z };
}
