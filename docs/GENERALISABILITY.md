# Generalisability of the AviSafe Framework to Other High-Consequence Safety Domains

**Addresses AviSafe Aim 2, Objective O8:** *Evaluate the generalisability of the AviSafe
framework methodology to other high-consequence safety domains.*

## Summary position

AviSafe's *architecture* generalises well beyond aviation; its *content* does not, and
was never intended to. The distinction matters for how this section should be read: what
transfers is a reusable pattern - structured-plus-narrative incident data → ensemble
classification → dual SHAP/LIME explainability → cross-method causal consensus →
domain-expert-authored recommendation rules → regulator-facing report - not the specific
risk features, category taxonomy, or recommendation text built for aviation, which are
aviation-specific by design and would need to be rebuilt, not reused, for another domain.

## What is domain-general (transfers directly)

These components of the implementation reference no aviation-specific concept and would
run unmodified against a differently-shaped incident dataset:

- **The pipeline architecture itself** (`src/pipeline/train_pipeline.py`): load → validate
  → preprocess → feature engineer → derive category labels from narrative text → build a
  model-ready matrix → CV-tuned candidate model selection → SHAP/LIME explanation →
  causal pattern synthesis → recommendation generation → persistence. Nothing in this
  control flow assumes flight, aircraft, or airspace.
- **The narrative-text labelling *pattern*** (`src/data/label_engineering.py`): deriving
  a category label via keyword/NLP matching against free-text narrative when no
  authoritative category field exists. The specific CFIT/LOC-I/Runway-Excursion regexes
  are aviation vocabulary, but the underlying technique - and the precision/recall
  tradeoffs and false-positive traps documented in that module's comments (e.g. distinguishing
  a genuine causal mechanism from a merely co-occurring symptom) - apply to any domain
  whose incident narratives use domain jargon to describe a small number of recurring
  failure modes.
- **Model-agnostic ensemble tuning** (`src/models/tuner.py`, `src/models/registry.py`):
  Random Forest / Extra Trees / XGBoost / LightGBM / SVM under
  class-balanced, cross-validated randomized search. This is standard tabular ML tooling
  with zero aviation coupling.
