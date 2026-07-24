import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LandingPage from "./components/LandingPage.jsx";
import OnboardingForm from "./components/OnboardingForm.jsx";
import AssessmentSelection from "./components/AssessmentSelection.jsx";
import AssessmentFlow from "./components/AssessmentFlow.jsx";
import ResultsDashboard from "./components/ResultsDashboard.jsx";
import Profile from "./components/Profile.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { AssessmentProvider } from "./lib/AssessmentContext.jsx";

export default function App() {
  return (
    <AssessmentProvider>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingForm />
              </RequireAuth>
            }
          />
          <Route
            path="/select"
            element={
              <RequireAuth>
                <AssessmentSelection />
              </RequireAuth>
            }
          />
          <Route
            path="/assessment/:mode"
            element={
              <RequireAuth>
                <AssessmentFlow />
              </RequireAuth>
            }
          />
          <Route
            path="/results/:id"
            element={
              <RequireAuth>
                <ResultsDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </AssessmentProvider>
  );
}