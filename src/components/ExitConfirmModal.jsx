import React from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * A small confirmation dialog shown when someone tries to navigate away
 * (via the navbar) while a DASS-21/video session is in progress, so
 * in-progress answers aren't lost to an accidental click.
 */
export default function ExitConfirmModal({ open, onConfirm, onCancel }) {
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
            className="card w-full max-w-sm p-6"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg text-ink mb-2">Leave this assessment?</h2>
            <p className="text-sm text-muted mb-6">
              Your progress hasn't been saved yet. If you leave now, your answers so far will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-full text-sm font-medium text-muted hover:text-ink transition-colors"
              >
                Stay
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-full text-sm font-medium bg-clay text-white hover:bg-clay/90 transition-colors"
              >
                Leave anyway
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}