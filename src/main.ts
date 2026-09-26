import { chime } from "./audio";
import { drawSkeleton } from "./draw";
import { compareAttempt } from "./pose/compare";
import { extractFeatures } from "./pose/features";
import { mirrorPose, mirrorVisibility } from "./pose/geometry";
import { advanceHold, coachLine, scorePhase } from "./pose/score";
import type { AppState, Progress } from "./state";
import { progressKey } from "./state";
import { bodyVisible, CameraTracker, DEV_CAMERA_UPSIDE_DOWN } from "./tracker";
import { mount } from "./ui";
import { throwById } from "./throws";

const PROGRESS_KEY = "uchikomi.progress.v1";

const video = must<HTMLVideoElement>("#video");
const skeleton = must<HTMLCanvasElement>("#skeleton");
const mirror = must<HTMLElement>("#mirror");
const tracker = new CameraTracker(video);

const state: AppState = {
  throwId: "o-goshi",
  side: "right",
  mode: "guided",
  phaseIndex: 0,
  drill: false,
  holdMs: 0,
  guidedScores: [],
  live: null,
  cue: "",
  also: "",
  caption: "",
  status: "",
  banner: "",
  showLite: false,
  sound: true,
  cameraOn: false,
  countdown: 0,
  samples: [],
  review: null,
  scrub: 0,
  studyPlaying: false,
  progress: loadProgress(),
};

let lastNow = performance.now();
let recordMark = 0;
let lastSample = 0;
let countdownUntil = 0;

let loopOn = false;
let switchingDelegate = false;

const ui = mount({
  onThrow: (id) => selectThrow(id),
  onSide: (side) => {
    state.side = side;
    state.holdMs = 0;
  },
  onPhase: (index) => {
    const def = throwById(state.throwId);
    state.phaseIndex = clamp(index, 0, def.phases.length - 1);
    state.holdMs = 0;
    state.mode = "guided";
    state.cue = holdLine(currentPhase().intent, performance.now());
    state.caption = phaseCaption();
    if (!tracker.cameraOn) void beginGuided(false);
  },
});

must("#sound").addEventListener("click", () => {
  state.sound = !state.sound;
  if (state.sound) chime(440, 0.08, 0.03);
});
must("#flip").addEventListener("click", () => {
  tracker.flipDepth();
  state.status = tracker.userFlipZ === -1 ? "Depth flipped" : "Depth at the model's default";
});
must("#use-lite").addEventListener("click", () => {
  void tracker.open("full").then(() => {
    state.banner = "";
    state.showLite = false;
    state.status = "Pose landmarker full";
  });
});

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const def = throwById(state.throwId);
  if (event.key === "ArrowRight") {
    state.phaseIndex = Math.min(def.phases.length - 1, state.phaseIndex + 1);
    state.holdMs = 0;
    state.studyPlaying = false;
  } else if (event.key === "ArrowLeft") {
    state.phaseIndex = Math.max(0, state.phaseIndex - 1);
    state.holdMs = 0;
    state.studyPlaying = false;
  } else if (/^[1-5]$/.test(event.key)) {
    const item = ["o-goshi", "ippon-seoi-nage", "osoto-gari", "uchi-mata", "de-ashi-barai"][Number(event.key) - 1];
    if (item) selectThrow(item);
  }
});

openShell();

function openShell(): void {
  const def = throwById(state.throwId);
  state.cue = def.phases[0].intent;
  state.caption = `${def.phases[0].name}  ·  ${def.phases[0].japanese}`;
  ensureLoop();
  void beginGuided(true);
  paint();
}

function ensureLoop(): void {
  if (loopOn) return;
  loopOn = true;
  requestAnimationFrame(tick);
}

function selectThrow(id: string): void {
  state.throwId = id;
  state.phaseIndex = 0;
  state.holdMs = 0;
  state.review = null;
  state.samples = [];
  state.drill = false;
  state.studyPlaying = false;
  state.mode = "guided";
  state.cue = holdLine(currentPhase().intent, performance.now());
  state.caption = phaseCaption();
  if (!tracker.cameraOn) void beginGuided(true);
}

async function beginGuided(fromStart: boolean): Promise<void> {
  const def = throwById(state.throwId);
  if (fromStart) state.phaseIndex = 0;
  state.guidedScores = def.phases.map(() => null);
  state.holdMs = 0;
  state.review = null;
  state.studyPlaying = false;
  try {
    await ensureCamera();
  } catch (error) {
    state.mode = "guided";
    state.status = error instanceof Error ? error.message : "Camera unavailable";
    state.caption = phaseCaption();
    return;
  }
  state.mode = "guided";
  state.cue = currentPhase().intent;
  state.caption = phaseCaption();
}

