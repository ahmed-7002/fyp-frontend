import React, { createContext, useContext, useState } from "react";

/**
 * Lets any route (currently just the exercise page) tell the Navbar to
 * genuinely unmount itself for a real distraction-free "focus mode" -
 * rather than an overlay trick that just visually covers it while it's
 * still sitting underneath in the DOM. Follows the same Provider/hook
 * pattern already used by ThemeContext and AssessmentContext elsewhere in
 * this project, so it should feel familiar rather than like a new pattern.
 */
const FocusModeContext = createContext({
  focusMode: false,
  setFocusMode: () => {},
});

export function FocusModeProvider({ children }) {
  const [focusMode, setFocusMode] = useState(false);
  return (
    <FocusModeContext.Provider value={{ focusMode, setFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  return useContext(FocusModeContext);
}