import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useApiClient } from "../lib/api.js";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import { useBackgroundCapture } from "../lib/useBackgroundCapture.js";
import DassQuestionnaire from "./DassQuestionnaire.jsx";
import LoadingCarousel from "./LoadingCarousel.jsx"; // <-- 1. Import Carousel

export default function CombinedAssessmentFlow() {
  const { user } = useUser();
  const api = useApiClient();
  const navigate = useNavigate();
  const { state, update } = useAssessment();

  const [phase, setPhase] = useState("intro");
  const [errorMsg, setErrorMsg] = useState("");

  const capture = useBackgroundCapture(phase === "questionnaire");

  const [dragPos, setDragPos] = useState(null);
  const previewBoxRef = useRef(null);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const getPoint = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const clampToViewport = (x, y) => {
    const box = previewBoxRef.current;
    if (!box) return { x, y };
    const { width, height } = box.getBoundingClientRect();
    const maxX = Math.max(window.innerWidth - width, 0);
    const maxY = Math.max(window.innerHeight - height, 0);
    return { x: Math.min(Math.max(x, 0), maxX), y: Math.min(Math.max(y, 0), maxY) };
  };

  const handleDragStart = (e) => {
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const { clientX, clientY } = getPoint(e);
    dragState.current = {
      dragging: true,
      startX: clientX,
      startY: clientY,
      origX: rect.left,
      origY: rect.top,
    };
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragState.current.dragging) return;
      e.preventDefault();
      const { clientX, clientY } = getPoint(e);
      const dx = clientX - dragState.current.startX;
      const dy = clientY - dragState.current.startY;
      setDragPos(clampToViewport(dragState.current.origX + dx, dragState.current.origY + dy));
    };
    const handleEnd = () => {
      dragState.current.dragging = false;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, []);

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
    if (frames.length >= 10) {
      try {
        const formData = new FormData();
        frames.forEach((blob, i) => formData.append("frames", blob, `frame_${i}.jpg`));
        const res = await api.post("/api/fer/analyze", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        ferResult = res.data;
      } catch {
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

  // --- 2. Update this section to use the Carousel ---
  if (phase === "analyzing" || phase === "submitting") {
    return (
      <div className="max-w-md mx-auto px-6 pt-24 text-center">
        {phase === "analyzing" ? (
          <LoadingCarousel />
        ) : (
          <div className="flex flex-col items-center justify-center mt-4 min-h-[100px]">
            <div className="w-8 h-8 mx-auto mb-5 rounded-full border-2 border-teal-light border-t-teal animate-spin" />
            <p className="text-muted text-sm italic">Scoring your results…</p>
          </div>
        )}
      </div>
    );
  }

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

  const previewStyle = dragPos
    ? { position: "fixed", left: dragPos.x, top: dragPos.y, right: "auto" }
    : undefined;
  const previewDefaultClasses = dragPos ? "" : "top-20 right-4 md:right-6";

  return (
    <div>
      <DassQuestionnaire onComplete={handleDassComplete} />

      <div
        ref={previewBoxRef}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        style={previewStyle}
        className={`fixed ${previewDefaultClasses} z-40 w-24 h-32 md:w-28 md:h-36 rounded-xl overflow-hidden border-2 border-teal shadow-soft bg-ink cursor-grab active:cursor-grabbing touch-none select-none`}
      >
        <video
          ref={capture.videoRef}
          muted
          playsInline
          className="w-full h-full object-cover -scale-x-100 pointer-events-none"
        />
        {capture.isCapturing && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 pointer-events-none">
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