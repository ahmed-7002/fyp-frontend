import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useApiClient } from "../lib/api.js";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import DassQuestionnaire from "./DassQuestionnaire.jsx";
import VideoAssessment from "./VideoAssessment.jsx";

const STEP_SEQUENCE = {
  questionnaire: ["dass"],
  video: ["video"],
  combined: ["dass", "video"],
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

  const steps = STEP_SEQUENCE[mode];

  // Mark the session as "in progress" (unsaved) for as long as this screen
  // is mounted, so the navbar knows to confirm before letting someone
  // navigate away. Also warns on browser refresh/tab-close directly, since
  // that bypasses in-app navigation entirely.
  useEffect(() => {
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
  }, []);

  if (!state.profile) {
    navigate("/onboarding");
    return null;
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
      update({ submissionResult: res.data, dassAnswers, ferResult, inProgress: false });
      navigate(`/results/${res.data.id}`);
    } catch (err) {
      setSubmitError(
        err?.response?.data?.detail || "Something went wrong submitting your assessment."
      );
      setSubmitting(false);
    }
  };

  const handleStepComplete = (stepKey, data) => {
    if (stepKey === "dass") update({ dassAnswers: data });
    if (stepKey === "video") update({ ferResult: data });

    const isLastStep = stepIndex === steps.length - 1;
    if (isLastStep) {
      const finalDass = stepKey === "dass" ? data : state.dassAnswers;
      const finalFer = stepKey === "video" ? data : state.ferResult;
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