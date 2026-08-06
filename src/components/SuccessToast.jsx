import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * A small, reassuring, auto-dismissing confirmation toast - deliberately
 * styled in the app's calm teal palette rather than red/alarming, since
 * it's confirming something worked, not asking for a risky decision.
 * Dismisses itself after `duration` ms, or can be dismissed early via
 * onDismiss (e.g. a tap), same callback either way.
 */
export default function SuccessToast({ open, message, onDismiss, duration = 3000 }) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onDismiss]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          onClick={onDismiss}
        >
          <div className="flex items-center gap-2 bg-surface border border-teal-light/60 rounded-full pl-3 pr-4 py-2 shadow-soft cursor-pointer">
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-teal text-white shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-sm text-ink">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}