import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import HoldToDeleteButton from "./HoldToDeleteButton.jsx";

/**
 * A floating confirmation modal for deleting a past session. Deliberately
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
        >
          <motion.div
            className="card w-full max-w-sm p-6 flex flex-col gap-4 shadow-soft"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-ink leading-relaxed">
                Delete this session? Your name is removed permanently; the anonymized
                answers stay only to help improve future versions of this tool.
              </p>
              <button
                onClick={onCancel}
                aria-label="Cancel"
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-teal-light/40 transition-colors"
              >
                ✕
              </button>
            </div>

            {error && <p className="text-xs text-clay">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}