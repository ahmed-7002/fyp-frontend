import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useApiClient } from "../lib/api.js";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import { useBackgroundCapture } from "../lib/useBackgroundCapture.js";
import DassQuestionnaire from "./DassQuestionnaire.jsx";

/**
 * Combined mode, restructured: instead of "answer 21 questions, THEN
 * separately look at the camera for 30 seconds," the webcam captures a
 * frame every ~2 seconds silently in the background *while* the person
 * answers the questionnaire - capturing genuine reactions to the actual
 * content, not a disconnected follow-up moment. Capture stops the instant
 * either 155 frames is reached or the questionnaire finishes, whichever
 * comes first, then both are analyzed together.
 *
 * Phases:
 *   intro         - explains what's about to happen, requests camera access
 *                   on an explicit user gesture (not silently on page load)
 *   questionnaire - DassQuestionnaire on screen; capture running behind it
 *   analyzing     - questionnaire just finished; uploading captured frames
 *   submitting    - both results being scored and saved
 *   error         - something failed; offers a retry
 */
export default function CombinedAssessmentFlow() {
  const { user } = useUser();
  const api = useApiClient();
  const navigate = useNavigate();
  const { state, update } = useAssessment();

  const [phase, setPhase] = useState("intro");
  const [errorMsg, setErrorMsg] = useState("");

  const capture = useBackgroundCapture(phase === "questionnaire");

  // Same "unsaved progress" guard as the other assessment modes.
  useEffect(() => {
    update({ inProgress: true });
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDassComplete = async (dassAnswers) => {
    setPhase("analyzing");
    const frames = await capture.stopAndGetFrames();

    let ferResult = null;
    // Only attempt video analysis if a meaningful number of frames exist -
    // e.g. camera permission was denied, or the person answered so fast
    // almost nothing was captured. In that case we degrade gracefully to a
    // questionnaire-only result rather than failing the whole submission.
    if (frames.length >= 10) {
      try {
        const formData = new FormData();
        frames.forEach((blob, i) => formData.append("frames", blob, `frame_${i}.jpg`));
        const res = await api.post("/api/fer/analyze", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        ferResult = res.data;
      } catch {
        // Video analysis failed - still proceed with the questionnaire
        // result rather than losing everything the person just answered.
        ferResult = null;
      }
    }

    setPhase("submitting");
    try {
      const res = await api.post("/api/assessments", {
        clerk_user_id: user.id,
        full_name: state.profile.fullName,
        age: state.profile.age,
        gender: state.profile.gender,
        assessment_mode: "combined",
        dass_answers: dassAnswers,
        fer_result: ferResult || undefined,
      });
      update({ submissionResult: res.data, inProgress: false });
      navigate(`/results/${res.data.id}`);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || "Something went wrong submitting your assessment.");
      setPhase("error");
    }
  };

  // --- Intro / consent screen -----------------------------------------
  if (phase === "intro") {
    return (
      <div className="max-w-lg mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="card p-8">
          <span className="font-mono text-xs text-teal">Combined assessment</span>
          <h1 className="font-display text-2xl text-ink mt-2 mb-3">Before you begin</h1>
          <p className="text-muted text-sm leading-relaxed mb-4">
            You'll answer the same 21 questions as usual. This time, your
            webcam will also quietly capture your expressions in the
            background while you answer - there's nothing extra for you to
            do, just look at your screen naturally as you normally would.
          </p>
          <p className="text-muted text-sm leading-relaxed mb-8">
            Capturing stops automatically the moment you finish the
            questionnaire, and both results are analyzed together right
            after.
          </p>
          <button
            onClick={() => setPhase("questionnaire")}
            className="px-7 py-3.5 rounded-full bg-teal text-white font-medium hover:bg-teal-dark transition-colors"
          >
            Start
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Analyzing / submitting loading states --------------------------
  if (phase === "analyzing" || phase === "submitting") {
    return (
      <div className="max-w-md mx-auto px-6 pt-24 text-center">
        <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-teal-light border-t-teal animate-spin" />
        <p className="text-muted">
          {phase === "analyzing" ? "Analyzing your captured expressions…" : "Scoring your results…"}
        </p>
      </div>
    );
  }

  // --- Error state ------------------------------------------------------
  if (phase === "error") {
    return (
      <div className="max-w-md mx-auto px-6 pt-24 text-center">
        <p className="text-clay mb-4">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-full border border-teal text-teal font-medium hover:bg-teal-light/40 transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }

  // --- Questionnaire phase: capture runs silently behind this ------------
  return (
    <div>
      <DassQuestionnaire onComplete={handleDassComplete} />

      {/* Small self-preview - lets the person confirm their face is
          actually framed in shot, mirrored like a normal selfie camera.
          Positioned top-right (below the navbar) deliberately separate
          from the bottom-right status pill/error corner below, so the two
          don't crowd each other on narrow phone screens. */}
      <div className="fixed top-20 right-4 md:right-6 z-40 w-24 h-32 md:w-28 md:h-36 rounded-xl overflow-hidden border-2 border-teal shadow-soft bg-ink">
        <video
          ref={capture.videoRef}
          muted
          playsInline
          className="w-full h-full object-cover -scale-x-100"
        />
        {capture.isCapturing && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
          </span>
        )}
      </div>

      {capture.isCapturing && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-surface border border-teal-light/60 rounded-full pl-3 pr-4 py-2 shadow-soft">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
          </span>
          <span className="text-xs text-muted">Recording your expressions</span>
        </div>
      )}

      {capture.cameraError && (
        <div className="fixed bottom-6 right-6 z-40 max-w-xs bg-surface border border-clay/30 rounded-xl px-4 py-3 shadow-soft">
          <p className="text-xs text-clay">{capture.cameraError}</p>
        </div>
      )}
    </div>
  );
}