async function ensureCamera(): Promise<void> {
  if (!tracker.cameraOn) await tracker.startCamera();
  state.cameraOn = true;
  state.mode = "guided";
  if (!tracker.model) await tracker.open("heavy");
}

function releaseCamera(): void {
  if (!tracker.cameraOn) {
    state.cameraOn = false;
    return;
  }
  tracker.stopCamera();
  state.cameraOn = false;
  state.showLite = false;
}

function tick(now: number): void {
  const dt = Math.min(80, now - lastNow);
  lastNow = now;
  const phase = currentPhase();

  if (state.mode === "review") {
    drawReview();
  } else if (state.cameraOn) {
    mirror.hidden = false;
    video.style.visibility = "visible";
    video.style.opacity = DEV_CAMERA_UPSIDE_DOWN ? "0" : "1";
    const frame = tracker.detect();
    if (!frame) {
      state.caption = "Looking for you…";
      paintCamera(null);
    } else {
      const visible = bodyVisible(frame.visibility);
      const world = state.side === "left" ? mirrorPose(frame.world) : frame.world;
      const visibility = state.side === "left" ? mirrorVisibility(frame.visibility) : frame.visibility;
      const features = visible ? extractFeatures(world, visibility) : null;
      if (!visible || !features) {
        state.live = null;
        state.cue = holdLine("Step back until your head and both feet are in the picture.", now);
        state.also = "";
        state.caption = "Whole body";
        state.holdMs = Math.max(0, state.holdMs - dt);
      } else if (state.mode === "guided") {
        const scored = scorePhase(features, phase);
        const step = advanceHold(state.holdMs, scored?.total ?? null, dt, phase.passAt, phase.holdMs);
        state.holdMs = step.holdMs;
        const rawCue = scored ? coachLine(phase, scored) : "I can't see enough of that pose to score it.";
        state.cue = holdLine(rawCue, now);
        state.also = "";
        state.live = scored ? { ...scored, total: smoothShown(scored.total) } : null;
        state.caption = phaseCaption();
        if (step.advanced) onPhaseCaught(scored?.total ?? phase.passAt);
      } else if (state.mode === "countdown") {
        const left = Math.max(0, countdownUntil - now);
        state.countdown = Math.ceil(left / 1000);
        state.caption = left > 0 ? String(state.countdown) : "Throw";
        state.cue = "Set the stance. The rep starts at the end of the count.";
        state.also = "";
        state.live = scorePhase(features, currentPhase());
        if (left <= 0) {
          state.mode = "record";
          state.samples = [];
          recordMark = now;
          lastSample = 0;
          if (state.sound) chime(640, 0.1, 0.05);
          state.caption = "Throw";
        }
      } else if (state.mode === "record") {
        state.live = null;
        state.cue = "Go through the whole throw, then stop. Slow is fine.";
        state.also = "";
        state.caption = `Recording ${(Math.min(8000, now - recordMark) / 1000).toFixed(1)}s`;
        if (now - lastSample > 100) {
          lastSample = now;
          state.samples.push({ t: now - recordMark, features, points: frame.points });
        }
        if (now - recordMark > 8000) finishRecord();
      } else if (state.mode === "summary") {
        state.caption = "Phases done";
        state.live = null;
      }
      paintCamera(frame.points);
    }
    if (tracker.sawGpuError && tracker.model && !switchingDelegate) {
      switchingDelegate = true;
      const model = tracker.model;
      void tracker.open(model, "CPU").then(() => {
        state.status = `Pose landmarker · ${model} · CPU`;
      }).finally(() => {
        switchingDelegate = false;
      });
    }
    if (tracker.slow && tracker.model === "full") {
      state.banner = "The heavy model is falling behind on this machine.";
      state.showLite = true;
    }
  }

  paint();
  requestAnimationFrame(tick);
}

function onPhaseCaught(score: number): void {
  const def = throwById(state.throwId);
  state.guidedScores[state.phaseIndex] = Math.max(state.guidedScores[state.phaseIndex] ?? 0, score);
  if (state.drill) {
    if (state.sound) chime(520, 0.12, 0.04);
    state.cue = "Caught. Match it again, or run every phase.";
    return;
  }
  if (state.phaseIndex >= def.phases.length - 1) {
    finishGuided();
    return;
  }
  if (state.sound) chime(520, 0.12, 0.04);
  state.phaseIndex += 1;
  state.holdMs = 0;
  state.cue = currentPhase().intent;
  state.caption = phaseCaption();
}

