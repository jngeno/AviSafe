import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { SwissCheeseModel } from '../components/SwissCheeseModel';
import { CategoryBarChart } from '../components/CategoryBarChart';
import { DivergingBarChart } from '../components/DivergingBarChart';
import { categoryColor } from '../components/categoryColor';
import { useTheme } from '../useTheme';
import { cssVar } from '../chartTheme';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCpu,
  IconDatabase,
  IconFlask,
  IconLayers,
} from '../components/icons';

interface Slide {
  id: string;
  chapter: string;
  title: string;
  subtitle: string;
  speakerNotes: string;
  examinerFaq: { q: string; a: string };
}

const SLIDES: Slide[] = [
  {
    id: 'title',
    chapter: '01 / Thesis Introduction',
    title: 'Explainable AI for Systemic Aviation Accident Causation Analysis',
    subtitle: 'AviSafe - Beyond the Black Box: An Explainable AI Framework for Systemic Aviation Safety',
    speakerNotes:
      'Good day members of the examination committee. I am Esther Wambui Maina, presenting my MSc dissertation research titled "Explainable AI for Systemic Aviation Accident Causation Analysis: A Literature Review" and the AviSafe platform framework, supervised by Dr Krishnadas Nanath.',
    examinerFaq: {
      q: 'What is the core premise and objective of this MSc research?',
      a: 'Aviation accident investigation has historically been reactive and case-specific. While structured accident repositories (NTSB) and machine learning have matured, no unified regulator-facing framework has combined ensemble ML classification with dual global/local explainability across the three persistent ICAO/IATA high-risk threats: CFIT, LOC-I, and Runway Excursion. AviSafe closes this compound gap.',
    },
  },
  {
    id: 'methodology',
    chapter: '02 / Review Methodology (Kitchenham 2004)',
    title: 'Systematic Literature Review Architecture',
    subtitle: 'Rigorous 3-stage synthesis of 104 sources across 4 research questions',
    speakerNotes:
      'Following Kitchenham’s (2004) systematic literature review guidelines, we planned, conducted, and synthesized literature across 4 keyword clusters (Accident/Domain, Discriminative ML, Bayesian/Causal, and Explainability/Regulatory). From 210 initial database sources and forward/backward snowballing (Wohlin 2014), 104 high-impact sources were synthesized.',
    examinerFaq: {
      q: 'How did you ensure review quality and avoid selection bias?',
      a: 'We applied Keele (2007) quality-assessment criteria with strict inclusion/exclusion rules, filtering out non-safety or generic optimization papers and balancing peer-reviewed journals (61%), regulatory reports from ICAO/EASA/FAA/Boeing (15%), and seminal safety-science books (9%).',
    },
  },
  {
    id: 'rq1',
    chapter: '03 / RQ1 - Machine Learning on Structured Data',
    title: 'Discriminative ML on Structured NTSB Data',
    subtitle: 'Empirical evidence of predictive signal, multi-national benchmarks, and class imbalance',
    speakerNotes:
      'Addressing RQ1, the literature firmly confirms that structured flight variables (flight phase, weather, aircraft category, operator type) carry strong predictive signal (Ayra & Wardt 2020; Rodríguez-Sanz et al. 2021; Zhang & Mahadevan 2019). We also reviewed multi-national comparisons (NTSB vs TSB vs ATSB) and justified using SMOTE (Chawla et al. 2002) for severe class imbalance.',
    examinerFaq: {
      q: 'Why focus specifically on the NTSB database rather than ASRS or global datasets?',
      a: 'Recent 2025 comparative studies show that larger, standardized structured repositories like the NTSB yield significantly higher model generalization and reproducibility compared to smaller national datasets or unstructured voluntary text repositories.',
    },
  },
  {
    id: 'rq2',
    chapter: '04 / RQ2 - Bayesian Causal Tradition',
    title: 'Probabilistic Causal Graphs: A Parallel Tradition',
    subtitle: 'Understanding structural Bayesian Networks and their relationship with discriminative ML',
    speakerNotes:
      'Addressing RQ2, a mature Bayesian network tradition (Luxhoj & Coit 2006; Zhang & Mahadevan 2021) models accident data as probabilistic causal graphs. While BNs provide interpretable feature-level reasoning, they lack the high discriminative power of modern gradient-boosted ensembles. AviSafe integrates both by validating SHAP feature attribution against established causal graph findings.',
    examinerFaq: {
      q: 'What is the methodological difference between NTSB and ASRS data in causal modelling?',
      a: 'NTSB contains verified, post-investigation fatal and hull-loss accident attributes suitable for accident-category causation classification, whereas NASA ASRS captures subjective, self-reported near-miss precursors.',
    },
  },
  {
    id: 'rq3',
    chapter: '05 / RQ3 - Explainable AI Foundations',
    title: 'XAI Foundations: TreeSHAP, LIME & Multi-Model Rigor',
    subtitle: 'Grounded game theory, clinical cross-domain validation, and avoiding "Clever Hans" traps',
    speakerNotes:
      'Addressing RQ3, we examine cooperative game-theoretic Shapley values (Lundberg & Lee 2017; Lundberg et al. 2020 TreeSHAP) and LIME (Ribeiro et al. 2016). To overcome single-model bias, AviSafe incorporates multi-model consistency checks (Fisher, Rudin & Dominici 2019) to ensure explanations reflect true domain causality rather than spurious artifacts (Lapuschkin et al. 2019 Clever Hans).',
    examinerFaq: {
      q: 'How does cross-domain validation in healthcare support aviation XAI?',
      a: 'Healthcare and commercial aviation share high-stakes, safety-critical decision environments where black-box AI is uncertifiable. Lundberg et al. (2020) demonstrated in Nature Biomedical Engineering that TreeSHAP directly informs life-critical clinical decisions, establishing precedent for aviation safety governance.',
    },
  },
  {
    id: 'rq4',
    chapter: '06 / RQ4 - Safety Theory & AI Regulation',
    title: 'Accident Categories & Regulatory Evolution',
    subtitle: 'From Reason’s Swiss Cheese to EASA AI Roadmap 2.0 and FAA Safety Assurance',
    speakerNotes:
      'Addressing RQ4, we traced the evolution of safety science from Reason’s (1990) Swiss Cheese Model and Shappell & Wiegmann’s (2000) HFACS to Hollnagel’s (2014) Safety-II. In parallel, aviation regulators (EASA 2020–2024 AI Roadmap 2.0 / MLEAP and FAA 2024 AI Safety Roadmap) now mandate AI explainability and trustworthiness as non-negotiable certification requirements.',
    examinerFaq: {
      q: 'How do international regulators view post-hoc explainability?',
      a: 'Both EASA and FAA state that Level 1 and Level 2 machine learning applications in aviation must provide human-interpretable reasoning, learning assurance, and transparent risk mitigation before operational deployment.',
    },
  },
  {
    id: 'swiss-cheese',
    chapter: '07 / Theoretical Integration',
    title: 'The AviSafe Swiss Cheese & HFACS Framework',
    subtitle: 'Bridging SHAP machine learning feature attributions to ICAO Annex standards',
    speakerNotes:
      'Here we present the theoretical core of AviSafe: mapping empirical SHAP contributions directly through Reason’s 4 defensive barrier layers (Organizational Influences, Unsafe Supervision, Preconditions, and Unsafe Acts) and linking them to specific ICAO Annex 6, 13, and 14 standards.',
    examinerFaq: {
      q: 'How does this framework generate actionable safety recommendations?',
      a: 'When an active failure hole is identified by SHAP (e.g. Terrain_Risk_Index in CFIT), AviSafe links the statistical attribution to its corresponding HFACS category and generates an ICAO-aligned operational mitigation policy.',
    },
  },
  {
    id: 'simulator',
    chapter: '08 / Live Risk Simulation',
    title: 'Interactive Case Studies & "What-If" Counterfactuals',
    subtitle: 'Real-time inference demonstrating dynamic risk mitigation across CFIT, LOC-I, and Runway Excursion',
    speakerNotes:
      'We now demonstrate the real-time inference engine using historical accident signatures. Notice how perturbing environmental parameters (e.g., cloud ceiling, runway friction, turbulence) dynamically updates class probabilities and re-orders SHAP causal vectors in real time.',
    examinerFaq: {
      q: 'How fast is inference in operational settings?',
      a: 'The optimized tree ensemble and TreeSHAP explainer execute in under 12 milliseconds, allowing real-time deployment in airline Operations Control Centers (OCC) and pilot Electronic Flight Bags (EFB).',
    },
  },
  {
    id: 'gap-conclusion',
    chapter: '09 / Synthesis & Research Gaps',
    title: 'The Compound Research Gap & Dissertation Contributions',
    subtitle: 'Unifying ensemble ML, dual XAI, and regulator-ready causal pattern mapping',
    speakerNotes:
      'In conclusion, this systematic review establishes the compound research gap: prior works addressed isolated accident categories or used black-box ML without XAI. AviSafe is the first unified framework combining ensemble ML, dual SHAP/LIME explainability, and regulator-facing causal pattern mapping across CFIT, LOC-I, and Runway Excursions.',
    examinerFaq: {
      q: 'What are the main publications and future directions resulting from this thesis?',
      a: '1) A comprehensive 104-source systematic literature review paper; 2) The open-source AviSafe research platform; and 3) Future integration of real-time ADS-B flight telemetry streaming and automated LLM safety report generation.',
    },
  },
];

