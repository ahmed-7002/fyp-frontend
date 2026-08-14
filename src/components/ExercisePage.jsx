import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import BreathingOrb from "./BreathingOrb.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";
import { useFocusMode } from "../lib/FocusModeContext.jsx";

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

// --------------------------------------------------------------------------
// Small self-contained helpers
// --------------------------------------------------------------------------

function usePingSound() {
  const audioCtxRef = useRef(null);

  const play = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 528;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // never let a sound effect break the actual exercise
    }
  };

  return play;
}

function useSpeech() {
  const speak = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };
  return speak;
}

function useWakeLock(active) {
  const wakeLockRef = useRef(null);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    const requestLock = async () => {
      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        // not critical - exercise still works without it
      }
    };

    const handleVisibilityChange = () => {
      if (active && document.visibilityState === "visible") requestLock();
    };

    if (active) {
      requestLock();
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [active]);
}

function StaticBreathingIndicator({ size = 240, label = "Breathe" }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, #4A8A85, #1E4F4C)",
      }}
    >
      <span className="font-body text-xs tracking-[0.2em] uppercase text-white/90">{label}</span>
    </div>
  );
}

function CheckInPrompt({ value, onSelect, onDismiss }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-6 mb-8">
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
            {value === "good" && "Glad to hear it. Carry this steadiness with you today."}
            {value === "same" &&
              "That's okay - some days need more than a few minutes of breathing. Talking to a friend or family member can genuinely help too."}
            {value === "difficult" &&
              "That's okay - some days need more than a few minutes of breathing. Talking to a friend or family member can genuinely help too. If things continue to feel like too much, please consider speaking with a mental health professional."}
          </motion.p>
        )}
      </AnimatePresence>

      <button onClick={onDismiss} className="text-sm font-medium text-muted hover:text-ink transition-colors mt-4">
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
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const timeoutRef = useRef(null);

  const prefersReducedMotion = useReducedMotion();
  const playPing = usePingSound();
  const speak = useSpeech();

  const preset = PRESETS[presetKey];
  const sequence = preset.sequence;
  const currentPhase = sequence[phaseIndex];

  useWakeLock(running);

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

  useEffect(() => {
    if (!running || !voiceEnabled) return;
    speak(PHASE_LABEL[currentPhase]);
    playPing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, currentPhase, voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [voiceEnabled]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const handleStart = () => {
    setPhaseIndex(0);
    setCycles(0);
    setRunning(true);
  };

  const handleStop = () => {
    setRunning(false);
    clearTimeout(timeoutRef.current);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const didAtLeastOneCycle = cycles >= 1;
    setPhaseIndex(0);
    if (didAtLeastOneCycle) onCompleted();
  };

  const handlePresetChange = (key) => {
    if (running) handleStop();
    setPresetKey(key);
  };

  return (
    <>
      <div className="flex gap-3 mb-6">
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

      <p className="text-sm text-muted mb-6 max-w-md">{preset.description}</p>

      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => setVoiceEnabled((v) => !v)}
          role="switch"
          aria-checked={voiceEnabled}
          className={`relative w-11 h-6 rounded-full transition-colors ${voiceEnabled ? "bg-teal" : "bg-mist"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
              voiceEnabled ? "translate-x-5" : ""
            }`}
          />
        </button>
        <span className="text-sm font-medium text-ink">Voice guidance</span>
      </div>

      {voiceEnabled && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted mb-8">
          Start the exercise and close your eyes - you'll hear each step spoken aloud.
        </motion.p>
      )}
      {!voiceEnabled && <div className="mb-8" />}

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
        {prefersReducedMotion ? (
          <StaticBreathingIndicator size={240} label={running ? PHASE_LABEL[currentPhase] : "Breathe"} />
        ) : (
          <BreathingOrb size={240} phase={running ? currentPhase : null} durations={preset.durations} />
        )}
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
          <button onClick={handleRestart} className="text-sm font-medium text-muted hover:text-ink transition-colors">
            Start over
          </button>
        )}
      </div>
    </>
  );
}

export default function ExercisePage() {
  usePageTitle("Exercises");

  const { focusMode, setFocusMode } = useFocusMode();
  const [mode, setMode] = useState("breathing");
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [checkInValue, setCheckInValue] = useState(null);

  // Safety net: if someone navigates away from this page by any means
  // other than clicking "Exit focus mode" (browser back, closing the tab
  // and returning later via history, etc.), this guarantees the Navbar
  // comes back on every other page rather than staying hidden globally.
  useEffect(() => {
    return () => setFocusMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className={`max-w-2xl mx-auto px-6 pb-24 ${focusMode ? "pt-20" : "pt-14"}`}>
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <span className="font-mono text-xs text-teal">A quiet pause</span>
            <h1 className="font-display text-3xl text-ink mt-2 mb-2">Exercises</h1>
          </div>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="shrink-0 px-4 py-2 rounded-full text-sm font-medium border border-teal/30 text-muted hover:text-ink hover:bg-teal-light/30 transition-colors"
          >
            {focusMode ? "Exit focus mode" : "Focus mode"}
          </button>
        </div>

        <p className="text-muted mb-8 max-w-xl">
          Short, guided exercises you can return to any time - before an
          assessment, after one, or whenever you need a moment.
        </p>

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

        {!focusMode && (
          <Link to="/" className="inline-block mt-8 text-sm font-medium text-muted hover:text-ink transition-colors">
            ← Back home
          </Link>
        )}
      </motion.div>
    </div>
  );
}