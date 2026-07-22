import React from "react";
import { motion } from "framer-motion";

/**
 * A slow, breathing pulse - inhale/exhale over ~5.5s, matching a calming
 * box-breathing rhythm. This is the one signature visual moment on the
 * landing page; everything else stays quiet around it.
 */
export default function BreathingOrb({ size = 260 }) {
  const rings = [1, 0.78, 0.56];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {rings.map((scale, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: size * scale,
            height: size * scale,
            background:
              i === rings.length - 1
                ? "radial-gradient(circle at 35% 30%, #4A8A85, #1E4F4C)"
                : "transparent",
            border: i < rings.length - 1 ? "1px solid rgba(43,111,107,0.25)" : "none",
          }}
          animate={{
            scale: [1, 1.12, 1],
            opacity: i === rings.length - 1 ? [0.95, 1, 0.95] : [0.4, 0.9, 0.4],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
      <span className="relative font-body text-xs tracking-[0.2em] uppercase text-white/90">
        Breathe
      </span>
    </div>
  );
}
