import type { Phase, Stick, Target, ThrowDef } from "./types";

const STAND: Stick = {
  head: [0, 88],
  neck: [0, 72],
  ls: [-24, 64],
  rs: [24, 64],
  le: [-30, 42],
  re: [30, 42],
  lw: [-26, 22],
  rw: [26, 22],
  lh: [-13, 8],
  rh: [13, 8],
  lk: [-15, -26],
  rk: [15, -26],
  la: [-16, -64],
  ra: [16, -64],
};

function stick(over: Partial<Stick>): Stick {
  return { ...STAND, ...over };
}

function tgt(min: number, max: number, slack: number, extra: Partial<Target> = {}): Target {
  return { min, max, slack, ...extra };
}

const back = tgt(115, -115, 36, {
  circular: true,
  weight: 1.7,
  off: "Turn your back toward the camera. The fit is in when you can no longer see your own chest.",
});

const tall = tgt(-14, 22, 18, {
  weight: 1,
  high: "Stay tall through the chest. Folding early just bows — the hip is not in yet.",
  low: "Bring the chest back up. You are leaning away from the throw.",
});

const level = tgt(-18, 18, 16, {
  weight: 0.45,
  off: "Stack your shoulders over your hips. If you tip sideways, the throw falls off the edge.",
});

const readyKnees = tgt(150, 180, 24, {
  low: "Soften the knees. A locked leg cannot turn or step.",
  high: "You are sitting too deep for the stance. Rise until the knees are just soft.",
});

const kamae: Phase = {
  id: "kamae",
  name: "Kamae",
  japanese: "構え",
  intent: "Athletic stance, hands where a grip would start, chest toward the camera.",
  holdMs: 650,
  passAt: 0.74,
  ifMissed: "The stance never settled. Soft knees, feet under you, hands in front of the belt.",
  stick: stick({}),
  targets: {
    kneeL: { ...readyKnees, weight: 1 },
    kneeR: { ...readyKnees, weight: 1 },
    heading: tgt(-28, 28, 24, {
      weight: 1.2,
      off: "Face the camera to start. The turn comes in the next phase, not before it.",
    }),
    forwardLean: tgt(-12, 16, 16, {
      high: "Stay upright. There is nothing to bow over yet.",
    }),
    sideLean: level,
    stanceWidth: tgt(0.3, 1.45, 0.45, {
      low: "Set the feet about shoulder width.",
      high: "Bring the feet in. This is a stance, not a lunge.",
    }),
    wristForwardL: tgt(0.02, 0.85, 0.4, {
      low: "Bring the sleeve hand up in front of the belt, as if it holds a sleeve.",
    }),
    wristForwardR: tgt(0.02, 0.85, 0.4, {
      low: "Bring the lapel hand up in front of the chest, as if it holds a lapel.",
    }),
  },
};

const kuzushiHip: Phase = {
  id: "kuzushi",
  name: "Kuzushi",
  japanese: "崩し",
  intent: "The sleeve hand pulls across, the knees load, and the chest leaves the camera.",
  holdMs: 700,
  passAt: 0.73,
  ifMissed: "Kuzushi was thin. Pull the sleeve hand across and start the turn before you drop the hips.",
  stick: stick({
    head: [-8, 86],
    neck: [-6, 70],
    ls: [-28, 64],
    rs: [16, 62],
    le: [-8, 48],
    re: [22, 46],
    lw: [10, 36],
    rw: [18, 28],
    lk: [-18, -22],
    rk: [12, -22],
    la: [-22, -62],
    ra: [8, -62],
  }),
  targets: {
    heading: tgt(18, 120, 26, {
      weight: 1.6,
      low: "Start the turn. Your chest should leave the camera before your shoulders drop.",
      high: "That is already the fit. For kuzushi, break balance and begin the turn — don't spin all the way yet.",
    }),
    hikite: tgt(0.0, 0.95, 0.4, {
      weight: 1.4,
      low: "Pull the sleeve hand across the body, toward the far shoulder. Down by the hip does not move anybody.",
      high: "The sleeve hand has gone past the far shoulder. Across the chest is enough.",
    }),
    kneeL: tgt(130, 170, 22, {
      weight: 0.9,
      high: "Load the knees. A straight leg cannot sit the hips in on the next phase.",
    }),
    kneeR: tgt(130, 170, 22, { weight: 0.9, high: "Load both knees, not just the front one." }),
    forwardLean: tall,
    sideLean: level,
    elbowR: tgt(45, 140, 30, {
      weight: 0.7,
      high: "Bend the lapel arm. A straight arm keeps you a foot away from the fit.",
    }),
  },
};

