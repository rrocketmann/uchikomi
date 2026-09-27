import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { applySigns, chooseSigns, LM, mirrorPose, mirrorVisibility, type FrameSigns } from "./pose/geometry";
import type { XYZ } from "./types";

const MODELS = {
  heavy: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task",
  full: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  lite: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
} as const;

export type ModelName = keyof typeof MODELS;

export type Frame = {
  points: { x: number; y: number; v: number }[];
  world: XYZ[];
  visibility: number[];
};

const FACE = [LM.nose, LM.lEye, LM.rEye, LM.lEar, LM.rEar];

export class CameraTracker {
  landmarker: PoseLandmarker | null = null;
  model: ModelName | null = null;
  delegate: "GPU" | "CPU" | null = null;
  sawGpuError = false;
  /** Camera frame after the up/down and left/right flips. Pose and the drawing use this copy. */
  preview: HTMLCanvasElement | null = null;
  /**
   * Opposite of the old default (180° rotation plus a horizontal mirror, which netted a vertical flip only).
   * Left/right starts on, up/down starts off.
   */
  flipX = true;
  flipY = false;
  signs: FrameSigns = { ySign: 1, zSign: 1 };
  calibrated = false;
  userFlipZ: 1 | -1 = 1;
  slow = false;
  private stream: MediaStream | null = null;
  private lastTs = -1;
  private worldFilter: OneEuro3[] | null = null;
  private imageFilter: OneEuro2[] | null = null;
  private filterAt = 0;
  private times: number[] = [];

  constructor(private video: HTMLVideoElement) {}

  async open(model: ModelName, prefer: "GPU" | "CPU" = "GPU"): Promise<void> {
    this.landmarker?.close();
    this.landmarker = null;
    this.lastTs = -1;
    this.worldFilter = null;
    this.imageFilter = null;
    this.filterAt = 0;
    this.times = [];
    this.slow = false;
    this.sawGpuError = false;
    const base = import.meta.env.BASE_URL;
    const wasmRoot = `${base.endsWith("/") ? base : `${base}/`}wasm`;
    const vision = await FilesetResolver.forVisionTasks(wasmRoot);
    const build = (delegate: "GPU" | "CPU") =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODELS[model], delegate },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.6,
        minPosePresenceConfidence: 0.6,
        minTrackingConfidence: 0.65,
      });
    if (prefer === "CPU") {
      this.landmarker = await build("CPU");
      this.delegate = "CPU";
    } else {
      try {
        this.landmarker = await build("GPU");
        this.delegate = "GPU";
      } catch {
        this.landmarker = await build("CPU");
        this.delegate = "CPU";
      }
    }
    this.model = model;
  }

  async startCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser has no camera API. Study mode still works.");
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    this.video.srcObject = this.stream;
    await this.video.play();
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.worldFilter = null;
    this.imageFilter = null;
  }

  get cameraOn(): boolean {
    return Boolean(this.stream);
  }

  flipDepth(): void {
    this.userFlipZ = this.userFlipZ === 1 ? -1 : 1;
    this.worldFilter = null;
    this.imageFilter = null;
  }

  setOrientation(flipX: boolean, flipY: boolean): void {
    if (this.flipX === flipX && this.flipY === flipY) return;
    this.flipX = flipX;
    this.flipY = flipY;
    this.calibrated = false;
    this.signs = { ySign: 1, zSign: 1 };
    this.worldFilter = null;
    this.imageFilter = null;
  }

  detect(): Frame | null {
    if (!this.landmarker || this.video.readyState < 2) return null;
    let ts = performance.now();
    if (ts <= this.lastTs) ts = this.lastTs + 0.1;
    this.lastTs = ts;
    const started = performance.now();
    const source = this.orientedFrame();
    if (!source) return null;
    let result;
    try {
      result = this.landmarker.detectForVideo(source, ts);
    } catch {
      if (this.delegate === "GPU") this.sawGpuError = true;
      return null;
    }
    this.noteTime(performance.now() - started);
    const image = result.landmarks[0];
    const worldRaw = result.worldLandmarks[0];
    if (!image || !worldRaw || image.length < 33) return null;

    const imageVisibility = image.map((point) => point.visibility ?? 0);
    let visibility = imageVisibility.slice();
    let raw = worldRaw.map((point) => ({ x: point.x, y: point.y, z: point.z }));
    if (this.flipX !== this.flipY) {
      raw = mirrorPose(raw);
      visibility = mirrorVisibility(visibility);
    }
    if (!this.calibrated && FACE.every((index) => visibility[index] > 0.55)) {
      this.signs = chooseSigns(raw);
      this.calibrated = true;
      this.worldFilter = null;
    }
    const zSign: 1 | -1 = this.signs.zSign * this.userFlipZ === -1 ? -1 : 1;
    const corrected = applySigns(raw, { ySign: this.signs.ySign, zSign });
    const dt = this.filterAt === 0 ? 0 : Math.min(0.1, (ts - this.filterAt) / 1000);
    this.filterAt = ts;
    const world = this.smoothWorld(corrected, visibility, dt);
    const points = this.smoothImage(image, imageVisibility, dt);
    return { world, visibility, points };
  }

  private orientedFrame(): HTMLCanvasElement | null {
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    if (!w || !h) return null;
    if (!this.preview) this.preview = document.createElement("canvas");
    if (this.preview.width !== w || this.preview.height !== h) {
      this.preview.width = w;
      this.preview.height = h;
    }
    const ctx = this.preview.getContext("2d");
    if (!ctx) return this.preview;
    const sx = this.flipX ? -1 : 1;
    const sy = this.flipY ? -1 : 1;
    ctx.setTransform(sx, 0, 0, sy, this.flipX ? w : 0, this.flipY ? h : 0);
    ctx.drawImage(this.video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return this.preview;
  }

  private smoothWorld(next: XYZ[], visibility: number[], dt: number): XYZ[] {
    if (!this.worldFilter) this.worldFilter = next.map(() => oneEuro3());
    return next.map((point, index) => {
      const slot = this.worldFilter![index];
      if (visibility[index] < 0.35 && slot.x.ready) {
        return { x: slot.x.hat, y: slot.y.hat, z: slot.z.hat };
      }
      return {
        x: stepEuro(slot.x, point.x, dt),
        y: stepEuro(slot.y, point.y, dt),
        z: stepEuro(slot.z, point.z, dt),
      };
    });
  }

  private smoothImage(
    image: { x: number; y: number }[],
    visibility: number[],
    dt: number,
  ): { x: number; y: number; v: number }[] {
    if (!this.imageFilter) this.imageFilter = image.map(() => oneEuro2());
    return image.map((point, index) => {
      const slot = this.imageFilter![index];
      if (visibility[index] < 0.35 && slot.x.ready) {
        return { x: slot.x.hat, y: slot.y.hat, v: visibility[index] };
      }
      return {
        x: stepEuro(slot.x, point.x, dt),
        y: stepEuro(slot.y, point.y, dt),
        v: visibility[index],
      };
    });
  }

  private noteTime(ms: number): void {
    this.times.push(ms);
    if (this.times.length > 40) this.times.shift();
    if (this.model === "heavy" && this.times.length >= 30) {
      const mean = this.times.reduce((a, b) => a + b, 0) / this.times.length;
      this.slow = mean > 42;
    }
  }
}

