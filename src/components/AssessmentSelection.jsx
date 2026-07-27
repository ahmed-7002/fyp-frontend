import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

const MODES = [
  {
    key: "questionnaire",
    title: "Question-based",
    desc: "Answer the 21-item DASS-21 scale at your own pace.",
    time: "~5 min",
  },
  {
    key: "video",
    title: "Video-based",
    desc: "We'll capture your facial expressions via webcam for emotion analysis.",
    time: "~2 min",
  },
  {
    key: "combined",
    title: "Combined",
    desc: "Both the questionnaire and video analysis for the fullest picture.",
    time: "~7 min",
  },
];

export default function AssessmentSelection() {
  const navigate = useNavigate();
  const { state, update } = useAssessment();
  usePageTitle("Choose Assessment");

  if (!state.profile) {
    navigate("/onboarding");
    return null;
  }

  const handleSelect = (mode) => {
    update({ mode });
    navigate(`/assessment/${mode}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-24">
      <span className="font-mono text-xs text-teal">Step 2 of 3</span>
      <h1 className="font-display text-3xl text-ink mt-2 mb-2">
        Hi {state.profile.fullName.split(" ")[0]}, how would you like to check in?
      </h1>
      <p className="text-muted mb-10">Choose the assessment mode that feels right today.</p>

      <div className="grid md:grid-cols-3 gap-5">
        {MODES.map((mode, i) => (
          <motion.button
            key={mode.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            whileHover={{ y: -4 }}
            onClick={() => handleSelect(mode.key)}
            className="card p-6 text-left hover:border-teal/50 transition-colors"
          >
            <span className="text-xs font-mono text-lavender">{mode.time}</span>
            <h3 className="font-display text-xl text-ink mt-2 mb-2">{mode.title}</h3>
            <p className="text-muted text-sm leading-relaxed">{mode.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}