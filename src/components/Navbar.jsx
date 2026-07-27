import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import { useTheme } from "../lib/ThemeContext.jsx";
import ExitConfirmModal from "./ExitConfirmModal.jsx";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-teal-light/40 transition-colors"
    >
      {isDark ? (
        // Sun icon
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Moon icon
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { state, reset } = useAssessment();
  const [pendingPath, setPendingPath] = useState(null);

  // Intercepts navbar navigation while a session is actively in progress
  // (unsaved), so a stray click doesn't silently wipe someone's answers.
  const handleNavClick = (e, path) => {
    if (state.inProgress) {
      e.preventDefault();
      setPendingPath(path);
    }
  };

  const confirmLeave = () => {
    reset();
    navigate(pendingPath);
    setPendingPath(null);
  };

  const cancelLeave = () => setPendingPath(null);

  return (
    <>
      <header className="w-full py-5 px-6 md:px-12 flex items-center justify-between">
        <Link to="/" onClick={(e) => handleNavClick(e, "/")} className="flex items-center gap-2 group">
          <span className="w-2.5 h-2.5 rounded-full bg-teal group-hover:bg-lavender transition-colors" />
          <span className="font-display text-lg tracking-tight text-ink">Mindful Check-In</span>
        </Link>

        <nav className="flex items-center gap-4">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm font-medium text-muted hover:text-ink transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              to="/profile"
              onClick={(e) => handleNavClick(e, "/profile")}
              className="text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              Profile
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </header>

      <ExitConfirmModal open={pendingPath !== null} onConfirm={confirmLeave} onCancel={cancelLeave} />
    </>
  );
}