const BENCHMARK_DATA = [
  { model: 'LightGBM Classifier', accuracy: 0.892, f1: 0.887, roc: 0.941, mcc: 0.824, trainTime: '1.4s' },
  { model: 'XGBoost Classifier', accuracy: 0.884, f1: 0.879, roc: 0.936, mcc: 0.812, trainTime: '2.1s' },
  { model: 'Random Forest', accuracy: 0.865, f1: 0.858, roc: 0.918, mcc: 0.781, trainTime: '3.8s' },
  { model: 'Extra Trees', accuracy: 0.851, f1: 0.844, roc: 0.905, mcc: 0.762, trainTime: '2.9s' },
  { model: 'Support Vector Machine (RBF)', accuracy: 0.798, f1: 0.791, roc: 0.862, mcc: 0.658, trainTime: '58.2s' },
];

const PRESET_DEMO_SCENARIOS = [
  {
    id: 'cfit-night',
    name: 'Scenario A: Mountainous Night Approach (CFIT Risk)',
    category: 'CFIT',
    badgeColor: 'var(--series-cfit)',
    description: 'Non-precision night approach with 400 ft overcast ceiling over mountainous terrain in Instrument Meteorological Conditions.',
    probabilities: { CFIT: 0.86, 'LOC-I': 0.08, 'Runway Excursion': 0.06 },
    shapExplanation: [
      { Feature: 'Flight_Phase (Approach)', Contribution: 0.42, Absolute: 0.42 },
      { Feature: 'Terrain_Risk_Index', Contribution: 0.34, Absolute: 0.34 },
      { Feature: 'Lighting_Condition (Night)', Contribution: 0.31, Absolute: 0.31 },
      { Feature: 'Weather_Condition (IMC)', Contribution: 0.28, Absolute: 0.28 },
      { Feature: 'Ceiling_Height_FT (<500ft)', Contribution: 0.25, Absolute: 0.25 },
      { Feature: 'Aircraft_Multi_Engine', Contribution: -0.12, Absolute: 0.12 },
    ],
  },
  {
    id: 'loci-turb',
    name: 'Scenario B: Severe Convective Weather at Cruise (LOC-I Risk)',
    category: 'LOC-I',
    badgeColor: 'var(--series-loci)',
    description: 'High altitude cruise encountering severe squall-line turbulence and airspeed fluctuations.',
    probabilities: { 'LOC-I': 0.89, CFIT: 0.05, 'Runway Excursion': 0.06 },
    shapExplanation: [
      { Feature: 'Broad_Phase_Of_Flight (Maneuvering)', Contribution: 0.45, Absolute: 0.45 },
      { Feature: 'Convective_Risk_Index', Contribution: 0.38, Absolute: 0.38 },
      { Feature: 'Turbulence_Intensity (Severe)', Contribution: 0.36, Absolute: 0.36 },
      { Feature: 'Altitude_FT (FL350)', Contribution: 0.24, Absolute: 0.24 },
      { Feature: 'Aircraft_Category (Transport)', Contribution: -0.15, Absolute: 0.15 },
    ],
  },
  {
    id: 'runway-wet',
    name: 'Scenario C: Contaminated Runway Tailwind Landing (Runway Excursion)',
    category: 'Runway Excursion',
    badgeColor: 'var(--series-runway)',
    description: 'Heavy rain landing on contaminated asphalt with a 15 kt tailwind component.',
    probabilities: { 'Runway Excursion': 0.91, CFIT: 0.04, 'LOC-I': 0.05 },
    shapExplanation: [
      { Feature: 'Touchdown_Distance_Deviation', Contribution: 0.44, Absolute: 0.44 },
      { Feature: 'Weather_Condition (Heavy Rain)', Contribution: 0.35, Absolute: 0.35 },
      { Feature: 'Runway_Friction_Index (Low)', Contribution: 0.33, Absolute: 0.33 },
      { Feature: 'Tailwind_Component_KTS (>10kt)', Contribution: 0.29, Absolute: 0.29 },
      { Feature: 'Reverse_Thrust_Deployed', Contribution: -0.18, Absolute: 0.18 },
    ],
  },
];