export const THROWS: ThrowDef[] = [
  {
    id: "o-goshi",
    name: "O-goshi",
    japanese: "大腰",
    family: "Hip",
    summary:
      "Major hip throw. Off-balance them forward, turn your back in, and sit your belt under where their belt would be. Then fold over that hip. The arms stay wrapped; the legs drive.",
    watch: "Turn first, sit second, fold last. If the chest drops before the back is in, it is only a bow.",
    phases: [
      kamae,
      kuzushiHip,
      {
        id: "tsukuri",
        name: "Tsukuri",
        japanese: "作り",
        intent: "Back toward the camera, hips sunk, chest still tall. This is the fit, not the throw.",
        holdMs: 750,
        passAt: 0.73,
        ifMissed: "The fit was late or high. Turn the back in and bend the knees before you fold.",
        stick: stick({
          head: [0, 84],
          neck: [0, 68],
          ls: [-26, 60],
          rs: [26, 60],
          le: [-34, 44],
          re: [20, 40],
          lw: [-20, 28],
          rw: [-4, 34],
          lh: [-14, 4],
          rh: [14, 4],
          lk: [-16, -8],
          rk: [16, -8],
          la: [-18, -52],
          ra: [18, -52],
        }),
        targets: {
          heading: back,
          kneeL: tgt(95, 150, 26, {
            weight: 1.25,
            high: "Sit the hips. Both knees bend until your belt is lower than where their belt would be.",
            low: "You dropped into a squat. O-goshi sits, it does not kneel.",
          }),
          kneeR: tgt(95, 150, 26, {
            weight: 1.25,
            high: "Both knees bend. One straight leg leaves the hip too high.",
          }),
          forwardLean: tall,
          sideLean: level,
          elbowR: tgt(35, 145, 32, {
            weight: 0.85,
            high: "Bend the lapel arm around where their waist would be.",
          }),
          hikite: tgt(-0.1, 0.9, 0.5, {
            weight: 0.8,
            low: "Keep the sleeve hand out across the body. If it collapses to the chest, the turn dies.",
          }),
        },
      },
      {
        id: "kake",
        name: "Kake",
        japanese: "掛け",
        intent: "Drive the legs and fold the chest over the hip. The arms do not let go.",
        holdMs: 700,
        passAt: 0.73,
        ifMissed: "The finish never folded. Straighten through the legs and drop the chest toward the far thigh.",
        stick: stick({
          head: [0, 36],
          neck: [0, 24],
          ls: [-28, 18],
          rs: [28, 18],
          le: [-36, 2],
          re: [16, 8],
          lw: [-18, -8],
          rw: [-6, 2],
          lh: [-14, -6],
          rh: [14, -6],
          lk: [-16, -30],
          rk: [16, -30],
          la: [-16, -66],
          ra: [18, -66],
        }),
        targets: {
          heading: back,
          forwardLean: tgt(30, 78, 20, {
            weight: 1.6,
            low: "Fold over the hip now. The chest goes toward the far thigh, the arms stay in.",
            high: "Deep enough. Keep the weight on the feet — don't collapse past the hip.",
          }),
          kneeL: tgt(145, 180, 24, {
            weight: 1.15,
            low: "Drive the legs as you fold. Sitting deeper is not the throw.",
          }),
          kneeR: tgt(145, 180, 24, {
            weight: 1.15,
            low: "Both legs drive. A dead back leg drops you onto the hip instead of over it.",
          }),
          sideLean: level,
          elbowR: tgt(35, 130, 30, {
            weight: 0.7,
            high: "Keep the lapel arm wrapped. Straightening it drops the person off the hip.",
          }),
        },
      },
    ],
  },
  {
    id: "ippon-seoi-nage",
    name: "Ippon seoi-nage",
    japanese: "一本背負投",
    family: "Shoulder",
    summary:
      "One-arm shoulder throw. Turn in lower than o-goshi and fit the lapel elbow under where their armpit would be. Then stand up through the legs and fold. The elbow stays bent — a straight arm is a different throw.",
    watch: "The elbow hooks at shoulder height before the chest drops. Legs make the shoulder rise.",
    phases: [
      kamae,
      {
        ...kuzushiHip,
        intent: "Sleeve hand pulls across, knees bend more than a hip throw, chest starts to turn.",
        ifMissed: "You turned without loading the legs. Seoi-nage sits lower than o-goshi, and the sleeve hand has to move first.",
        targets: {
          ...kuzushiHip.targets,
          kneeL: tgt(115, 160, 22, {
            weight: 1.1,
            high: "Bend more than a hip-throw entry. The shoulder has to get under an arm.",
          }),
          kneeR: tgt(115, 160, 22, {
            weight: 1.1,
            high: "Both knees bend. A long front leg blocks the turn-in.",
          }),
        },
      },
      {
        id: "fit",
        name: "Fit",
        japanese: "作り",
        intent: "Deep in the legs, back to the camera, lapel elbow up at shoulder height. Do not dive yet.",
        holdMs: 750,
        passAt: 0.73,
        ifMissed: "The elbow never got up, or the hips stayed high. Sit under the arm, then throw.",
        stick: stick({
          head: [2, 70],
          neck: [2, 56],
          ls: [-22, 50],
          rs: [24, 52],
          le: [-30, 32],
          re: [18, 70],
          lw: [-8, 24],
          rw: [8, 48],
          lh: [-14, -4],
          rh: [14, -4],
          lk: [-20, -4],
          rk: [16, -2],
          la: [-18, -48],
          ra: [14, -48],
        }),
        targets: {
          heading: back,
          kneeL: tgt(68, 122, 24, {
            weight: 1.35,
            high: "Sit lower. Your hips drop under the arm you are fitting.",
            low: "That is a knee on the mat. Keep both feet under you.",
          }),
          kneeR: tgt(68, 122, 24, {
            weight: 1.35,
            high: "Both knees bend. The shoulder cannot get under a straight leg.",
          }),
          tsuriteLift: tgt(-0.02, 0.7, 0.28, {
            weight: 1.7,
            low: "Raise the lapel elbow to shoulder height, as if it hooks an armpit.",
            high: "The elbow is by your ear. Shoulder height is the fit, not overhead.",
          }),
          elbowR: tgt(30, 105, 28, {
            weight: 1.15,
            high: "The throwing arm stays bent. Straightening it turns this into a different throw.",
            low: "Open the elbow a little. Crushed to your ribs, it cannot hook.",
          }),
          forwardLean: tgt(-10, 26, 16, {
            weight: 1.1,
            high: "Fit first. If you fold before the elbow is in, you only bow.",
          }),
          sideLean: level,
        },
      },
      {
        id: "kake",
        name: "Kake",
        japanese: "掛け",
        intent: "Legs drive straight, chest folds over the fitted arm, elbow stays bent.",
        holdMs: 700,
        passAt: 0.73,
        ifMissed: "You either stayed in the squat or never folded. Stand up and bow over the arm together.",
        stick: stick({
          head: [4, 28],
          neck: [2, 16],
          ls: [-24, 12],
          rs: [26, 16],
          le: [-30, -2],
          re: [14, 30],
          lw: [-6, -6],
          rw: [4, 14],
          lh: [-13, -8],
          rh: [13, -8],
          lk: [-14, -32],
          rk: [14, -32],
          la: [-14, -66],
          ra: [16, -66],
        }),
        targets: {
          heading: { ...back, weight: 1.3 },
          kneeL: tgt(142, 180, 22, {
            weight: 1.4,
            low: "Stand up through the throw. The legs make the shoulder rise.",
          }),
          kneeR: tgt(142, 180, 22, {
            weight: 1.4,
            low: "Both legs extend. Leaving the knees bent keeps them on your back.",
          }),
          forwardLean: tgt(34, 82, 20, {
            weight: 1.5,
            low: "Fold over the fitted arm. The elbow stays bent while the chest drops.",
            high: "That's the fold. Keep a foot under you.",
          }),
          tsuriteLift: tgt(-0.15, 0.65, 0.3, {
            weight: 1,
            low: "Don't drop the throwing elbow as you stand. It stays up in the shoulder line.",
          }),
          elbowR: tgt(30, 115, 28, {
            weight: 1,
            high: "The arm stays bent through the finish. Straightening it loses the shoulder.",
          }),
          sideLean: level,
        },
      },
    ],
  },
  {
    id: "osoto-gari",
    name: "Osoto-gari",
    japanese: "大外刈",
    family: "Reap",
    summary:
      "Major outer reap. Step the support foot through, drive the chest forward, then reap the far leg back with a long leg — sole toward an imaginary calf. Your chest follows them down. It is not a roundhouse kick.",
    watch: "Support foot deep, chest over that foot, reaping leg straight and behind you.",
    phases: [
      {
        id: "step",
        name: "Step",
        japanese: "入り",
        intent: "A long front-to-back step. Support foot toward the camera, chest still up.",
        holdMs: 650,
        passAt: 0.73,
        ifMissed: "The step was short. The support foot has to travel past your hips, or the reap has nothing to stand on.",
        stick: stick({
          head: [4, 88],
          neck: [2, 72],
          lk: [-6, -20],
          rk: [22, -30],
          la: [-4, -66],
          ra: [34, -58],
          lw: [-10, 28],
          rw: [16, 30],
        }),
        targets: {
          stanceDepth: tgt(0.55, 2.1, 0.4, {
            weight: 1.5,
            low: "Split the feet front to back. A wide side stance is not this step.",
          }),
          footForwardL: tgt(0.28, 1.45, 0.32, {
            weight: 1.4,
            low: "The support foot steps through, toward the camera, past your hips.",
          }),
          kneeL: tgt(118, 168, 20, {
            weight: 1,
            high: "Bend the support leg. You will stand on it.",
            low: "The support leg collapsed. It is a post, not a lunge to the floor.",
          }),
          heading: tgt(-32, 36, 22, {
            weight: 0.8,
            off: "Stay facing the camera. Osoto does not turn the back the way a hip throw does.",
          }),
          forwardLean: tgt(0, 28, 14, {
            weight: 0.9,
            low: "Send the chest with the step.",
            high: "Don't bow yet. The chest drives, it doesn't fold in half.",
          }),
          sideLean: level,
        },
      },
      {
        id: "drive",
        name: "Drive",
        japanese: "崩し",
        intent: "Hands and chest project forward over the support foot. Weight goes onto the heel you mean to reap.",
        holdMs: 700,
        passAt: 0.73,
        ifMissed: "The arms pulled down or the chest stayed home. Osoto drives the upper body forward.",
        stick: stick({
          head: [6, 82],
          neck: [4, 66],
          ls: [-18, 60],
          rs: [22, 58],
          le: [-8, 46],
          re: [28, 44],
          lw: [2, 34],
          rw: [24, 32],
          la: [-2, -64],
          ra: [36, -56],
          lk: [-4, -18],
          rk: [24, -28],
        }),
        targets: {
          wristForwardL: tgt(0.32, 1.15, 0.3, {
            weight: 1.3,
            low: "The sleeve hand drives forward at chest height. Pulling down kills osoto.",
          }),
          wristForwardR: tgt(0.32, 1.15, 0.3, {
            weight: 1.3,
            low: "The lapel hand drives forward with the chest, it does not drop to the belt.",
          }),
          forwardLean: tgt(10, 42, 14, {
            weight: 1.2,
            low: "Project the chest over the support foot.",
            high: "You folded too far. Drive them, don't dive past your own feet.",
          }),
          footForwardL: tgt(0.28, 1.5, 0.32, {
            weight: 1,
            low: "Keep the support foot forward. Don't bring it back under you yet.",
          }),
          heading: tgt(-30, 40, 22, { weight: 0.7, off: "Keep the chest toward the camera while you drive." }),
          sideLean: level,
        },
      },
      {
        id: "reap",
        name: "Reap",
        japanese: "掛け",
        intent: "The throwing leg finishes long and behind you. The chest follows down. The support leg stays standing.",
        holdMs: 720,
        passAt: 0.73,
        ifMissed: "The leg never reaped through. It should finish straight, behind you, with the chest following it down.",
        stick: stick({
          head: [10, 62],
          neck: [6, 50],
          ls: [-16, 46],
          rs: [26, 44],
          le: [-4, 32],
          re: [32, 30],
          lw: [8, 22],
          rw: [30, 18],
          lh: [-12, 4],
          rh: [12, 2],
          lk: [-8, -16],
          rk: [28, -18],
          la: [-6, -62],
          ra: [52, -36],
        }),
        targets: {
          footBackR: tgt(0.42, 1.6, 0.36, {
            weight: 1.7,
            low: "Swing the foot through behind you. A foot beside you only taps.",
            high: "The reap has gone so far you're falling with it. Finish long, then stop.",
          }),
          stanceDepth: tgt(0.65, 2.2, 0.4, {
            weight: 1.25,
            low: "Keep the split. If the feet come together, there is no reap.",
          }),
          footForwardL: tgt(0.25, 1.45, 0.32, {
            weight: 1,
            low: "Leave the support foot forward. Reap around it, not instead of it.",
          }),
          kneeR: tgt(150, 180, 22, {
            weight: 1.35,
            low: "Straighten the reaping leg. A bent knee taps; it does not reap.",
          }),
          forwardLean: tgt(8, 62, 16, {
            weight: 1.15,
            low: "Follow them down. The chest goes with the reap.",
            high: "You dove. The support leg should still be holding you up.",
          }),
          thighLiftR: tgt(0, 52, 22, {
            weight: 0.9,
            high: "That lift is uchi-mata. Osoto stays low and goes back, not up in front.",
          }),
          heading: tgt(-36, 42, 24, {
            weight: 0.6,
            off: "Don't turn your back. Osoto faces the direction they fall.",
          }),
          sideLean: tgt(-16, 24, 16, {
            weight: 0.5,
            high: "You are falling off to the reaping side. Stay over the support foot.",
          }),
        },
      },
    ],
  },
  {
    id: "uchi-mata",
    name: "Uchi-mata",
    japanese: "内股",
    family: "Thigh",
    summary:
      "Inner-thigh throw. Turn in like a hip throw, but one leg swings up between where their thighs would be. The support leg stays planted. You fold over the lifting thigh. It is a sweep of the thigh, not a front kick.",
    watch: "Support leg is the post. The other thigh rises in front of you, long, then the chest folds over it.",
    phases: [
      {
        id: "entry",
        name: "Entry",
        japanese: "入り",
        intent: "Turn the chest off the camera and load the support leg. The lifting foot is still down.",
        holdMs: 650,
        passAt: 0.73,
        ifMissed: "You kicked before you turned. The support leg and the turn come first.",
        stick: stick({
          head: [-6, 86],
          neck: [-4, 70],
          ls: [-26, 62],
          rs: [16, 60],
          lw: [6, 34],
          rw: [18, 30],
          lk: [-18, -16],
          rk: [14, -24],
          la: [-20, -60],
          ra: [16, -62],
        }),
        targets: {
          heading: tgt(24, 130, 26, {
            weight: 1.5,
            low: "Turn in. Uchi-mata is a hip entry with a different leg, not a kick from square on.",
            high: "You are all the way around. Hold the three-quarter turn and then lift.",
          }),
          kneeL: tgt(112, 162, 20, {
            weight: 1.2,
            high: "Bend the support leg so you can turn over it.",
            low: "The support leg collapsed. It has to hold you while the other leg swings.",
          }),
          forwardLean: tgt(-8, 28, 16, {
            weight: 0.9,
            high: "Don't fold yet. Get the turn in, then the thigh, then the chest.",
          }),
          thighLiftR: tgt(0, 48, 20, {
            weight: 0.7,
            high: "The lifting thigh is early. Finish the entry with that foot still near the floor.",
          }),
          sideLean: level,
        },
      },
      {
        id: "lift",
        name: "Lift",
        japanese: "作り",
        intent: "The throwing thigh swings up in front, the leg stays long, the support foot stays planted.",
        holdMs: 700,
        passAt: 0.73,
        ifMissed: "The thigh never came up between them. Lift it in front of you, hip-high or above, without hopping the support foot.",
        stick: stick({
          head: [-4, 82],
          neck: [-2, 66],
          ls: [-24, 58],
          rs: [20, 58],
          le: [-16, 40],
          re: [24, 40],
          lw: [4, 30],
          rw: [10, 28],
          lh: [-12, 2],
          rh: [12, 2],
          lk: [-16, -12],
          rk: [10, 24],
          la: [-16, -58],
          ra: [18, 2],
        }),
        targets: {
          thighLiftR: tgt(52, 125, 26, {
            weight: 1.8,
            low: "Swing the lifting thigh up. It passes between where their legs would be.",
            high: "That is a full kick to the ceiling. Hip height to the ribs is the throw.",
          }),
          thighForwardR: tgt(0.12, 1.05, 0.28, {
            weight: 1.35,
            low: "The thigh has to sweep forward, not stick out to the side.",
            high: "The knee is too far in front of the hip. Sweep up, don't reach.",
          }),
          kneeR: tgt(100, 176, 24, {
            weight: 0.9,
            low: "The lifting leg is long. A tucked heel is a kick, not uchi-mata.",
          }),
          kneeL: tgt(112, 168, 20, {
            weight: 1.1,
            low: "You are sitting under the lift. The support leg is a bent post, not a squat.",
            high: "Soften the support leg. Locked straight, you cannot turn over it.",
          }),
          heading: tgt(60, -80, 32, {
            circular: true,
            weight: 1.25,
            off: "Keep the turn. If your chest comes back to the camera, the thigh is just a kick.",
          }),
          sideLean: level,
        },
      },
      {
        id: "fold",
        name: "Fold",
        japanese: "掛け",
        intent: "Chest folds over the lifting thigh. The support foot stays down. The thigh stays up.",
        holdMs: 700,
        passAt: 0.73,
        ifMissed: "The thigh came up and the chest stayed behind it. Fold over the thigh to finish.",
        stick: stick({
          head: [2, 40],
          neck: [0, 28],
          ls: [-22, 22],
          rs: [22, 24],
          le: [-14, 10],
          re: [16, 14],
          lw: [2, 4],
          rw: [6, 8],
          lh: [-12, -2],
          rh: [12, -2],
          lk: [-14, -20],
          rk: [8, 20],
          la: [-14, -62],
          ra: [16, -2],
        }),
        targets: {
          forwardLean: tgt(22, 72, 18, {
            weight: 1.55,
            low: "Fold the chest over the lifting thigh.",
            high: "You collapsed past the thigh. Fold onto it, don't dive over it.",
          }),
          thighLiftR: tgt(42, 120, 24, {
            weight: 1.3,
            low: "The thigh dropped as you folded. It stays up until the chest is over it.",
          }),
          heading: tgt(70, -70, 30, {
            circular: true,
            weight: 1,
            off: "Stay turned as you fold. Opening the chest dumps them beside you.",
          }),
          kneeL: tgt(118, 172, 20, {
            weight: 0.9,
            low: "The support leg gave way. Finish on that foot.",
          }),
          sideLean: level,
        },
      },
    ],
  },
  {
    id: "de-ashi-barai",
    name: "De-ashi-barai",
    japanese: "出足払",
    family: "Sweep",
    summary:
      "Advancing foot sweep. The sole skims the mat across the line their foot is traveling. The sweeping leg stays long and low. Your chest does not chase the foot — the weight stays on the standing leg.",
    watch: "A straight leg, a foot that barely leaves the floor, and an upright body.",
    phases: [
      {
        id: "light",
        name: "Light stance",
        japanese: "構え",
        intent: "Upright, knees soft, light enough that one foot can leave without a wind-up.",
        holdMs: 600,
        passAt: 0.74,
        ifMissed: "The stance was heavy. De-ashi starts tall and narrow, not in a squat.",
        stick: stick({
          la: [-12, -64],
          ra: [12, -64],
          lk: [-12, -28],
          rk: [12, -28],
        }),
        targets: {
          kneeL: tgt(148, 178, 20, {
            low: "Too deep. This sweep starts nearly tall.",
            high: "Unlock the knees just enough to move.",
          }),
          kneeR: tgt(148, 178, 20, { low: "Stay tall. A bent sweeping leg is already the wrong shape." }),
          forwardLean: tgt(-10, 16, 14, {
            high: "Stand up. If you lean now, the sweep will pull you over.",
          }),
          heading: tgt(-24, 24, 20, { off: "Face the camera. The sweep goes sideways, the chest stays up." }),
          stanceWidth: tgt(0.28, 1.25, 0.4, {
            high: "Narrower. A wide base has no free foot to sweep with.",
          }),
          sideLean: level,
        },
      },
      {
        id: "sweep",
        name: "Sweep",
        japanese: "払い",
        intent: "Throwing foot reaches out, almost on the floor, leg long. Chest stays stacked over the standing foot.",
        holdMs: 680,
        passAt: 0.73,
        ifMissed: "The foot either lifted into a kick or never reached. Skim it out to the side and stay tall.",
        stick: stick({
          head: [-4, 88],
          neck: [-2, 72],
          rs: [22, 64],
          re: [36, 46],
          rw: [30, 28],
          rk: [34, -24],
          ra: [62, -60],
          lk: [-14, -26],
          la: [-14, -64],
        }),
        targets: {
          footSideR: tgt(0.72, 1.75, 0.36, {
            weight: 1.7,
            low: "Reach the foot out to the side, to where their ankle would be landing.",
            high: "That split is past a sweep. Out to the side of your hip is enough.",
          }),
          ankleLiftR: tgt(-0.08, 0.28, 0.22, {
            weight: 1.5,
            high: "The foot left the floor. De-ashi skims. A high foot is a kick.",
            low: "Let the sole turn toward the mat, but don't stomp past it.",
          }),
          kneeR: tgt(155, 180, 18, {
            weight: 1.25,
            low: "The sweeping leg stays straight. You sweep with the sole, not a bent shin.",
          }),
          forwardLean: tgt(-10, 18, 14, {
            weight: 1.15,
            high: "Stay upright. If the chest dives, you are throwing yourself.",
          }),
          heading: tgt(-30, 32, 20, {
            weight: 0.6,
            off: "The chest does not turn away. The foot does the work.",
          }),
          sideLean: tgt(-28, 12, 16, {
            weight: 0.8,
            high: "You are falling onto the sweeping foot. Weight stays on the standing leg.",
          }),
          kneeL: tgt(145, 178, 18, {
            weight: 0.6,
            low: "Don't squat the standing leg as the foot goes out.",
          }),
        },
      },
    ],
  },
];

export function throwById(id: string): ThrowDef {
  return THROWS.find((item) => item.id === id) ?? THROWS[0];
}
