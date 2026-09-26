# Uchikomi

Solo practice for the shapes inside a judo throw. The camera tracks your body with [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js) (the full model). Video stays in the browser.

It is a learning drill, not a coach and not a substitute for a mat. Throws are for a dojo, with a partner who knows how to fall.

## Run

```bash
npm install
npm run dev
```

Open the local URL. The first camera session downloads the pose model from Google; the browser caches it after that. `npm test` checks the scoring without a camera.

## What it compares

Each throw is split into the usual parts — kamae, kuzushi, tsukuri, kake, or the step / reap / sweep that throw actually uses. A phase is a set of joint angles and body positions (turn, knee bend, where the hands and feet are). Practice mode asks you to hold each shape. Record mode time-warps the whole movement against that sequence and shows where it drifted.

The targets are coaching ranges for a solo body, written so a plain stance fails the finish and a finish fails the stance. They are not motion capture of an athlete.

Right side means your right hand is the lapel hand and your right leg is the throwing leg. Left side mirrors the math.

If a turn reads backwards, use “Turn looks backwards” — that flips the depth axis when a browser disagrees with the model. If the full model is too slow, switch to the lite model from the banner.

## Throws

O-goshi, ippon seoi-nage, osoto-gari, uchi-mata, de-ashi-barai.