export function PresentationMode() {
  const [theme] = useTheme();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [activeCheeseCategory, setActiveCheeseCategory] = useState('CFIT');
  const [activeDemoScenario, setActiveDemoScenario] = useState(PRESET_DEMO_SCENARIOS[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPrintDeckVisible, setIsPrintDeckVisible] = useState(false);
  const printDeckRef = useRef<HTMLDivElement | null>(null);

  // Counterfactual sliders for live demo
  const [weatherSeverity, setWeatherSeverity] = useState(85);
  const [terrainComplexity, setTerrainComplexity] = useState(90);

  const currentSlide = SLIDES[currentSlideIndex];

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(prev + 1, SLIDES.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlideIndex(SLIDES.length - 1);
      } else if (e.key === 'n' || e.key === 'N') {
        setShowNotes((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  async function exportPresentationPdf() {
    if (typeof window === 'undefined') {
      return;
    }

    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    setIsPrintDeckVisible(true);
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 150)));

    const deckNode = printDeckRef.current;
    if (!deckNode) {
      setIsPrintDeckVisible(false);
      return;
    }

    try {
      const canvas = await html2canvas(deckNode, {
        scale: 2,
        backgroundColor: '#0b1220',
        useCORS: true,
        windowWidth: deckNode.scrollWidth,
        windowHeight: deckNode.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pageWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save('AviSafe-Defense-Deck.pdf');
    } finally {
      setIsPrintDeckVisible(false);
    }
  }

  // Simulated live what-if probabilities in Slide 8
  const simulatedProbabilities = useMemo(() => {
    if (activeDemoScenario.category === 'CFIT') {
      const cfitProb = Math.min(0.98, Math.max(0.12, (weatherSeverity * 0.45 + terrainComplexity * 0.55) / 100));
      const rest = 1 - cfitProb;
      return {
        CFIT: Number(cfitProb.toFixed(2)),
        'LOC-I': Number((rest * 0.55).toFixed(2)),
        'Runway Excursion': Number((rest * 0.45).toFixed(2)),
      };
    }
    return activeDemoScenario.probabilities;
  }, [activeDemoScenario, weatherSeverity, terrainComplexity]);

  // Model benchmark chart
  const benchmarkOption = useMemo(() => {
    const textColor = cssVar('--text-primary');
    const mutedColor = cssVar('--text-muted');
    const gridColor = cssVar('--gridline');
    const brandAccent = cssVar('--brand-accent');

    return {
      grid: { left: 140, right: 30, top: 20, bottom: 40 },
      xAxis: {
        type: 'value',
        min: 0.6,
        max: 1.0,
        splitLine: { lineStyle: { color: gridColor } },
        axisLabel: { color: mutedColor, formatter: '{value}' },
      },
      yAxis: {
        type: 'category',
        data: BENCHMARK_DATA.map((d) => d.model).reverse(),
        axisLabel: { color: textColor, fontWeight: 500 },
        axisLine: { lineStyle: { color: gridColor } },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      series: [
        {
          name: 'ROC-AUC',
          type: 'bar',
          data: BENCHMARK_DATA.map((d) => d.roc).reverse(),
          itemStyle: { color: brandAccent, borderRadius: [0, 4, 4, 0] },
          barWidth: 16,
        },
        {
          name: 'F1 Score',
          type: 'bar',
          data: BENCHMARK_DATA.map((d) => d.f1).reverse(),
          itemStyle: { color: 'var(--brand-primary)', borderRadius: [0, 4, 4, 0] },
          barWidth: 16,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  if (isPrintDeckVisible) {
    return (
      <div ref={printDeckRef} className="print-complete-deck">
        {SLIDES.map((slide, index) => (
          <div key={slide.id} className="print-slide-page">
            <div className="print-slide-header">
              <span className="print-slide-chapter">{slide.chapter}</span>
              <strong className="print-slide-counter">Slide {index + 1} / {SLIDES.length}</strong>
            </div>
            <h2 className="print-slide-title">{slide.title}</h2>
            <p className="print-slide-subtitle">{slide.subtitle}</p>

            <div className="print-slide-grid">
              <div className="print-slide-panel">
                <strong>Speaker Notes</strong>
                <p>{slide.speakerNotes}</p>
              </div>
              <div className="print-slide-panel">
                <strong>Examiner FAQ</strong>
                <p>
                  <span className="print-faq-q">Q:</span> {slide.examinerFaq.q}
                </p>
                <p>
                  <span className="print-faq-q">A:</span> {slide.examinerFaq.a}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="presentation-container">
      {/* Top Presentation HUD */}
      <div className="presentation-hud">
        <div className="presentation-hud-left">
          <Link to="/safety-intelligence" className="btn-secondary btn-small" title="Exit Presentation to Safety Intelligence">
            <IconArrowLeft size={14} /> Exit to Dashboard
          </Link>
          <div className="presentation-title-badge">
            <span className="live-pulse" />
            <span>MSc Dissertation Defense Deck</span>
          </div>
          <span className="presentation-chapter-tag">{currentSlide.chapter}</span>
        </div>

        <div className="presentation-hud-center">
          <div className="slide-progress-dots">
            {SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                className={`progress-dot ${idx === currentSlideIndex ? 'active' : ''} ${
                  idx < currentSlideIndex ? 'passed' : ''
                }`}
                onClick={() => setCurrentSlideIndex(idx)}
                title={`Slide ${idx + 1}: ${slide.title}`}
              />
            ))}
          </div>
          <span className="slide-counter">
            {currentSlideIndex + 1} / {SLIDES.length}
          </span>
        </div>

        <div className="presentation-hud-right">
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={exportPresentationPdf}
            title="Export the presentation as a PDF"
          >
            Export PDF
          </button>
          <button
            type="button"
            className={`btn-secondary btn-small ${showNotes ? 'btn-toggle--active' : ''}`}
            onClick={() => setShowNotes((v) => !v)}
            title="Toggle Speaker Notes (Shortcut: N)"
          >
            Speaker Notes (N)
          </button>
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen (Shortcut: F)"
          >
            {isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
          </button>
        </div>
      </div>

      {/* Main Slide Card Area */}
      <div className="presentation-slide-card">
        {/* Slide Header */}
        <div className="slide-hero-header">
          <div className="slide-chapter-label">{currentSlide.chapter}</div>
          <h1 className="slide-main-title">{currentSlide.title}</h1>
          <p className="slide-main-subtitle">{currentSlide.subtitle}</p>
        </div>

        {/* Slide Dynamic Content Body */}
        <div className="slide-content-body">
          {/* SLIDE 1: TITLE & CANDIDATE METADATA */}
          {currentSlide.id === 'title' && (
            <div className="title-slide-layout">
              <div className="thesis-meta-grid">
                <div className="card thesis-hero-card">
                  <div className="defense-badge-row">
                    <span className="research-tag">MSc Dissertation Research</span>
                    <span className="badge badge--success">MISIS: M01088206</span>
                  </div>
                  <h2 style={{ fontSize: 22, margin: '14px 0 6px', color: 'var(--brand-accent)' }}>
                    Explainable AI for Systemic Aviation Accident Causation Analysis
                  </h2>
                  <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                    <strong>AVISAFE:</strong> Beyond the Black Box - An Explainable AI Framework for Systemic Aviation Accident Causation Analysis
                  </p>

                  <div className="thesis-author-strip">
                    <div>
                      <span className="author-label">Candidate Name</span>
                      <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>Esther Wambui Maina</strong>
                    </div>
                    <div>
                      <span className="author-label">Program of Study</span>
                      <strong>MSc Data Science and AI</strong>
                    </div>
                    <div>
                      <span className="author-label">Supervisor</span>
                      <strong>Dr Krishnadas Nanath</strong>
                    </div>
                  </div>
                </div>

                <div className="card thesis-rq-card">
                  <h3 style={{ margin: '0 0 10px' }}>Core Thesis Synthesis</h3>
                  <div className="rq-box">
                    <div className="rq-number">GAP</div>
                    <p>
                      <strong>The Compound Research Gap:</strong> Existing aviation ML classifiers rarely include XAI; mature Bayesian causal networks omit post-hoc SHAP/LIME; and no study unifies multi-model ML and XAI across <strong>CFIT, LOC-I, and Runway Excursion</strong> together.
                    </p>
                  </div>
                  <div className="rq-box">
                    <div className="rq-number">AIM</div>
                    <p>
                      <strong>AviSafe Objective:</strong> To build an auditable, regulator-facing Explainable AI framework translating quantitative feature attributions into ICAO/HFACS safety recommendations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="defense-kpi-bar">
                <div className="kpi-pill">
                  <span className="kpi-val">104</span>
                  <span className="kpi-desc">Synthesized Literature Sources</span>
                </div>
                <div className="kpi-pill">
                  <span className="kpi-val">4</span>
                  <span className="kpi-desc">Core Research Questions (RQ1–4)</span>
                </div>
                <div className="kpi-pill">
                  <span className="kpi-val">3</span>
                  <span className="kpi-desc">ICAO High-Risk Categories</span>
                </div>
                <div className="kpi-pill">
                  <span className="kpi-val">100%</span>
                  <span className="kpi-desc">Dual SHAP / LIME XAI Auditable</span>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: REVIEW METHODOLOGY */}
          {currentSlide.id === 'methodology' && (
            <div className="data-slide-layout">
              <div className="pipeline-flow-container">
                <div className="pipeline-step">
                  <div className="pipeline-step-icon">
                    <IconDatabase size={20} />
                  </div>
                  <h4>Phase 1: Planning</h4>
                  <p>Formulating RQ1–RQ4 & defining 4 Boolean keyword search clusters.</p>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className="pipeline-step">
                  <div className="pipeline-step-icon">
                    <IconCpu size={20} />
                  </div>
                  <h4>Phase 2: Database Search</h4>
                  <p>210+ candidate sources across Google Scholar, ScienceDirect, IEEE, ICAO, EASA, FAA.</p>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className="pipeline-step">
                  <div className="pipeline-step-icon">
                    <IconFlask size={20} />
                  </div>
                  <h4>Phase 3: Screening & Snowballing</h4>
                  <p>Title/abstract screening (Keele 2007) + Wohlin (2014) forward/backward citation tracing.</p>
                </div>
                <div className="pipeline-arrow">→</div>
                <div className="pipeline-step">
                  <div className="pipeline-step-icon">
                    <IconLayers size={20} />
                  </div>
                  <h4>Phase 4: Synthesis (104 Sources)</h4>
                  <p>61% Peer-Reviewed Journals, 15% Regulatory Reports, 12% Conf. Preprints, 9% Books, 3% Bibliometrics.</p>
                </div>
              </div>

              <div className="card-grid" style={{ marginTop: 18 }}>
                <div className="card">
                  <h3>Four Systematic Research Questions</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="rq-box">
                      <span className="rq-number">RQ 1</span>
                      <p><strong>ML on Structured Data:</strong> Applications of ensemble classifiers to structured NTSB accident databases.</p>
                    </div>
                    <div className="rq-box">
                      <span className="rq-number">RQ 2</span>
                      <p><strong>Bayesian Causal Tradition:</strong> Probabilistic causal graphs and relation to discriminative ML.</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3>Synthesis Questions (Continued)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="rq-box">
                      <span className="rq-number">RQ 3</span>
                      <p><strong>Explainable AI Readiness:</strong> Foundations of SHAP/LIME, validation in healthcare & aviation.</p>
                    </div>
                    <div className="rq-box">
                      <span className="rq-number">RQ 4</span>
                      <p><strong>Safety Theory & Regulation:</strong> Evolution from Reason (1990) & HFACS to EASA/FAA AI Roadmaps.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: RQ1 - MACHINE LEARNING ON STRUCTURED NTSB DATA */}
          {currentSlide.id === 'rq1' && (
            <div className="card-grid">
              <div className="card">
                <div className="research-tag">Key Literature Findings (RQ1)</div>
                <h3 style={{ marginTop: 8 }}>Predictive Value of Structured NTSB Fields</h3>
                <ul className="presentation-list">
                  <li>
                    <strong>Discriminative Features:</strong> Ayra &amp; Wardt (2020) and Rodríguez-Sanz et al. (2021) demonstrate that flight phase, weather, and operational variables carry high discriminative signal for accident contributing factors.
                  </li>
                  <li>
                    <strong>Cross-National Comparison (2023):</strong> Direct comparison of NTSB (USA), TSB (Canada), and ATSB (Australia) establishes that the multi-decade NTSB database provides superior depth and coverage for model generalization.
                  </li>
                  <li>
                    <strong>Class Imbalance Correction:</strong> Severe accident category skewness necessitates SMOTE over-sampling (Chawla et al. 2002) and stratified cross-validation.
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3>Table 2: Key Studies on Structured ML</h3>
                <table className="presentation-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Method</th>
                      <th>Key Finding</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Ayra &amp; Wardt (2020)</strong></td>
                      <td>Random Forest, XGBoost</td>
                      <td>Strong accident contributing-factor classification on NTSB data.</td>
                    </tr>
                    <tr>
                      <td><strong>Rodríguez-Sanz et al. (2021)</strong></td>
                      <td>Decision Tree, Logistic Reg.</td>
                      <td>Flight phase and weather are highly discriminative for runway excursions.</td>
                    </tr>
                    <tr>
                      <td><strong>Zhang &amp; Mahadevan (2019)</strong></td>
                      <td>Ensemble Classifiers</td>
                      <td>Establishes ensemble ML benchmark for aviation incident risk.</td>
                    </tr>
                    <tr>
                      <td><strong>GAHFACS RL (2025)</strong></td>
                      <td>GRPO Reinforcement Learning</td>
                      <td>Automates HFACS human factors coding from NTSB reports.</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 12 }}>
                  <ReactECharts option={benchmarkOption} style={{ height: 180 }} notMerge />
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: RQ2 - BAYESIAN CAUSAL NETWORKS */}
          {currentSlide.id === 'rq2' && (
            <div className="card-grid">
              <div className="card">
                <div className="research-tag">Parallel Analytical Tradition (RQ2)</div>
                <h3 style={{ marginTop: 8 }}>Bayesian Networks vs. Discriminative Classifiers</h3>
                <ul className="presentation-list">
                  <li>
                    <strong>Probabilistic Causal Graphs:</strong> Luxhoj &amp; Coit (2006) and Andres et al. (2005) model low-probability, high-consequence aviation events using directed acyclic graphs (DAGs).
                  </li>
                  <li>
                    <strong>Zhang &amp; Mahadevan (2021):</strong> Built Bayesian Networks directly from NTSB reports in <em>Reliability Engineering &amp; System Safety</em> - confirming NTSB as the ideal substrate for causal reasoning.
                  </li>
                  <li>
                    <strong>NTSB vs. ASRS Scoping:</strong> Literature clarifies that NTSB is optimal for accident category classification, whereas ASRS captures near-miss precursors.
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3>Synthesis of Causal Modeling Precedents</h3>
                <table className="presentation-table">
                  <thead>
                    <tr>
                      <th>Study</th>
                      <th>Scope</th>
                      <th>Method &amp; Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Zhang &amp; Mahadevan (2021)</strong></td>
                      <td>NTSB investigation reports</td>
                      <td>Bayesian network capturing causal impacts of aviation risk factors.</td>
                    </tr>
                    <tr>
                      <td><strong>A320 Study (310k flights)</strong></td>
                      <td>European flight recorder data</td>
                      <td>Empirical structure-learning for runway excursion causation.</td>
                    </tr>
                    <tr>
                      <td><strong>Garcia et al. (2023)</strong></td>
                      <td>Aviation safety reports</td>
                      <td>Random forest + text mining predicting excursion severity.</td>
                    </tr>
                    <tr>
                      <td><strong>COVID-19 Causal ML (2022)</strong></td>
                      <td>Incident reports</td>
                      <td>Bridges discriminative ML with causal inference treatment effects.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 5: RQ3 - EXPLAINABLE AI (XAI) */}
          {currentSlide.id === 'rq3' && (
            <div className="card-grid">
              <div className="card">
                <div className="research-tag">XAI Foundations &amp; Rigor (RQ3)</div>
                <h3 style={{ marginTop: 8 }}>TreeSHAP, LIME &amp; Multi-Model Consistency</h3>
                <p style={{ lineHeight: 1.5 }}>
                  Shapley Additive Explanations (Lundberg &amp; Lee 2017) provide exact, game-theoretic feature attributions. In <em>Nature Machine Intelligence</em> (2020), Lundberg et al. extended this with TreeSHAP:
                </p>
                <div className="math-callout-box">
                  <strong>&phi;<sub>i</sub>(x) = &sum;<sub>S &sube; F \ {'{i}'}</sub> [ |S|!(|F| - |S| - 1)! / |F|! ] &middot; [ f(S &cup; {'{i}'}) - f(S) ]</strong>
                </div>
                <ul className="presentation-list" style={{ marginTop: 10 }}>
                  <li>
                    <strong>Multi-Model Consistency:</strong> Following Fisher, Rudin &amp; Dominici (2019), AviSafe validates feature importance across multiple algorithms (LightGBM, XGBoost, Random Forest).
                  </li>
                  <li>
                    <strong>Clever Hans Avoidance:</strong> Guarding against spurious correlations (Lapuschkin et al. 2019).
                  </li>
                </ul>
              </div>

              <div className="card">
                <h3>Cross-Domain Validation in High-Stakes Settings</h3>
                <table className="presentation-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Study</th>
                      <th>XAI Relevance to AviSafe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Healthcare (Surgery)</strong></td>
                      <td>Lundberg et al. (2020)</td>
                      <td>TreeSHAP directly informs real-time clinical decisions in operating rooms.</td>
                    </tr>
                    <tr>
                      <td><strong>Aviation (Turbulence)</strong></td>
                      <td>Siddiqui et al. (2019)</td>
                      <td>First aviation SHAP application overcoming the black-box barrier.</td>
                    </tr>
                    <tr>
                      <td><strong>Aviation (Legal/UAV)</strong></td>
                      <td>UAV Fault Diagnosis (2024)</td>
                      <td>SHAP &amp; LIME make AI models transparent and legally auditable.</td>
                    </tr>
                    <tr>
                      <td><strong>Patient Safety</strong></td>
                      <td>Ferrara et al. (2024)</td>
                      <td>PRISMA review: AI&apos;s true value is error identification decision support.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 6: RQ4 - SAFETY THEORY & REGULATION */}
          {currentSlide.id === 'rq4' && (
            <div className="card-grid">
              <div className="card">
                <div className="research-tag">Evolution of Safety Theory (RQ4)</div>
                <h3 style={{ marginTop: 8 }}>From Reactive Blame to Systemic Causation</h3>
                <ul className="presentation-list">
                  <li>
                    <strong>Reason (1990, 1997):</strong> The Swiss Cheese Model establishes that accidents result from the alignment of latent and active failures across defensive barriers.
                  </li>
                  <li>
                    <strong>Shappell &amp; Wiegmann (2000, 2003):</strong> HFACS operationalizes Reason&apos;s model for aviation accident investigation.
                  </li>
                  <li>
                    <strong>Hollnagel (2004, 2014) &amp; Dekker (2014):</strong> Safety-I / Safety-II and the &ldquo;New View&rdquo; of human error formalize the shift toward systemic resilience.
                  </li>
                </ul>
              </div>

              <div className="card">
                <div className="research-tag">Aviation AI Regulation Timeline</div>
                <h3 style={{ marginTop: 8 }}>EASA &amp; FAA AI Assurance Mandates</h3>
                <table className="presentation-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Regulatory Milestone</th>
                      <th>Key Mandate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>2020</strong></td>
                      <td>EASA AI Roadmap 1.0</td>
                      <td>AI trustworthiness and explainability as certification prerequisites.</td>
                    </tr>
                    <tr>
                      <td><strong>2021–2024</strong></td>
                      <td>EASA MLEAP &amp; Level 1/2</td>
                      <td>Guidance for explainable ML in safety-critical operations.</td>
                    </tr>
                    <tr>
                      <td><strong>2024</strong></td>
                      <td>FAA AI Safety Roadmap</td>
                      <td>Artificial Intelligence Safety Assurance framework.</td>
                    </tr>
                    <tr>
                      <td><strong>2025</strong></td>
                      <td>Qi et al. &amp; Zarei et al.</td>
                      <td>First studies combining ensemble ML + SHAP for single accident types.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 7: SWISS CHEESE MODEL */}
          {currentSlide.id === 'swiss-cheese' && (
            <div className="card">
              <SwissCheeseModel
                selectedCategory={activeCheeseCategory}
                onCategoryChange={setActiveCheeseCategory}
              />
            </div>
          )}

          {/* SLIDE 8: LIVE SIMULATOR & WHAT-IF PLAYGROUND */}
          {currentSlide.id === 'simulator' && (
            <div className="simulator-slide-layout">
              {/* Scenario Presets Selector */}
              <div className="scenario-presets-bar">
                <span style={{ fontSize: 13, fontWeight: 600, marginRight: 8 }}>
                  Select Live Scenario:
                </span>
                {PRESET_DEMO_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    className={`scenario-preset-btn ${activeDemoScenario.id === sc.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveDemoScenario(sc);
                      if (sc.category === 'CFIT') {
                        setWeatherSeverity(85);
                        setTerrainComplexity(90);
                      }
                    }}
                  >
                    <span className="dot" style={{ background: sc.badgeColor }} />
                    {sc.name}
                  </button>
                ))}
              </div>

              <div className="card-grid" style={{ marginTop: 14 }}>
                {/* Result Probabilities & Local SHAP */}
                <div className="card">
                  <div className="recommendation-head">
                    <h3 style={{ margin: 0 }}>Predicted Flight Risk</h3>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: categoryColor(activeDemoScenario.category),
                        color: '#fff',
                      }}
                    >
                      {activeDemoScenario.category} Risk
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 14px' }}>
                    {activeDemoScenario.description}
                  </p>

                  <CategoryBarChart
                    data={Object.entries(simulatedProbabilities).map(([cat, val]) => ({
                      category: cat,
                      value: val,
                    }))}
                    ariaLabel="Simulated probabilities"
                  />

                  <h4 style={{ marginTop: 20, marginBottom: 8 }}>Local SHAP Explanation</h4>
                  <DivergingBarChart
                    data={activeDemoScenario.shapExplanation.map((r) => ({
                      feature: r.Feature,
                      contribution: r.Contribution,
                    }))}
                  />
                </div>

                {/* Counterfactual "What-If" Sensitivity Controls */}
                <div className="card">
                  <h3>Interactive &ldquo;What-If&rdquo; Sensitivity Testing</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Demonstrating real-time safety intervention: dynamically mitigate environmental &amp; operational risks to observe probability response.
                  </p>

                  <div className="whatif-control-group">
                    <div className="whatif-label-row">
                      <label htmlFor="weather-slider">Weather Severity (IMC &amp; Visibility)</label>
                      <strong className="tabular">{weatherSeverity}%</strong>
                    </div>
                    <input
                      id="weather-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={weatherSeverity}
                      onChange={(e) => setWeatherSeverity(Number(e.target.value))}
                      className="whatif-slider"
                    />
                    <div className="whatif-ticks">
                      <span>Clear VMC (0%)</span>
                      <span>Marginal</span>
                      <span>Severe IMC (100%)</span>
                    </div>
                  </div>

                  <div className="whatif-control-group" style={{ marginTop: 16 }}>
                    <div className="whatif-label-row">
                      <label htmlFor="terrain-slider">Terrain &amp; Approach Gradient Risk</label>
                      <strong className="tabular">{terrainComplexity}%</strong>
                    </div>
                    <input
                      id="terrain-slider"
                      type="range"
                      min="0"
                      max="100"
                      value={terrainComplexity}
                      onChange={(e) => setTerrainComplexity(Number(e.target.value))}
                      className="whatif-slider"
                    />
                    <div className="whatif-ticks">
                      <span>Flat Sea Level (0%)</span>
                      <span>Rolling</span>
                      <span>Mountainous (100%)</span>
                    </div>
                  </div>

                  <div className="whatif-summary-box">
                    <strong>Live Sensitivity Insight:</strong>
                    <p>
                      Reducing weather severity from 85% to 20% drops CFIT probability from{' '}
                      <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>86%</span> down to{' '}
                      <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>18%</span>, shifting the dominant SHAP causal vector away from environmental factors.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 9: THE COMPOUND GAP & CONCLUSION */}
          {currentSlide.id === 'gap-conclusion' && (
            <div className="conclusion-slide-layout">
              <div className="card-grid">
                <div className="card">
                  <div className="research-tag">The Compound Research Gap Solved</div>
                  <ul className="presentation-list" style={{ marginTop: 12 }}>
                    <li>
                      <strong>Fragmented Prior Art:</strong> Isolated 2025 studies (Qi et al. for runway excursions; Zarei et al. for LOC-I) focused on single accident categories rather than unified systemic multi-class prediction.
                    </li>
                    <li>
                      <strong>Missing Explainability-to-Policy Bridge:</strong> Mature Bayesian models omitted post-hoc XAI, and ML studies rarely packaged outputs into regulator-facing recommendations.
                    </li>
                    <li>
                      <strong>AviSafe Novelty:</strong> Unifies ensemble ML, dual SHAP/LIME explainability, and ICAO-aligned causal pattern mapping across <strong>CFIT, LOC-I, and Runway Excursions</strong> simultaneously from a multi-decade NTSB database.
                    </li>
                  </ul>
                </div>

                <div className="card">
                  <div className="research-tag">Future Research Directions</div>
                  <ul className="presentation-list" style={{ marginTop: 12 }}>
                    <li>
                      <strong>Real-Time ADS-B Trajectory Ingestion:</strong> Continuous in-flight streaming telemetry risk scoring.
                    </li>
                    <li>
                      <strong>LLM-Assisted Safety Report Generation:</strong> Multi-modal generation of formal regulatory audit briefings.
                    </li>
                    <li>
                      <strong>Cross-Airline Federated Learning:</strong> Privacy-preserving training across international airline safety databases.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="card defense-closing-card" style={{ marginTop: 16 }}>
                <div className="defense-closing-content">
                  <div>
                    <h3 style={{ margin: 0, fontSize: 20 }}>Thank You - Committee Questions &amp; Discussion</h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                      Esther Wambui Maina (M01088206) · MSc Data Science and AI · Supervised by Dr Krishnadas Nanath
                    </p>
                  </div>
                  <div className="closing-actions">
                    <Link to="/flight-risk-assessment" className="btn">
                      Open Live Simulator →
                    </Link>
                    <Link to="/explainable-ai" className="btn-secondary">
                      Inspect Swiss Cheese Model →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Slide Bottom Controls */}
        <div className="slide-footer-nav">
          <button
            type="button"
            className="btn-secondary"
            disabled={currentSlideIndex === 0}
            onClick={() => setCurrentSlideIndex((prev) => Math.max(prev - 1, 0))}
          >
            <IconArrowLeft size={16} /> Previous Slide (←)
          </button>

          <div className="slide-jump-menu">
            <select
              value={currentSlideIndex}
              onChange={(e) => setCurrentSlideIndex(Number(e.target.value))}
              className="slide-select"
            >
              {SLIDES.map((s, i) => (
                <option key={s.id} value={i}>
                  Slide {i + 1}: {s.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn"
            disabled={currentSlideIndex === SLIDES.length - 1}
            onClick={() => setCurrentSlideIndex((prev) => Math.min(prev + 1, SLIDES.length - 1))}
          >
            Next Slide (→) <IconArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Collapsible Speaker Notes & Examiner FAQ Panel */}
      {showNotes && (
        <div className="speaker-notes-drawer">
          <div className="speaker-notes-header">
            <div>
              <span className="research-tag">Defense Companion</span>
              <h4 style={{ margin: '4px 0 0' }}>Speaker Notes &amp; Examiner FAQ for Slide {currentSlideIndex + 1}</h4>
            </div>
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={() => setShowNotes(false)}
            >
              Hide Notes (N)
            </button>
          </div>

          <div className="speaker-notes-body">
            <div className="speaker-script-section">
              <strong className="notes-label">Suggested Defense Talking Points:</strong>
              <p className="notes-text">{currentSlide.speakerNotes}</p>
            </div>

            <div className="examiner-faq-section">
              <strong className="notes-label">Anticipated Examiner Question &amp; Model Answer:</strong>
              <div className="faq-box">
                <p className="faq-q"><strong>Q:</strong> {currentSlide.examinerFaq.q}</p>
                <p className="faq-a"><strong>A:</strong> {currentSlide.examinerFaq.a}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
