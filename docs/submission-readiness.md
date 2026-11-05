# Demo and evaluation checklist

This document summarizes what the source prototype demonstrates and what a formal evaluation would still need.

## Included in the prototype

- An English electronic-pet and care-loop interface with explicit simulation labels.
- Five plan tasks, three fictional care cases, sample image/reading confirmation, growth, feeding, earned performances, three mouth openings and adjustable sound/personality.
- Accountability, overdue states, rescheduling, human-assistance simulation and evidence-gated closure.
- Reproducible software tests, a browser QA record, source and asset credits, architecture notes and a two-minute recording script.

## Demo preparation

1. Review character motion, mouth/eyelid alignment and recording timing at the intended screen size. Visual motion uses CSS and a canonical sprite rather than a frame-by-frame animation pack.
2. Use the [recording script](demo-script.md) to demonstrate daily care and the separate screening-to-care episode. Keep simulation labels visible and credit the recording.
3. Check any evaluation or competition form directly for current file, video, demonstration-link, narrative and deadline requirements. A loopback address only works on the computer running the app.
4. Report synthetic evaluation honestly. Tests demonstrate software behavior, not improved patient outcomes. A comparison needs an explicit baseline and reproducible measurements; the prototype supplies no clinical improvement percentage.

## Official data clarification

The official general submission Q&A at **34:41–35:08** accepts synthetic evaluation and says live-environment testing is not expected. [Source](https://www.youtube.com/watch?v=7r0TDPl4Tmc&t=2081s). This does not waive challenge-specific evidence, rights, reporting or local-context requirements, or guarantee acceptance. See [data sources and evidence boundaries](data-sources.md).

## Current implementation boundaries

Daily task times are fixtures executed by a whole-day simulator. There is no actual background scheduler, notification delivery, authentication, camera capture, OCR, durable storage, insurer/provider check, clinician service or Malaffi/Sehatna integration. All human actors and care evidence are simulated.

Real use would require clinically reviewed plans, consent and access controls, actual care partners and integrations, and evaluation with the intended people and care teams. Clinical effectiveness, local-language suitability and UAE applicability have not been established.
