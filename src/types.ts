/** Camera-space point. After calibration: +Y is down, smaller Z is closer to the camera. */
export type XYZ = { x: number; y: number; z: number };

export type Side = "right" | "left";

export type FeatureId =
  | "kneeL"
  | "kneeR"
  | "elbowL"
  | "elbowR"
  | "forwardLean"
  | "sideLean"
  | "heading"
  | "stanceWidth"
  | "stanceDepth"
  | "hikite"
  | "tsuriteLift"
  | "wristForwardL"
  | "wristForwardR"
  | "footBackR"
  | "footForwardL"
  | "thighLiftR"
  | "thighForwardR"
  | "ankleLiftR"
  | "footSideR";

export type Features = Partial<Record<FeatureId, number>>;

/** Inclusive good-zone. `slack` is how far outside the zone the score falls to 0. */
export type Target = {
  min: number;
  max: number;
  slack: number;
  weight?: number;
  /** Arc may cross ±180 when min > max. */
  circular?: boolean;
  low?: string;
  high?: string;
  off?: string;
};

export type Pt = [number, number];

/** Mannequin in a y-up drawing space. +x is the side the mirror shows as the user's right. */
export type Stick = {
  head: Pt;
  neck: Pt;
  ls: Pt;
  rs: Pt;
  le: Pt;
  re: Pt;
  lw: Pt;
  rw: Pt;
  lh: Pt;
  rh: Pt;
  lk: Pt;
  rk: Pt;
  la: Pt;
  ra: Pt;
};

export type Phase = {
  id: string;
  name: string;
  japanese: string;
  intent: string;
  /** How long a passing shape must be held before the phase counts, in guided practice. */
  holdMs: number;
  passAt: number;
  ifMissed: string;
  targets: Partial<Record<FeatureId, Target>>;
  stick: Stick;
};

export type ThrowDef = {
  id: string;
  name: string;
  japanese: string;
  family: string;
  summary: string;
  watch: string;
  phases: Phase[];
};