type Euro = { hat: number; speed: number; ready: boolean };

function euro(): Euro {
  return { hat: 0, speed: 0, ready: false };
}

function oneEuro2(): { x: Euro; y: Euro } {
  return { x: euro(), y: euro() };
}

function oneEuro3(): { x: Euro; y: Euro; z: Euro } {
  return { x: euro(), y: euro(), z: euro() };
}

type OneEuro2 = ReturnType<typeof oneEuro2>;
type OneEuro3 = ReturnType<typeof oneEuro3>;

/** One Euro filter. Low cutoff holds a still pose; beta lets a real movement through. */
function stepEuro(state: Euro, value: number, dt: number): number {
  const minCutoff = 0.8;
  const beta = 0.4;
  const derivCutoff = 1;
  if (!state.ready || dt <= 0) {
    state.hat = value;
    state.speed = 0;
    state.ready = true;
    return value;
  }
  const derivAlpha = euroAlpha(derivCutoff, dt);
  const speed = derivAlpha * ((value - state.hat) / dt) + (1 - derivAlpha) * state.speed;
  const cutoff = minCutoff + beta * Math.abs(speed);
  const alpha = euroAlpha(cutoff, dt);
  state.hat = alpha * value + (1 - alpha) * state.hat;
  state.speed = speed;
  return state.hat;
}

function euroAlpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export function bodyVisible(visibility: number[]): boolean {
  return [LM.nose, LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip, LM.lKnee, LM.rKnee, LM.lAnkle, LM.rAnkle].every(
    (index) => (visibility[index] ?? 0) > 0.45,
  );
}
