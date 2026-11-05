# Raise Your Nightingale

A playful chronic-care companion prototype exploring **Future Health Challenge 05: Closing the Screening-to-Care Loop**. This repository contains the application source and instructions for running it locally.

Care for yourself, and raise your little nightingale. Daily care records bring an electronic pet to life, while a separate care journey tracks responsibility and evidence after screening.

**All people, plans, photos/illustrations, readings, dates, reminders and clinical records are fictional.** No real notifications, appointments, patient records, clinical interpretation or medical-system connections are present.

## Try it locally

Open `index.html` directly in a modern browser, or use the dependency-free Node server:

```sh
npm start
```

Then open **http://127.0.0.1:4173**. Node 18+ is sufficient; no `npm install`, account, API key or paid service is needed. The server binds only to loopback. The interface is in English. Reload resets the in-memory demo.

## What is implemented

- **A mobile-first companion:** a freely standing centered bird, large pill/meal/glucose-meter task icons, pixel human profile, and explanations inside closed-by-default panels.
- **An animated pixel nightingale:** recording medication feeds the bird one worm; recording a meal earns a smile, without grading the food. Completing all three daily activities earns a happy wing flap. The third saved activity earns a dance and the sixth a concert; these milestones repeat and follow the activity reaction. The bird also has a playful side-eye and four progressively rounder growth states. CSS animations and overlays use the original canonical PNG unchanged. There is no free-play action menu. This is interactive web motion, not a finished rendered character film or full skeletal animation.
- **Three call mouth shapes:** small, medium and wide openings follow the selected recording’s waveform. The first three reminder attempts for an unfinished task occurrence become progressively louder within the user's volume limit; the fourth and later add the signature side-eye. An earned concert uses the selected 9.7-second recording. These are local interaction cues driven by the demo clock, not separate automatic medication, meal and glucose alarms. Sound is off initially; mute, volume and reminder style are adjustable. Reduced-motion preferences are supported.
- **A fictional care plan:** medication 08:00, meal 12:00 and glucose 18:00 recur daily; a routine test and routine diabetes visit have later demo dates. These times are agreed within the fictional person/clinician plan. The simulator advances whole days; it is not a wall-clock scheduler or background notification service.
- **Sample diary capture:** preview and confirm original meal/glucose illustrations. The fixed glucose example is **128 mg/dL**, explicitly fictional and not interpreted. No camera, upload, OCR or real health information is used.
- **A complete eye-screening care episode:** result ready → notification → acknowledgement → accepted referral → booking → mock encounter/test evidence → clinician review + next plan → closure. A medication question blocks closure until mock human review is recorded.
- **Exceptions:** unacknowledged results, missed appointments, rescheduling, overdue visibility and human-follow-up assignment. Three fictional cases provide reproducible scenarios.
- **Separate evidence:** daily self-reports never prove clinical attendance or close a screening episode. The routine diabetes visit in the daily plan is distinct from the eye-screening referral appointment.
- **Audit export:** a local JSON download includes synthetic events, task executions and sample diary entries. No state is persisted or transmitted automatically.

## A short walkthrough

1. On **My bird**, choose **Start demo**. Use the three large **Medication**, **Meal** and **Glucose** icons to save fictional records. Medication earns one worm, a meal earns a smile, and all three completed today earn a happy wing flap. The third saved activity earns a dance; the sixth earns a concert, after the activity reactions. Open **Bird calls** to enable the selected recording, adjust the volume or mute it.
2. Use **Next day** to advance the whole-day simulator; leave a due day unfinished and advance again to see overdue records. **Visits & tests**, **Our diary**, **Bird calls** and **About this little demo** hold the secondary details in disclosure panels.
3. Open **Care team**, select Mei A01, simulate notification, switch to the patient view for acknowledgement, then record referral acceptance and book a fictional slot.
4. Advance to the slot day. Add visit/test evidence, clinician review and next plan. Only then can the episode close. Try an unresolved help request to see the closure gate.
5. Inspect Sam B02 and Alex C03 for no-response and missed-visit handling.

The [two-minute demo script](docs/demo-script.md) gives a recording sequence.

## Validation and sources

```sh
npm run check
npm test
```

The state, scheduling, audio and companion-behavior tests cover valid transitions, evidence gates, reminder attempts, recurrence, playback controls and separation of self-reports from clinical proof. Browser QA also exercises the care loop, diary capture, audio controls, pet motion and mobile layout. See the [QA report](docs/qa.md) for current results.

The official [submission Q&A at 34:41–35:08](https://www.youtube.com/watch?v=7r0TDPl4Tmc&t=2081s) permits synthetic evaluation and does not require testing in a live environment. It does not establish effectiveness or guarantee acceptance. [Sources and limits](docs/data-sources.md) document this and the optional Taiwan references. No Taiwan statistics were imported or used for individual due dates.

[Architecture](docs/architecture.md) · [Asset provenance](docs/asset-provenance.md) · [Audio credits](docs/audio-attribution.md) · [Demo and evaluation checklist](docs/submission-readiness.md)

## Scope and licensing

The application runs with local browser and Node APIs. It makes no model calls and requires no credentials or cloud service. Real scheduling, photography/storage and clinical integrations would need separate implementation and validation.

Application code is covered by the repository's [MIT license](LICENSE). The reused bird image retains its [original MIT notice](assets/NIGHTINGALE-LICENSE.txt).

The selected audio is chiuluan’s Chiayi nightjar recording, credited under CC BY 4.0. The 9.7-second prepared WAV is bundled without further re-encoding; runtime playback preserves pitch, uses excerpts and obeys the user’s volume limit. Credit, source, license, prior modifications and the source-verification limitation are documented in [audio attribution](docs/audio-attribution.md). The audio is separately licensed from the MIT application code.
