import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import ExitConfirmModal from "./ExitConfirmModal.jsx";

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