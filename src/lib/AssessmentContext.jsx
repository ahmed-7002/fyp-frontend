import React, { createContext, useContext, useState } from "react";

const AssessmentContext = createContext(null);

const initialState = {
  profile: null,          // { fullName, age, gender }
  mode: null,              // "questionnaire" | "video" | "combined"
  dassAnswers: null,        // number[21]
  ferResult: null,          // { frames_captured, ..., dominant_emotion }
  submissionResult: null,   // full AssessmentSubmitOut from backend
  inProgress: false,        // true while a session is actively being taken (unsaved)
};

export function AssessmentProvider({ children }) {
  const [state, setState] = useState(initialState);

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }));
  const reset = () => setState(initialState);

  return (
    <AssessmentContext.Provider value={{ state, update, reset }}>
      {children}
    </AssessmentContext.Provider>
  );
}

export function useAssessment() {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error("useAssessment must be used within AssessmentProvider");
  return ctx;
}