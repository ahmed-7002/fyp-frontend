import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const QUOTES = [
  "Analyzing your captured expressions...",
  "Taking a 5-minute walk can instantly lower cortisol.",
  "Your data is being processed securely and privately.",
  "Remember: this is just a snapshot of today, not forever.",
  "Box breathing can quickly calm a racing mind.",
  "Taking a moment to pause is productive, not lazy."
];

export default function LoadingCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % QUOTES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center mt-4 min-h-[100px]">
      <div className="w-8 h-8 mx-auto mb-5 rounded-full border-2 border-teal-light border-t-teal animate-spin" />
      <div className="relative w-full flex items-center justify-center h-12 px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute text-sm text-muted text-center italic max-w-sm"
          >
            {QUOTES[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}