import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useApiClient } from "../lib/api.js";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";
import DassQuestionnaire from "./DassQuestionnaire.jsx";
import VideoAssessment from "./VideoAssessment.jsx";
import CombinedAssessmentFlow from "./CombinedAssessmentFlow.jsx";

// Combined mode is intentionally NOT listed here anymore - it has its own
// dedicated component (CombinedAssessmentFlow.jsx) since it needs the
// questionnaire and background video capture running concurrently rather
// than as sequential steps. Questionnaire-only and Video-only modes are
// unchanged from before.
const STEP_SEQUENCE = {
  questionnaire: ["dass"],
  video: ["video"],
};

export default function AssessmentFlow() {
  const { mode } = useParams();
  const { user } = useUser();
  const api = useApiClient();
  const navigate = useNavigate();
  const { state, update } = useAssessment();

  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Collected data for THIS session only - local to this component instance,
  // so it always starts empty on a fresh mount and can never carry over
  // data from a previous, unrelated assessment.
  const [collected, setCollected] = useState({});

  const steps = STEP_SEQUENCE[mode];

  const MODE_TITLES = {
    questionnaire: "Question-based Assessment",
    video: "Video Assessment",
    combined: "Combined Assessment",
  };
  usePageTitle(MODE_TITLES[mode] || "Assessment");

  // Mark the session as "in progress" (unsaved) for as long as this screen
  // is mounted, so the navbar knows to confirm before letting someone
  // navigate away. Also warns on browser refresh/tab-close directly, since
  // that bypasses in-app navigation entirely.
  //
  // Skipped for combined mode - CombinedAssessmentFlow sets up its own
  // identical guard, since it's a separate component that renders instead
  // of this one's questionnaire/video step engine below.
  useEffect(() => {
    if (mode === "combined") return;

    update({ inProgress: true });

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ""; // required for the native browser confirmation to show
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!state.profile) {
    navigate("/onboarding");
    return null;
  }

  // Combined mode: hand off entirely to its own component (questionnaire +
  // background video capture running concurrently). Everything below this
  // point is only for questionnaire-only and video-only modes.
  if (mode === "combined") {
    return <CombinedAssessmentFlow />;
  }

  if (!steps) {
    navigate("/select");
    return null;
  }

  const submitFinal = async (dassAnswers, ferResult) => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await api.post("/api/assessments", {
        clerk_user_id: user.id,
        full_name: state.profile.fullName,
        age: state.profile.age,
        gender: state.profile.gender,
        assessment_mode: mode,
        dass_answers: dassAnswers || undefined,
        fer_result: ferResult || undefined,
      });
      update({ submissionResult: res.data, inProgress: false });
      navigate(`/results/${res.data.id}`);
    } catch (err) {
      setSubmitError(
        err?.response?.data?.detail || "Something went wrong submitting your assessment."
      );
      setSubmitting(false);
    }
  };

  const handleStepComplete = (stepKey, data) => {
    const updatedCollected = { ...collected, [stepKey]: data };
    setCollected(updatedCollected);

    const isLastStep = stepIndex === steps.length - 1;
    if (isLastStep) {
      // Only ever submit data for step types that are actually part of
      // THIS mode's step sequence - e.g. a "questionnaire" mode never has
      // "video" in `steps`, so finalFer correctly stays undefined instead
      // of picking up a leftover result from an earlier, different session.
      const finalDass = steps.includes("dass") ? updatedCollected.dass : undefined;
      const finalFer = steps.includes("video") ? updatedCollected.video : undefined;
      submitFinal(finalDass, finalFer);
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  if (submitting) {
    return (
      <div className="max-w-md mx-auto px-6 pt-24 text-center">
        <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-teal-light border-t-teal animate-spin" />
        <p className="text-muted">Scoring your results…</p>
      </div>
    );
  }

  if (submitError) {
    return (
      <div className="max-w-md mx-auto px-6 pt-24 text-center">
        <p className="text-clay mb-4">{submitError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-full border border-teal text-teal font-medium hover:bg-teal-light/40 transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }

  const currentStep = steps[stepIndex];

  return (
    <div>
      {currentStep === "dass" && (
        <DassQuestionnaire onComplete={(answers) => handleStepComplete("dass", answers)} />
      )}
      {currentStep === "video" && (
        <VideoAssessment onComplete={(result) => handleStepComplete("video", result)} />
      )}
    </div>
  );
}