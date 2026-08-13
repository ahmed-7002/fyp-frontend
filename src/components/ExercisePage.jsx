import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import BreathingOrb from "./BreathingOrb.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

// Kept deliberately small - two presets, not a menu. Both use the same
// underlying "inhale -> hold -> exhale -> hold" cycle shape; "hold2" is
// simply skipped for presets that don't use a second hold (see `sequence`).
const PRESETS = {
  box: {
    label: "Box breathing",
    description:
      "Equal inhale, hold, exhale, hold - a steadying, structured rhythm.",
    durations: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
    sequence: ["inhale", "hold1", "exhale", "hold2"],
  },
  relax: {
    label: "4-7-8 relaxing breath",
    description:
      "A longer exhale than inhale - often used to ease into calm.",
    durations: { inhale: 4, hold1: 7, exhale: 8 },
    sequence: ["inhale", "hold1", "exhale"],
  },
};

const PHASE_LABEL = { inhale: "Inhale", hold1: "Hold", exhale: "Exhale", hold2: "Hold" };

// The standard 5-4-3-2-1 sensory grounding technique - same wording
// already used in risk_engine.py's anxiety tips, so a tip that mentions
// this can now point somewhere that actually walks a person through it.
const GROUNDING_STEPS = [
  { sense: "see", count: 5, prompt: "Name 5 things you can see" },
  { sense: "touch", count: 4, prompt: "Name 4 things you can touch" },
  { sense: "hear", count: 3, prompt: "Name 3 things you can hear" },
  { sense: "smell", count: 2, prompt: "Name 2 things you can smell" },
  { sense: "taste", count: 1, prompt: "Name 1 thing you can taste" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/**
 * Shown after either exercise finishes (breathing: on Stop, once at least
 * one cycle completed; grounding: after the last "taste" step). Kept as a
 * simple 3-option check-in rather than a form, so it stays quick to answer
 * even for someone who doesn't have much energy for typing right now.
 */
function CheckInPrompt({ value, onSelect, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 mb-8"
    >
      <p className="font-display text-lg text-ink mb-4">How are you feeling now?</p>

      <div className="flex flex-wrap gap-3 mb-2">
        {[
          { key: "good", label: "Feeling good" },
          { key: "same", label: "Still feeling stressed" },
          { key: "difficult", label: "Still having difficulties" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              value === opt.key
                ? "bg-teal text-white border-teal"
                : "border-teal/30 text-muted hover:text-ink hover:bg-teal-light/30"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {value && (
          <motion.p
            key={value}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-ink/80 mt-4 leading-relaxed"
          >
            {value === "good" &&
              "Glad to hear it. Carry this steadiness with you today."}
            {value === "same" &&
              "That's okay - some days need more than a few minutes of breathing. Talking to a friend or family member can genuinely help too."}
            {value === "difficult" &&
              "That's okay - some days need more than a few minutes of breathing. Talking to a friend or family member can genuinely help too. If things continue to feel like too much, please consider speaking with a mental health professional."}
          </motion.p>
        )}
      </AnimatePresence>

      <button
        onClick={onDismiss}
        className="text-sm font-medium text-muted hover:text-ink transition-colors mt-4"
      >
        Dismiss
      </button>
    </motion.div>
  );
}

function BreathingSection({ onCompleted }) {
  const [presetKey, setPresetKey] = useState("box");
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycles, setCycles] = useState(0);
  const timeoutRef = useRef(null);

  const preset = PRESETS[presetKey];
  const sequence = preset.sequence;
  const currentPhase = sequence[phaseIndex];

  useEffect(() => {
    if (!running) return;

    const durationMs = (preset.durations[currentPhase] || 4) * 1000;
    timeoutRef.current = setTimeout(() => {
      setPhaseIndex((prevIndex) => {
        const next = (prevIndex + 1) % sequence.length;
        if (next === 0) setCycles((c) => c + 1);
        return next;
      });
    }, durationMs);

    return () => clearTimeout(timeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phaseIndex, presetKey]);

  const handleStart = () => {
    setPhaseIndex(0);
    setCycles(0);
    setRunning(true);
  };

  const handleStop = () => {
    setRunning(false);
    clearTimeout(timeoutRef.current);
    const didAtLeastOneCycle = cycles >= 1;
    setPhaseIndex(0);
    // Only trigger the check-in if they actually did something - stopping
    // immediately after clicking Start shouldn't prompt "how do you feel".
    if (didAtLeastOneCycle) onCompleted();
  };

  const handlePresetChange = (key) => {
    if (running) handleStop();
    setPresetKey(key);
  };

  return (
    <>
      <div className="flex gap-3 mb-8">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key}
            onClick={() => handlePresetChange(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              presetKey === key
                ? "bg-teal text-white border-teal"
                : "border-teal/30 text-muted hover:text-ink hover:bg-teal-light/30"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted mb-8 max-w-md">{preset.description}</p>

      {running && (
        <motion.p
          key={currentPhase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center font-display text-2xl text-ink mb-4"
        >
          {PHASE_LABEL[currentPhase]}
        </motion.p>
      )}

      <div className="flex justify-center mb-10">
        <BreathingOrb size={240} phase={running ? currentPhase : null} durations={preset.durations} />
      </div>

      <div className="flex items-center justify-center gap-4 mb-6">
        {!running ? (
          <button
            onClick={handleStart}
            className="px-7 py-3 rounded-full bg-teal text-white font-medium hover:bg-teal-dark transition-colors shadow-soft"
          >
            Start
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-7 py-3 rounded-full border border-teal text-teal font-medium hover:bg-teal-light/40 transition-colors"
          >
            Stop
          </button>
        )}
      </div>

     
    </>
  );
}

function GroundingSection({ onCompleted }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(() => GROUNDING_STEPS.map((s) => Array(s.count).fill("")));

  const step = GROUNDING_STEPS[stepIndex];
  const isLastStep = stepIndex === GROUNDING_STEPS.length - 1;

  const handleChange = (itemIndex, value) => {
    setAnswers((prev) => {
      const next = prev.map((arr) => [...arr]);
      next[stepIndex][itemIndex] = value;
      return next;
    });
  };

  const handleNext = () => {
    if (isLastStep) {
      onCompleted();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handleRestart = () => {
    setStepIndex(0);
    setAnswers(GROUNDING_STEPS.map((s) => Array(s.count).fill("")));
  };

  return (
    <>
      <p className="text-sm text-muted mb-6">
        Step {stepIndex + 1} of {GROUNDING_STEPS.length} - take your time, there's no wrong answer.
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
          className="card p-6 mb-8"
        >
          <p className="font-display text-xl text-ink mb-5">{step.prompt}</p>
          <div className="space-y-3">
            {Array.from({ length: step.count }).map((_, i) => (
              <input
                key={i}
                type="text"
                value={answers[stepIndex][i]}
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder={`${i + 1}.`}
                className="w-full px-4 py-2.5 rounded-xl bg-mist/60 border border-transparent focus:border-teal/40 focus:outline-none text-sm text-ink placeholder:text-muted"
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-4">
        <button
          onClick={handleNext}
          className="px-7 py-3 rounded-full bg-teal text-white font-medium hover:bg-teal-dark transition-colors shadow-soft"
        >
          {isLastStep ? "Finish" : "Next"}
        </button>
        {stepIndex > 0 && (
          <button
            onClick={handleRestart}
            className="text-sm font-medium text-muted hover:text-ink transition-colors"
          >
            Start over
          </button>
        )}
      </div>
    </>
  );
}

export default function ExercisePage() {
  usePageTitle("Exercises");

  const [mode, setMode] = useState("breathing");
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [checkInValue, setCheckInValue] = useState(null);

  const handleModeChange = (m) => {
    setCheckInVisible(false);
    setCheckInValue(null);
    setMode(m);
  };

  const handleExerciseCompleted = () => {
    setCheckInValue(null);
    setCheckInVisible(true);
  };

  const dismissCheckIn = () => {
    setCheckInVisible(false);
    setCheckInValue(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 pt-14 pb-24">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <span className="font-mono text-xs text-teal">A quiet pause</span>
        <h1 className="font-display text-3xl text-ink mt-2 mb-2">Exercises</h1>
        <p className="text-muted mb-8 max-w-xl">
          Short, guided exercises you can return to any time - before an
          assessment, after one, or whenever you need a moment.
        </p>

        {/* Mode tabs */}
        <div className="flex gap-3 mb-8">
          {[
            { key: "breathing", label: "Breathing" },
            { key: "grounding", label: "Grounding" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => handleModeChange(m.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                mode === m.key
                  ? "bg-ink text-white border-ink"
                  : "border-teal/30 text-muted hover:text-ink hover:bg-teal-light/30"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "breathing" ? (
          <BreathingSection onCompleted={handleExerciseCompleted} />
        ) : (
          <GroundingSection onCompleted={handleExerciseCompleted} />
        )}

        {checkInVisible && (
          <CheckInPrompt value={checkInValue} onSelect={setCheckInValue} onDismiss={dismissCheckIn} />
        )}

        <div className="card p-6 border-clay/30 bg-clay-light/40 mt-2">
          <p className="text-sm text-ink/80">
            If you're feeling overwhelmed and this isn't enough, please reach
            out to someone you trust or a mental health professional.
          </p>
        </div>

        <Link to="/" className="inline-block mt-8 text-sm font-medium text-muted hover:text-ink transition-colors">
          ← Back home
        </Link>
      </motion.div>
    </div>
  );
}