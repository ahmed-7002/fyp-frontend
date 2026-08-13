import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LandingPage from "./components/LandingPage.jsx";
import OnboardingForm from "./components/OnboardingForm.jsx";
import AssessmentSelection from "./components/AssessmentSelection.jsx";
import AssessmentFlow from "./components/AssessmentFlow.jsx";
import ResultsDashboard from "./components/ResultsDashboard.jsx";
import Profile from "./components/Profile.jsx";
import ExercisePage from "./components/ExercisePage.jsx";
import NotFound from "./components/NotFound.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import { AssessmentProvider } from "./lib/AssessmentContext.jsx";
import { ThemeProvider } from "./lib/ThemeContext.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AssessmentProvider>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            {/* Deliberately NOT wrapped in RequireAuth - a breathing
               exercise should be reachable by anyone, signed in or not,
               without a sign-in prompt getting in the way. Wrap this in
               <RequireAuth> the same as the routes below if you'd rather
               keep it consistent with the rest of the app instead. */}
            <Route path="/exercises" element={<ExercisePage />} />
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
            {/* Catch-all - must stay last so it doesn't shadow real routes above it */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </AssessmentProvider>
    </ThemeProvider>
  );
}