function finishGuided(): void {
  const scores = state.guidedScores.filter((score): score is number => score !== null);
  const overall = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  remember("guided", overall);
  state.mode = "guided";
  state.phaseIndex = 0;
  state.holdMs = 0;
  state.guidedScores = throwById(state.throwId).phases.map(() => null);
  state.cue = holdLine(currentPhase().intent, performance.now());
  state.caption = phaseCaption();
  if (state.sound) chime(660, 0.16, 0.05);
}

let cueHeld = "";
let cueUntil = 0;
let shownScore: number | null = null;

function holdLine(next: string, now: number): string {
  if (next === cueHeld) {
    cueUntil = now + 900;
    return cueHeld;
  }
  if (cueHeld && now < cueUntil) return cueHeld;
  cueHeld = next;
  cueUntil = now + 900;
  return cueHeld;
}

function smoothShown(next: number): number {
  shownScore = shownScore === null ? next : shownScore + 0.18 * (next - shownScore);
  return shownScore;
}

function finishRecord(): void {
  const def = throwById(state.throwId);
  state.review = compareAttempt(
    state.samples.map((sample) => sample.features),
    def,
  );
  state.scrub = Math.max(0, state.samples.length - 1);
  state.mode = "review";
  if (state.review.overall !== null) remember("free", state.review.overall);
  state.cue = state.review.note;
  state.caption = "Your rep";
  releaseCamera();
  if (state.sound) chime(580, 0.12, 0.04);
}

function paintCamera(points: { x: number; y: number; v: number }[] | null): void {
  const ctx = skeleton.getContext("2d");
  const frame = videoFrame();
  if (!ctx || !frame) return;
  ctx.setTransform(frame.scaleX, 0, 0, frame.scaleY, frame.offsetX, frame.offsetY);
  const underlay = DEV_CAMERA_UPSIDE_DOWN ? tracker.preview ?? undefined : undefined;
  if (!points) {
    ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);
    if (underlay) ctx.drawImage(underlay, 0, 0, video.videoWidth, video.videoHeight);
    return;
  }
  drawSkeleton(ctx, points, video.videoWidth, video.videoHeight, state.live, state.side, underlay);
}

function drawReview(): void {
  const sample = state.samples[state.scrub];
  const def = throwById(state.throwId);
  mirror.hidden = false;
  video.style.visibility = "hidden";
  const phaseIndex = state.review?.phaseOfSample[state.scrub] ?? 0;
  const phase = def.phases[phaseIndex] ?? def.phases[0];
  state.caption = sample ? `${phase.name}  ·  ${(sample.t / 1000).toFixed(1)}s` : "No frames";
  if (!sample) return;
  state.live = scorePhase(sample.features, phase);
  const ctx = skeleton.getContext("2d");
  const frame = videoFrame();
  if (!ctx || !frame) return;
  ctx.setTransform(frame.scaleX, 0, 0, frame.scaleY, frame.offsetX, frame.offsetY);
  drawSkeleton(ctx, sample.points, video.videoWidth || skeleton.width, video.videoHeight || skeleton.height, state.live, state.side);
}

/** Map video pixels onto the fixed stage the same way object-fit: cover does. */
function videoFrame(): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } | null {
  const boxW = mirror.clientWidth;
  const boxH = mirror.clientHeight;
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (!boxW || !boxH || !srcW || !srcH) return null;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(2, Math.round(boxW * dpr));
  const height = Math.max(2, Math.round(boxH * dpr));
  if (skeleton.width !== width || skeleton.height !== height) {
    skeleton.width = width;
    skeleton.height = height;
  }
  const scale = Math.max(boxW / srcW, boxH / srcH);
  return {
    scaleX: scale * dpr,
    scaleY: scale * dpr,
    offsetX: ((boxW - srcW * scale) / 2) * dpr,
    offsetY: ((boxH - srcH * scale) / 2) * dpr,
  };
}

function currentPhase() {
  const def = throwById(state.throwId);
  return def.phases[clamp(state.phaseIndex, 0, def.phases.length - 1)];
}

function phaseCaption(): string {
  const def = throwById(state.throwId);
  const phase = currentPhase();
  return `${state.phaseIndex + 1} / ${def.phases.length}  ·  ${phase.name}`;
}

function paint(): void {
  ui.paint(state);
}

function remember(kind: "guided" | "free", score: number): void {
  const key = progressKey(state.throwId, state.side);
  const prev = state.progress[key]?.[kind] ?? 0;
  if (score <= prev) return;
  state.progress = {
    ...state.progress,
    [key]: { ...state.progress[key], [kind]: score },
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progress));
}

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function must<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node as T;
}
