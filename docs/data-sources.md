# Raise Your Nightingale — data sources and evidence boundaries

Reviewed: 5 November 2026.

Raise Your Nightingale is a local pet-companion and care-workflow simulation. The running app uses **fictional people, events, dates, service hand-offs, reminder intervals, daily diary entries, and completion records**. It does not import patient records, government statistics, laboratory values, insurance records, or provider directories. Its counters describe the current simulation only. The pet's reactions, meal illustration, and example glucose diary value are authored demonstration fixtures, not clinical observations or measurements.

## What the demo data represents

The fixtures in `state.js` are authored for this prototype. Mei, Sam, and Alex are fictional cases. A result is already flagged for follow-up within the scenario; the app does not calculate a clinical diagnosis or risk score. Appointment timing, overdue rules, reminders, human actions, and closure evidence are demonstrations of software behavior, not care guidelines or clinical findings.

Taiwan sources below provide background only. Their figures are not loaded into the app, used to generate the fictional cases, used to calculate individual due dates, or presented as evidence of UAE suitability. No dataset has been downloaded, combined, transformed, or used for model training.

## Challenge sources

### Future Health official challenge page

[Future Health Digital Innovation Challenge — Hack2skill](https://hack2skill.com/event/futurehealthchallenge/)

Challenge 05 covers actionable screening results progressing through communication, confirmation, consultation, referrals, care, and documented closure. Clear ownership and human oversight support this prototype's design. The FAQ says organizers provide no data, including synthetic data, and asks teams to disclose every source and have legal usage rights.

**Boundary:** Synthetic-data evaluation is permitted by the official Q&A below. A software demonstration using fictional cases still does not establish clinical effectiveness or guarantee selection.

### Population Health challenge explainer

[Challenge Explainer: Population Health — Hack2skill, from 36:34](https://www.youtube.com/watch?v=sUxFgxs9hVI&t=2194s)

The official channel and video title were verified in the browser. Available timestamped transcript text was reviewed for approximately **36:34–40:47**; captions can contain transcription errors, so these are paraphrases, not quotations.

| Segment | Relevant context |
| --- | --- |
| 36:34–37:34 | An actionable result needs timely communication, appropriate care, and a documented outcome; ongoing care for chronic conditions is explicitly included. |
| 37:38–39:17 | Fragmented care obscures responsibility. Diabetes is among the examples. Referral navigation should consider health needs, insurance networks, and benefits. |
| 39:18–40:07 | Reminders and navigation support attendance; teams track services, timing, treatment completion, and loss to follow-up. Clinical teams remain responsible for care decisions. |
| 40:18–40:45 | The speaker describes building on Abu Dhabi's existing Malaffi and Sehatna ecosystem. |

**Design implication:** A narrow diabetes-related pathway that continues into chronic-care follow-up fits the stated problem. A future deployment would need to complement existing systems and locally confirmed referral capabilities. **This prototype has no Malaffi or Sehatna connection, no insurance eligibility check, no provider partnership, and no UAE validation.** The video establishes context, not integration permission or clinical endorsement.

### Official evaluation Q&A — synthetic data is permitted

[From Idea to Pilot: Building and Benchmarking Healthcare AI — Hack2skill, 34:41–35:08](https://www.youtube.com/watch?v=7r0TDPl4Tmc&t=2081s)

The question asks whether evaluation reports need live-environment testing. At **35:02–35:08**, the Department of Health participant explicitly accepts synthetic-data testing and says a live solution or live-environment test is not expected. This is general submission Q&A; no exclusion of Challenge 05 is stated.

Further context from the same session:

- **37:15–38:35:** adaptability and ease of integration matter; fitting one existing platform is not required.
- **41:47–42:53:** completion metrics depend on the pathway; follow-up matters when the pathway needs it.
- **43:00–44:12:** UAE or global prototypes and future localization are considered, subject to applicable challenge requirements.

Therefore, proceed with transparent synthetic test cases and reproducible reports; a real deployment trial is not a submission prerequisite. Show the chosen workflow's completion evidence and limitations. Do not label simulated improvements as patient outcomes. The official channel/title and available transcript were checked; timestamps refer to that transcript.

## Taiwan background references

### Population prevalence: Health Promotion Administration (HPA)

[HPA: Five health actions for high blood glucose; diabetes prevalence among adults aged 20 and over is 13.1%](https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=5020&pid=20454) (English description of a Chinese-language source).

- Publisher: Taiwan Ministry of Health and Welfare, **Health Promotion Administration**.
- Published and updated: **3 November 2026**.
- Underlying period: **2020–2024 National Nutrition and Health Survey**.
- Reported population: Taiwan adults **aged 20 and above**.
- Reported diabetes prevalence: **13.1%**.

This is a population-level background statistic, not a measure of missed follow-up, not a patient-level record, and not a prevalence estimate for the UAE. HPA is distinct from the National Health Insurance Administration. No extrapolation or calculation using this figure is part of the prototype.

### Diabetes risk assessment and personalized education: NHIA

[NHIA, Google and Taipei Medical University launch personalized diabetes education](https://www.nhi.gov.tw/ch/cp-19702-c76b0-3255-1.html) (English description of a Chinese-language source).

- Publisher: Taiwan **National Health Insurance Administration**.
- Published: **4 March 2026**; updated **5 March 2026**.
- The announcement describes diabetes risk assessment and personalized education, with field validation involving **40 clinics** and a collaboration with Google, Taipei Medical University, and other organizations.
- It describes use of individual medical records and a diabetes complication index under the program's own governance, including data remaining at the agency and minimum necessary use.

This is a **separate Taiwanese program**. It does not give this project access to its data or model, and it is not evidence that Nightingale works. No affiliation, partnership, reuse of its model, or corresponding validation is claimed. It is cited only as relevant Taiwanese chronic-care context.

### Optional NHIA open-data references — not imported

| Dataset | What the official metadata describes | Why it is not patient data |
| --- | --- | --- |
| [39206: HbA1c or glycated albumin examination rate](https://data.gov.tw/dataset/39206) | Annual institution identifiers, examination counts, eligible diabetes-medication patient counts, and their rate. | Institution-level aggregates do not reveal an individual's result, test date, or next due date. |
| [39208: fundus examination or retinal photography rate](https://data.gov.tw/dataset/39208) | Annual institution identifiers, examination counts, eligible diabetes-medication patient counts, and their rate. | The measure describes recorded examination coverage, not an individual retinal finding or referral outcome. |

Both metadata pages identify NHIA as provider and **Government Data Open License, version 1** as the license; metadata was last updated **12 August 2026** when checked. The pages offer CSV resources, but this project did not download them. Their actual covered years have therefore not been inspected; do not treat the metadata update date as a data year. The denominator shown in metadata is diabetes patients using diabetes medication, not all adults or all people with diabetes.

If a later version imports either dataset, record the downloaded resource version, covered years, retrieval date, license/attribution, exclusions, and every transformation. Do not sum institution counts as unique people without verifying methodology. Do not infer personal appointment deadlines or local UAE performance from these aggregates.

## Reuse and validation statement

Only short attributed factual summaries and links are included here. No raw records, full articles, or video transcript are packaged. Government open-data metadata is a potential future source; it is not the source of the fictional cases.

The prototype demonstrates workflow transitions and safeguards. It does not establish clinical safety, improved health outcomes, culturally suitable messaging, translated-language quality, or functioning referrals. A real deployment would require appropriate permissions, clinicians, local users and service partners, and an evaluation designed around the actual setting.
