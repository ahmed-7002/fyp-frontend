import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import { useTheme } from "../lib/ThemeContext.jsx";
import { useFocusMode } from "../lib/FocusModeContext.jsx";
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

// Plain inline SVG, no new icon library - matches ThemeToggle's own pattern
// above. Morphs between hamburger and close ("X") based on `open`.
function MenuIcon({ open }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {open ? (
        <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { state, reset } = useAssessment();
  const { focusMode } = useFocusMode();
  const [pendingPath, setPendingPath] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Intercepts navbar navigation while a session is actively in progress
  // (unsaved), so a stray click doesn't silently wipe someone's answers.
  // Also closes the mobile dropdown on any nav click, so it doesn't stay
  // open after navigating (or after being intercepted by the modal below).
  const handleNavClick = (e, path) => {
    if (state.inProgress) {
      e.preventDefault();
      setPendingPath(path);
    }
    setMobileOpen(false);
  };

  // --- Native browser back button / swipe-back interception -------------
  // The confirmation above only catches clicks on links *inside* this app -
  // it does nothing against the browser's own Back button or a mobile
  // swipe-back gesture, since those never call handleNavClick at all.
  //
  // This project uses classic <BrowserRouter>, not a "data router", so
  // React Router's useBlocker/usePrompt hooks aren't available here (they
  // require createBrowserRouter). This uses the lower-level browser History
  // API instead: while a session is in progress, an extra history entry is
  // pushed so the back button/gesture lands on that buffer entry first
  // (intercepted here) rather than immediately leaving the page. A native
  // `popstate` event can't be cancelled the way `beforeunload` can - by the
  // time we're notified, the browser has already moved - so the standard
  // pattern is to immediately push the URL back to neutralize that
  // navigation, then show the same confirmation modal as everywhere else.
  useEffect(() => {
    if (!state.inProgress) return;

    // Buffer entry - gives the back button/gesture something to "consume"
    // first instead of immediately navigating away.
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      // Neutralize the navigation that already happened by pushing the
      // current URL back on top, then ask for confirmation exactly like a
      // navbar link click would.
      window.history.pushState(null, "", window.location.href);
      setPendingPath("/");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [state.inProgress]);

  const confirmLeave = () => {
    reset();
    navigate(pendingPath);
    setPendingPath(null);
  };

  const cancelLeave = () => setPendingPath(null);

  // Placed after every hook above (never before) so this stays compliant
  // with the rules of hooks - hooks always run on every render regardless
  // of focusMode, only the actual JSX output is skipped.
  if (focusMode) return null;

  return (
    <>
      <header className="w-full py-5 px-6 md:px-12 flex items-center justify-between relative">
        <Link to="/" onClick={(e) => handleNavClick(e, "/")} className="flex items-center gap-2 group">
          <span className="w-2.5 h-2.5 rounded-full bg-teal group-hover:bg-lavender transition-colors" />
          <span className="font-display text-lg tracking-tight text-ink">Mindful Check-In</span>
        </Link>

        {/* Desktop nav (md and up) - inline links, unchanged pattern, with
           Exercises added. Hidden below md in favour of the hamburger. */}
        <nav className="hidden md:flex items-center gap-4">
          <Link
            to="/exercises"
            onClick={(e) => handleNavClick(e, "/exercises")}
            className="text-sm font-medium text-muted hover:text-ink transition-colors"
          >
            Exercises
          </Link>
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

        {/* Mobile controls (below md) - theme toggle and sign-in/avatar
           stay visible up here since they're already compact; the
           hamburger only expands the text-link list (Exercises / Profile)
           in the dropdown panel below. */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-sm font-medium text-muted hover:text-ink transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <button
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-teal-light/40 transition-colors"
          >
            <MenuIcon open={mobileOpen} />
          </button>
        </div>
      </header>

      {/* Mobile dropdown panel - only ever rendered below md (md:hidden),
         so it never shows on desktop even if mobileOpen were somehow true. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden overflow-hidden px-6 pb-4 flex flex-col gap-1"
          >
            <Link
              to="/exercises"
              onClick={(e) => handleNavClick(e, "/exercises")}
              className="py-2.5 text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              Exercises
            </Link>
            <SignedIn>
              <Link
                to="/profile"
                onClick={(e) => handleNavClick(e, "/profile")}
                className="py-2.5 text-sm font-medium text-muted hover:text-ink transition-colors"
              >
                Profile
              </Link>
            </SignedIn>
          </motion.nav>
        )}
      </AnimatePresence>

      <ExitConfirmModal open={pendingPath !== null} onConfirm={confirmLeave} onCancel={cancelLeave} />
    </>
  );
}