import type { Review } from "./pose/compare";
import type { PhaseScore } from "./pose/score";
import type { Features, Side } from "./types";

export type Mode = "pick" | "study" | "guided" | "countdown" | "record" | "review" | "summary";

export type Sample = {
  t: number;
  features: Features;
  points: { x: number; y: number; v: number }[];
};

export type Progress = Record<string, { guided?: number; free?: number }>;

export type AppState = {
  throwId: string;
  side: Side;
  mode: Mode;
  phaseIndex: number;
  drill: boolean;
  holdMs: number;
  guidedScores: (number | null)[];
  live: PhaseScore | null;
  cue: string;
  also: string;
  caption: string;
  status: string;
  banner: string;
  showLite: boolean;
  sound: boolean;
  /** Horizontal mirror of the camera. Default is the opposite of the previous fixed mirror. */
  flipX: boolean;
  /** Vertical mirror of the camera. Default is the opposite of the previous upside-down correction. */
  flipY: boolean;
  cameraOn: boolean;
  docsOpen: boolean;
  countdown: number;
  samples: Sample[];
  review: Review | null;
  scrub: number;
  studyPlaying: boolean;
  progress: Progress;
};

export function progressKey(throwId: string, side: Side): string {
  return `${throwId}:${side}`;
}
