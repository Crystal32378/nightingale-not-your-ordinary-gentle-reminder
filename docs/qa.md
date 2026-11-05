# QA record — 5 November 2026

This verifies a local software simulation, not a medical product or clinical outcome.

## Automated checks

- `npm run check`: JavaScript syntax passed for app, pet presentation, behavior helper, state model, selected-recording player and server.
- `npm test`: **42/42 passed** (17 workflow/scheduling + 13 audio + 12 behavior), Node built-in test runner; no dependency installation.
- `git diff --check`: passed after the mobile/audio integration fixes.
- Behavior tests cover all six daily-completion orders, the all-three daily gate, duplicate/stale-event rejection, case isolation, reminder attempts 1–4 and occurrence reset. Audio tests verify increasing reminder cues with bounded volume and silence at zero.
- State tests cover the complete episode, no stage skipping, no early attendance, required closure evidence, unresolved human assistance, closed-case behavior, independent copies and resets.
- Task tests cover fixed person/clinician-authored fixtures, due/overdue boundaries, one reminder per task/day, one-off completion, repeat after self-report, retained missed occurrences and no clinical proof from daily check-ins.

## Browser walkthrough in Chrome

Observed on the local loopback preview:

| Check | Observed result |
| --- | --- |
| Day 0 → Day 1 | Three daily task reminder executions logged locally; task controls become available. |
| Medication + meal + glucose records | Three fictional records; growth reaches level 2/4; two sample diary entries, including labeled 128 mg/dL. |
| Sample capture | Dialog previews original illustration and explicitly requires saving; no file picker/camera or OCR. |
| Same-day scheduler rerun | No new executions; repeat reminder prevented. |
| Full A01 care path | Notification, acknowledgement, acceptance, booking and required evidence lead to 1/3 episodes closed. |
| Premature clinic evidence | Visit control disabled before appointment day. |
| Help request | Closure remains disabled after review/plan until mock pharmacist conversation is recorded. |
| Sam B02 reminder | Second same-day reminder disabled; overdue remains visible; human follow-up assignment recorded. |
| Alex C03 missed visit | Rescheduling creates a future demo slot without marking attendance; attendance control disabled until new day. |
| English interface | Home, sample dialogs, care journey, care-team view and notes use English. The document language is `en`; no Chinese text or language switch is rendered. |
| Responsive layout | English at 320 × 740 and 390 × 844: document widths matched the viewport. All four views were checked at 320 px. A notes-table overflow was fixed by allowing its card to shrink; the table scrolls within the card. The bird stands centered in open space above three large task icons. |
| Disclosure panels | Secondary content is tucked into Visits & tests, Our diary, Bird calls and About this little demo. The sound panel remained open across its toggle/render, so its controls and playback status stayed visible. |
| Character | Original pixel bird retained; feeding, stage/dance and growth use CSS motion, with three beak overlays and post-performance side-eye. No free-play action menu remains. |
| Task reactions | Medication confirmation showed one worm and the feeding animation; saving a meal showed the smile overlay. The third distinct daily record queued happy wing flaps, then the earned dance. Only the new completed record triggers the sequence. |
| Reminder personality | Visible reminder counts 1, 2 and 3 had no reminder side-eye. The fourth showed `sass` while the selected recording played. Muting stopped it and left text reminders available. Counts are for the current task occurrence. |
| Earned performances | Completion sequences retain the third-record dance and sixth-record concert after the task reaction and any daily wing flaps. The prior browser concert walkthrough and current sequence/audio tests cover the concert path. |
| Selected recording | Crystal’s selected 9.7-second WAV replaces synthesized calls. Browser playback displayed “Playing the selected Chiayi recording.” This establishes browser playback state; it is not an acoustic-quality or loudness measurement. |
| Audio controls | The settings panel stayed open across toggles; muting during the fourth reminder stopped playback immediately. Prior concert/zero-volume walkthroughs and current tests cover cancellation, live volume, superseding calls, waveform mouth states and media errors. |
| Help routing | Selecting B02 in Care team, returning to My bird, then choosing Help opened Mei A01’s care-team context, matching the companion’s owner. |
| Console | No error attributable to app code was observed. Chrome also logged extension-style asynchronous message-channel errors; they did not prevent the exercised interactions. |

## Local serving checks

Loopback HTTP GET returned 200 for `/`, app/state/pet scripts, pet CSS and the glucose SVG. Successful responses include a Content Security Policy with `connect-src 'none'`. `/.git/config` and `/.env` returned 404. Only allowlisted files are served. No real backend or credentials are used.

## Evidence and limits

Screenshots are saved in local ignored `output/screenshots/` for review. They are not automatically public. Browser tests were desktop Chrome with a responsive viewport (restored afterward), not physical-phone, background-reminder, assistive-technology or clinical testing. The reduced-motion CSS is present but no comprehensive accessibility conformance claim is made.

The sound uses a selected field recording with attribution and modification notes; it is no longer synthesized. The visual character remains a first-pass interaction prototype based on one canonical sprite and CSS overlays, without a frame-by-frame sprite animation pack. There is no finished demo video, persistent patient record or production scheduler. The demo clock exercises counted task reminders and earned concerts; it does not prove separate wall-clock alarms for each daily task or background notification delivery.
