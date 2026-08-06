import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import HoldToDeleteButton from "./HoldToDeleteButton.jsx";

/**
 * A floating confirmation toast for deleting a past session. Deliberately
 * does not delete on a single click - the actual destructive action only
 * fires after a 2-second press-and-hold on the button inside (see
 * HoldToDeleteButton.jsx), which makes an accidental tap much less likely
 * to remove a session outright.
 */
export default function DeleteConfirmToast({ open, onCancel, onHoldComplete, deleting, error }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
        >
          <div className="card px-5 py-4 flex flex-col gap-3 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-ink">
                Delete this session? Your name is removed permanently; the anonymized
                answers stay only to help improve future versions of this tool.
              </p>
              <button
                onClick={onCancel}
                aria-label="Cancel"
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-teal-light/40 transition-colors"
              >
                ✕
              </button>
            </div>

            {error && <p className="text-xs text-clay">{error}</p>}

            <div className="flex items-center gap-3">
              <HoldToDeleteButton
                onComplete={onHoldComplete}
                disabled={deleting}
                label={deleting ? "Deleting…" : "Hold to delete"}
              />
              <button
                onClick={onCancel}
                className="text-sm font-medium text-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}