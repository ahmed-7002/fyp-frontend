import React, { useEffect, useRef, useState } from "react";

const HOLD_DURATION_MS = 2000;

/**
 * A press-and-hold destructive action button. The user must hold it down
 * for exactly HOLD_DURATION_MS before onComplete fires - releasing early
 * (mouse up, mouse leaving the button, or lifting a finger) resets the
 * fill and timer instantly, with no animate-back.
 *
 * The instant reset is done with a `key` trick: bumping `resetKey` forces
 * React to fully unmount and remount the fill <span>, so the new one is
 * born at 0% width with no transition, rather than trying to animate an
 * existing element back down (which would look like a slow drain instead
 * of an instant cancel).
 */
export default function HoldToDeleteButton({ onComplete, label = "Hold to delete", disabled = false }) {
  const [holding, setHolding] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const timerRef = useRef(null);

  const startHold = () => {
    if (disabled) return;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      onComplete();
    }, HOLD_DURATION_MS);
  };

  const cancelHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHolding(false);
    setResetKey((k) => k + 1);
  };

  // Safety net: clear any pending timer if the component unmounts mid-hold
  // (e.g. the parent toast closes for some other reason).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onMouseLeave={cancelHold}
      onTouchStart={(e) => {
        e.preventDefault();
        startHold();
      }}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      className="relative overflow-hidden px-5 py-2.5 rounded-full border border-red-500 text-red-600 text-sm font-medium select-none touch-none disabled:opacity-60"
    >
      <span
        key={resetKey}
        aria-hidden="true"
        className="absolute inset-0 bg-red-500"
        style={{
          width: holding ? "100%" : "0%",
          transition: holding ? `width ${HOLD_DURATION_MS}ms linear` : "none",
        }}
      />
      <span className="relative z-10">{label}</span>
    </button>
  );
}