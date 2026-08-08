import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/clerk-react";
import { useApiClient } from "../lib/api.js";
import { ProfileSkeleton } from "./Skeleton.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";
import DeleteConfirmToast from "./DeleteConfirmToast.jsx";
import SuccessToast from "./SuccessToast.jsx";
import TipsCard from "./TipsCard.jsx";

const SEVERITY_COLOR = {
  Normal: "bg-teal-light text-teal-dark",
  Mild: "bg-lavender-light text-lavender",
  Moderate: "bg-clay-light text-clay",
  Severe: "bg-clay text-white",
  "Extremely Severe": "bg-ink text-white",
};

const RISK_COLOR = {
  Low: "bg-teal-light text-teal-dark",
  Moderate: "bg-lavender-light text-lavender",
  High: "bg-clay-light text-clay",
  "Needs Attention": "bg-ink text-white",
};

const MODE_LABEL = {
  questionnaire: "Question-based",
  video: "Video-based",
  combined: "Combined",
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

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A session row that lazily fetches its own full detail (DASS scores, FER
 * breakdown, summary, and tips) only the first time it's expanded, then
 * caches it locally so re-collapsing/re-expanding doesn't refetch.
 */
function SessionRow({ session, api, onRequestDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail && !loading) {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/assessments/${session.id}`);
        setDetail(res.data);
      } catch {
        setError("Couldn't load this session's details.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteClick = (e) => {
    // Stop this from also bubbling up to the row's own toggle() click.
    e.stopPropagation();
    onRequestDelete(session.id);
  };

  return (
    <div className="card overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-teal-light/20 transition-colors"
      >
        <div>
          <p className="text-ink font-medium">{MODE_LABEL[session.assessment_mode]}</p>
          <p className="text-xs text-muted font-mono mt-0.5">{formatDate(session.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              RISK_COLOR[session.final_risk_level] || "bg-mist text-muted"
            }`}
          >
            {session.final_risk_level}
          </span>

          {/* Delete trigger - opens the confirmation toast, does not delete by itself */}
          <span
            role="button"
            tabIndex={0}
            onClick={handleDeleteClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleDeleteClick(e);
            }}
            aria-label="Delete this session"
            title="Delete this session"
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-clay hover:bg-clay-light/50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted">
            ▾
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-teal-light/60">
              {loading && <p className="text-sm text-muted py-4">Loading details…</p>}
              {error && <p className="text-sm text-clay py-4">{error}</p>}

              {detail && (
                <div className="pt-4 space-y-5">
                  <p className="text-sm text-muted">{detail.final_summary}</p>

                  {detail.dass_result && (
                    <div>
                      <p className="text-xs font-mono text-teal mb-2">DASS-21</p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {[
                          ["Depression", detail.dass_result.depression_score, detail.dass_result.depression_severity],
                          ["Anxiety", detail.dass_result.anxiety_score, detail.dass_result.anxiety_severity],
                          ["Stress", detail.dass_result.stress_score, detail.dass_result.stress_severity],
                        ].map(([label, score, severity]) => (
                          <div key={label} className="rounded-xl bg-mist/60 p-3">
                            <p className="text-xs text-muted mb-1">{label}</p>
                            <p className="font-display text-lg text-ink">{score}</p>
                            <span
                              className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${
                                SEVERITY_COLOR[severity] || "bg-mist"
                              }`}
                            >
                              {severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.fer_result && detail.fer_result.frames_analyzed > 0 && (
                    <div>
                      <p className="text-xs font-mono text-teal mb-2">
                        Facial emotion analysis - {detail.fer_result.frames_analyzed} of{" "}
                        {detail.fer_result.frames_captured} frames · dominant:{" "}
                        <span className="capitalize text-ink">{detail.fer_result.dominant_emotion}</span>
                      </p>
                      <div className="space-y-2">
                        {Object.keys(EMOTION_COLORS).map((emotion) => {
                          const value = detail.fer_result[emotion] ?? 0;
                          return (
                            <div key={emotion} className="flex items-center gap-2">
                              <span className="w-16 text-xs capitalize text-muted">{emotion}</span>
                              <div className="flex-1 h-2 rounded-full bg-mist overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${value}%`, backgroundColor: EMOTION_COLORS[emotion] }}
                                />
                              </div>
                              <span className="w-10 text-right text-xs font-mono text-ink">{value.toFixed(1)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <TipsCard tips={detail.actionable_tips} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Profile() {
  const { user } = useUser();
  const api = useApiClient();
  usePageTitle("Your Profile");

  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState("");

  // --- Delete flow state --------------------------------------------------
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/assessments")
      .then((res) => mounted && setSessions(res.data))
      .catch(() => mounted && setError("Couldn't load your past sessions."))
      .finally(() => {});
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestDelete = (id) => {
    setDeleteError("");
    setPendingDeleteId(id);
  };

  const cancelDelete = () => {
    if (deleting) return;
    setPendingDeleteId(null);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/api/assessments/${pendingDeleteId}`);
      setSessions((prev) => prev.filter((s) => s.id !== pendingDeleteId));
      setPendingDeleteId(null);
      setSuccessMessage("Session deleted");
    } catch {
      setDeleteError("Couldn't delete this session. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 pt-16 pb-24">
      <h1 className="font-display text-3xl text-ink mb-1">Your profile</h1>
      <p className="text-muted mb-8">
        {user?.fullName ? `${user.fullName} · ` : ""}Every past session you've completed.
      </p>

      {error && <p className="text-clay">{error}</p>}

      {!sessions && !error && <ProfileSkeleton />}

      {sessions && sessions.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-muted">You haven't completed any assessments yet.</p>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} api={api} onRequestDelete={requestDelete} />
          ))}
        </div>
      )}

      <DeleteConfirmToast
        open={pendingDeleteId !== null}
        onCancel={cancelDelete}
        onHoldComplete={confirmDelete}
        deleting={deleting}
        error={deleteError}
      />

      <SuccessToast
        open={!!successMessage}
        message={successMessage}
        onDismiss={() => setSuccessMessage("")}
      />
    </div>
  );
}