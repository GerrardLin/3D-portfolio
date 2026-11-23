# Career Exhibit Studio Evaluation

## Question and methods

Does résumé-driven design highlight the relevant work, and does one checker-guided revision improve scene validity? The evaluation fixtures contain six fictional résumés spanning environmental data, design research, software reliability, finance, community operations, and bilingual product work. Each brief has two predefined entries relevant to its target audience. The tutoring résumé shown in the studio is separate from these six briefs.

The runner evaluates two layouts per résumé, giving 12 candidates per method. Fixed plans place entries in source order. The single-call arm uses the initial AI design, and the revision arm uses that same initial design plus one feedback call when the checker returns a correctable issue. This pairs the comparison on the same initial model output. Each arm uses the same final scene checks. A transport failure appears in the results and the runner skips its revision. Validity is measured before the editor can substitute a fallback.

The new model arms produce bounded geometry. Checks cover available exhibit IDs, part limits, rotated bounds, separation between exhibits, framing, and link integrity. The runner also compares geometry and viewpoint separately from palette. Allowing a vocabulary of shapes makes the planning task more demanding than selecting exhibit templates.

Content fit is measured by the count of labelled entries in the first three stops. The runner checks entry IDs against the approved brief and compares the two alternatives by grouping and route. A report review should also inspect whether the selected features and order make sense for the target audience. Model output contains scene instructions and preapproved entry IDs. The published text comes directly from the approved entries.

## Measurements

| Method | Valid before fallback | Mean generation and check time | Key entries among the first three stops | Approved bindings | Distinct layout pairs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Fixed | 12/12 | 0.43 ms | 18/24 | 12/12 | 6/6 |
| One model call | Pending | Pending | Pending | Pending | Pending |
| Checker and one revision | Pending | Pending | Pending | Pending | Pending |

The fixed baseline reported zero violations with the updated checks, which include sight-line occlusion. The current regression suite covers geometry parameters and links to hidden exhibits. A regression reproduces the rear evaluation display blocked by a foreground panel and verifies that the tour chooses a clear camera angle. Timing is from one local run and excludes browser rendering. Model results require a configured provider. A test double supplied a clipped first plan and a corrected second plan, confirming that the feedback reaches the revision call and that a persistently invalid plan uses a checked fallback. The production editor also passed the complete extraction, approval, generation, and revision flow against a local test gateway. These checks exercise the implementation. Model repair rate and latency still require a provider run.

## Comparing what visitors understand

Use the demo toggle to compare composed objects with standard panels. Both treatments carry the same facts and visitor route. Ask one group to start with panels and the other to start with objects. Give both groups the same three tasks: identify the main contribution, locate evidence for it, and say which visible details are illustrations. Record completion time and errors without treating preference as comprehension. A visitor study has not been run.

## Export verification

Chrome exercised the desktop studio, imported pasted text and a text-based PDF, and generated an edited portfolio ZIP. The edited title, hidden exhibit, and revised stop order survived export. The extracted site ran under a nested path on a separate local server. Mobile-width guided 3D and 2D navigation worked. Disabling WebGL displayed the reading view.

Run `pnpm evaluate --fixed-only` to reproduce the measured baseline. Run `pnpm evaluate` with a configured model to write per-candidate results, attempts, timing, validity, and summary metrics to `artifacts/evaluation.json`.
