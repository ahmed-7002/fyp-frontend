import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useApiClient } from "../lib/api.js";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import { ResultsSkeleton } from "./Skeleton.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";
import TipsCard from "./TipsCard.jsx";

const SEVERITY_COLOR = {
  Normal: "bg-teal-light text-teal-dark",
  Mild: "bg-lavender-light text-lavender",
  Moderate: "bg-clay-light text-clay",
  Severe: "bg-clay text-white",
  "Extremely Severe": "bg-ink text-white",
};

const EMOTION_COLORS = {
  happy: "#2B6F6B",
  neutral: "#8C7AA9",
  surprise: "#4A8A85",
  sad: "#C97B63",
  angry: "#B0503C",
  fear: "#9A6E8C",
  disgust: "#7A5A4A",
};

function ScoreCard({ label, score, severity }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted mb-1">{label}</p>
      <p className="font-display text-3xl text-ink mb-2">{score}</p>
      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${SEVERITY_COLOR[severity] || "bg-mist"}`}>
        {severity}
      </span>
    </div>
  );
}

export default function ResultsDashboard() {
  const { id } = useParams();
  const api = useApiClient();
  const navigate = useNavigate();
  const { state } = useAssessment();

  const [result, setResult] = useState(state.submissionResult?.id === id ? state.submissionResult : null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState("");

  usePageTitle("Your Results");

  useEffect(() => {
    if (result) return;
    api
      .get(`/api/assessments/${id}`)
      .then((res) => setResult(res.data))
      .catch(() => setError("We couldn't load these results."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <ResultsSkeleton />;
  if (error) return <p className="text-center text-clay pt-24">{error}</p>;
  if (!result) return null;

  const { dass_result, fer_result, final_risk_level, final_summary, actionable_tips } = result;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-14 pb-24">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <span className="font-mono text-xs text-teal">Step 3 of 3</span>
        <h1 className="font-display text-3xl text-ink mt-2 mb-2">Your results</h1>
        <p className="text-muted mb-8 max-w-2xl">{final_summary}</p>

        <div className="card p-6 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-muted mb-1">Overall reflection level</p>
            <p className="font-display text-2xl text-ink">{final_risk_level}</p>
          </div>
          <span className="text-xs text-muted max-w-xs">
            This reflects patterns in your answers only - it is not a diagnosis.
          </span>
        </div>

        {dass_result && (
          <section className="mb-10">
            <h2 className="font-display text-xl text-ink mb-4">DASS-21 scores</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <ScoreCard label="Depression" score={dass_result.depression_score} severity={dass_result.depression_severity} />
              <ScoreCard label="Anxiety" score={dass_result.anxiety_score} severity={dass_result.anxiety_severity} />
              <ScoreCard label="Stress" score={dass_result.stress_score} severity={dass_result.stress_severity} />
            </div>
          </section>
        )}

        {fer_result && fer_result.frames_analyzed > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-xl text-ink mb-1">Facial emotion analysis</h2>
            <p className="text-sm text-muted mb-4">
              Based on {fer_result.frames_analyzed} of {fer_result.frames_captured} captured frames.
              Dominant expression: <strong className="text-ink capitalize">{fer_result.dominant_emotion}</strong>
            </p>
            <div className="card p-6 space-y-3">
              {Object.entries(EMOTION_COLORS).map(([emotion]) => {
                const value = fer_result[emotion] ?? 0;
                return (
                  <div key={emotion} className="flex items-center gap-3">
                    <span className="w-20 text-sm capitalize text-muted">{emotion}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-mist overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: EMOTION_COLORS[emotion] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-mono text-ink">{value.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <TipsCard tips={actionable_tips} />

        <div className="card p-6 border-clay/30 bg-clay-light/40 mb-8">
          <p className="text-sm text-ink/80">
            Remember: this is a question-based asset, not a professional
            diagnostic tool. For a professional assessment, please consult a
            medical doctor.
          </p>
        </div>

        <button
          onClick={() => navigate("/select")}
          className="px-6 py-2.5 rounded-full border border-teal text-teal font-medium hover:bg-teal-light/40 transition-colors"
        >
          Take another assessment
        </button>
      </motion.div>
    </div>
  );
}