- **SHAP+LIME cross-validation as an epistemic safeguard**
  (`src/explainability/causal_pattern_map.py`): the core methodological contribution here
  - treating agreement between two structurally different explanation methods (SHAP's
  game-theoretic attribution vs. LIME's local surrogate-model coefficients) as stronger
  evidence than either alone - is a general answer to the "Clever Hans" risk (Lapuschkin
  et al., 2019) that any high-stakes ML explainability application faces, not one specific
  to accident causation.
- **The evidence-to-recommendation *mechanism*** (`src/explainability/recommendation_engine.py`):
  a declarative rule base mapping {category → trigger features → priority, stakeholder,
  recommendation text}. The aviation rules are hard-coded, but the mechanism - domain
  experts author a rule base once, the system matches it against whatever features SHAP/LIME
  surface for each run - is exactly how a domain expert in another field would encode their
  own causal knowledge.
- **The regulator-report structure** (`src/explainability/report_generator.py`): executive
  summary → methodology → performance → causal evidence → recommendations →
  limitations. This structure (and in particular the discipline of stating limitations -
  label heuristic quality, correlation-vs-causation, sample size per category - alongside
  the findings) is domain-independent good practice for any safety-critical ML report.
- **The service/database architecture** (`src/database/`, `src/api/`): experiment
  tracking, training-job orchestration, and prediction logging have no domain content at
  all.

## What must be rebuilt per domain (does not transfer)

- **The category taxonomy and its labelling rules.** CFIT/LOC-I/Runway Excursion are
  ICAO/IATA-defined categories specific to fixed-wing and rotary-wing aviation. A new
  domain needs its own taxonomy (ideally an authoritative field in its incident database,
  which would be a strict improvement on aviation's situation here - see Limitations in
  the generated report) and, if narrative-derived, its own keyword/NLP rules calibrated
  against real narrative samples the way `label_engineering.py`'s rules were spot-checked
  against real NTSB text in this project.
- **The risk-engineering features** (`src/data/risk_engineering.py`): Weather_Risk,
  Flight_Phase_Risk, CFIT_Risk, Runway_Excursion_Risk encode aviation domain knowledge
  about which raw fields matter and how they combine. A maritime application would need
  analogous features built from sea-state, vessel class, and traffic-separation-scheme
  data; a healthcare application from patient acuity, staffing ratios, and procedure type.
  This step requires a domain expert, not just an engineer re-running the pipeline.
- **The recommendation rule base's content** (not its mechanism): "Strengthen terrain
  awareness training," addressed to "Flight Operations," is meaningful only in aviation.
  Every {trigger → recommendation → stakeholder} rule needs domain-specific authorship.
- **Regulatory framing and audience.** The report generator's assumptions - a body
  resembling ICAO/FAA/EASA exists, receives structured recommendations, and can act on
  category-specific findings - hold for aviation's unusually mature safety-reporting
  culture (mandatory occurrence reporting, ASRS-style voluntary near-miss systems). Domains
  without an equivalent regulatory apparatus would need the report re-targeted at whatever
  body actually owns safety action there (e.g. a hospital's patient safety committee).

## Candidate domains, assessed concretely

| Domain | Structured+narrative incident data? | Precedent for SHAP/LIME? | Assessment |
|---|---|---|---|
| **Healthcare (patient safety)** | Yes - adverse event / never-event reports typically pair structured fields (procedure, ward, staffing) with free-text incident narratives | Yes, extensively - this project's own literature review cites Lundberg et al. (2020) on clinical SHAP and a 2024 systematic review (Ferrara et al.) finding AI's value there is decision support, not replacement, which is exactly AviSafe's own framing | **Strongest candidate.** Precedent is closest, data shape is closest, and the "decision support not decision" framing this report generator already assumes matches how the healthcare literature frames AI's appropriate role. |
| **Maritime** | Yes - MAIB/NTSB-equivalent marine casualty reports have a similar structured+narrative form; grounding is a plausible CFIT analogue (controlled vessel navigated into shoal/terrain via loss of positional awareness) | Limited but growing | Plausible with moderate rework; category taxonomy and risk features would need full redefinition (sea-state, traffic density, pilotage) but the narrative-labelling *approach* should transfer reasonably directly given similar report-writing conventions. |
| **Rail** | Yes - RAIB/FRA accident databases; signal-passed-at-danger (SPAD) is a plausible runway-excursion analogue (a controlled overrun of a defined boundary) | Limited | Plausible; smaller per-category sample sizes in most national datasets may be a bigger constraint than in aviation given AviSafe's own experience that a minority accident category (CFIT, ~7% of labelled rows here) already strains model reliability. |
| **Process safety / oil & gas** | Yes - OSHA PSM and similar incident databases | Limited | Plausible but the risk-feature engineering step is the heaviest lift here - process safety causal factors (equipment age, maintenance interval, procedure deviation) are less standardised across the industry than aviation's phase-of-flight/weather framing. |
| **Nuclear** | Partial - incident reporting exists (INPO, IAEA) but is more proceduralised and less narrative-rich; category volume is very low | Minimal | Weakest fit of those considered: low incident volume undermines the ML classification step specifically (this project's own CFIT-class experience - the smallest, least reliable category - is a preview of what an entire nuclear-incident dataset would look like), even though the explainability/reporting layers would still be conceptually applicable to whatever other classification task existed. |

## Preconditions for a successful transfer

Based on what actually made AviSafe work (and what nearly didn't - the labelling-quality
problems documented in `src/data/label_engineering.py`'s comments, and the outcome-leakage
issue caught and fixed in `src/pipeline/train_pipeline.py`'s `_OUTCOME_COLUMNS` exclusion),
a transfer to a new domain needs, in order of importance:

1. **A domain expert who can author risk features and recommendation rules** - the ML/XAI
   machinery is reusable; the domain knowledge is not, and is the harder half of the work.
2. **Enough per-category incident volume** for the minority classes specifically, not just
   the dataset overall - this project's CFIT category (609 of ~8,300 labelled rows) is the
   cautionary example of what happens when a category is thin.
3. **A narrative field, or better, an authoritative category field** - narrative-derived
   labels are a documented fallback, not a first choice; if the target domain already
   records category directly, skip the labelling-quality risk entirely.
4. **Discipline about outcome leakage** - every domain will have its own version of the
   "the model discovered how severe the incident turned out to be, not what caused it"
   trap this project hit and fixed; it is a generic risk, not an aviation-specific one, and
   the next domain should expect to find and exclude its own outcome variables.

## Conclusion

The methodology generalises; the model, the features, and the recommendations do not, and
were never claimed to. What AviSafe demonstrates for a future application in another
high-consequence domain is a validated *procedure* - narrative-derived labelling done
carefully, ensemble classification with proper CV and class balancing, dual-method
explainability with an explicit consensus step, and a report format that states its own
limitations alongside its findings - rather than a reusable artefact. Healthcare is the
strongest immediate candidate given both data-shape similarity and existing SHAP/LIME
precedent already surveyed in this project's own literature review; any domain considered
should be assessed against the four preconditions above before assuming the framework will
transfer cleanly.
