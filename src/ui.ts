import { fillDocs } from "./docs";
import type { AppState } from "./state";
import { progressKey } from "./state";
import { THROWS, throwById } from "./throws";
import type { Phase, Side } from "./types";

export type Handlers = {
  onThrow: (id: string) => void;
  onSide: (side: Side) => void;
  onPhase: (index: number) => void;
  onDocs: (open: boolean) => void;
};

let structureKey = "";

export function mount(handlers: Handlers): { paint: (state: AppState) => void } {
  const library = must("#library");
  const phases = must("#phases");
  const extra = must("#extra");
  const caption = must("#caption");
  const cue = must("#cue");
  const also = must("#also");
  const score = must("#score");
  const status = must("#status");
  const banner = must("#banner");
  const bannerText = must("#banner-text");
  const lite = must<HTMLButtonElement>("#use-lite");
  const sound = must<HTMLButtonElement>("#sound");
  const right = must<HTMLButtonElement>("#side-right");
  const left = must<HTMLButtonElement>("#side-left");
  const flip = must<HTMLButtonElement>("#flip");
  const flipX = must<HTMLButtonElement>("#flip-x");
  const flipY = must<HTMLButtonElement>("#flip-y");
  const stage = must("#stage");
  const docs = must("#docs");
  const docsOpen = must<HTMLButtonElement>("#docs-open");
  docsOpen.addEventListener("click", () => handlers.onDocs(true));

  right.addEventListener("click", () => handlers.onSide("right"));
  left.addEventListener("click", () => handlers.onSide("left"));

  const paint = (state: AppState) => {
    status.textContent = state.status;
    right.setAttribute("aria-pressed", String(state.side === "right"));
    left.setAttribute("aria-pressed", String(state.side === "left"));
    flipX.setAttribute("aria-pressed", String(state.flipX));
    flipY.setAttribute("aria-pressed", String(state.flipY));
    sound.textContent = state.sound ? "Sound on" : "Sound off";
    flip.hidden = !state.cameraOn;
    stage.hidden = !state.cameraOn && state.mode !== "review";
    docs.hidden = !state.docsOpen;
    banner.hidden = state.banner.length === 0;
    bannerText.textContent = state.banner;
    lite.hidden = !state.showLite;
    caption.textContent = state.caption;
    cue.textContent = state.cue;
    also.textContent = state.also;

    const def = state.throwId ? throwById(state.throwId) : null;
    const phase = def?.phases[Math.min(state.phaseIndex, def.phases.length - 1)];
    const total = state.live?.total;
    score.textContent = total === undefined || !phase ? "" : String(Math.round(total * 100));
    score.classList.toggle("pass", phase !== undefined && total !== undefined && total >= phase.passAt);
    also.hidden = true;

    const reviewPhase = state.review?.phaseOfSample[state.scrub] ?? "";
    const key = [
      state.throwId,
      state.side,
      state.mode,
      state.phaseIndex,
      state.drill,
      state.studyPlaying,
      JSON.stringify(state.progress),
      state.guidedScores.join(","),
      state.review?.note ?? "",
      reviewPhase,
      state.samples.length,
      state.docsOpen ? "docs" : "",
    ].join("|");
    if (key !== structureKey) {
      structureKey = key;
      renderThrows(library, state, handlers);
      renderPhases(phases, state, def?.phases ?? [], handlers);
      renderExtra(extra, state, def?.phases ?? []);
      if (state.docsOpen) {
        fillDocs(docs, state.throwId, state.side, handlers.onThrow, () => handlers.onDocs(false));
      }
    }
  };

  return { paint };
}

function renderThrows(root: HTMLElement, state: AppState, handlers: Handlers): void {
  root.replaceChildren();
  for (const item of THROWS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.setAttribute("aria-pressed", String(item.id === state.throwId));
    const best = state.progress[progressKey(item.id, state.side)];
    const mark = best?.free ?? best?.guided;
    button.textContent = item.name;
    if (mark) button.title = `Best ${Math.round(mark * 100)}`;
    button.addEventListener("click", () => handlers.onThrow(item.id));
    root.append(button);
  }
}

function renderPhases(root: HTMLElement, state: AppState, phases: Phase[], handlers: Handlers): void {
  root.replaceChildren();
  phases.forEach((phase, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${index + 1}  ${phase.name}`;
    button.setAttribute("aria-pressed", String(index === state.phaseIndex && state.mode !== "review"));
    button.addEventListener("click", () => handlers.onPhase(index));
    root.append(button);
  });
}

function renderExtra(root: HTMLElement, state: AppState, phases: Phase[]): void {
  root.replaceChildren();
  if (state.mode === "summary") {
    const line = phases
      .map((phase, index) => {
        const score = state.guidedScores[index];
        return `${phase.name} ${score == null ? "—" : `${Math.round(score * 100)}`}`;
      })
      .join("   ");
    root.append(el(line));
    return;
  }
  if (state.mode === "review" && state.review) {
    const line = phases
      .map((phase, index) => {
        const score = state.review?.phaseScores[index];
        return `${phase.name} ${score == null ? "skip" : Math.round(score * 100)}`;
      })
      .join("   ");
    root.append(el(line));
  }
}

function el(text: string): HTMLElement {
  const node = document.createElement("p");
  node.textContent = text;
  return node;
}

function must<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node as T;
}
