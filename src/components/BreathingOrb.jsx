import React from "react";
import { motion } from "framer-motion";

/**
 * A slow, breathing pulse.
 *
 * Two modes, controlled entirely by whether a `phase` prop is passed:
 *
 * - AMBIENT (default, no `phase` prop) - the original infinite decorative
 *   loop used on the landing page. Behaviour is unchanged from the
 *   original component, so LandingPage.jsx needs no changes at all.
 *
 * - GUIDED (`phase` is one of "inhale" | "hold1" | "exhale" | "hold2") -
 *   used by the exercise page. The main circle's size is driven directly
 *   by the current phase instead of looping on its own, so a parent
 *   component (running the actual breathing-cycle timer) stays in full
 *   control of pacing. The two thin outer rings stay static in this mode
 *   (no competing motion) so the single phase-driven pulse reads clearly.
 */
export default function BreathingOrb({
  size = 260,
  phase = null,
  label = null,
  showLabel = true,
  durations = { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
}) {
  const guided = phase !== null;
  const rings = [1, 0.78, 0.56];

  const guidedScale = phase === "inhale" || phase === "hold1" ? 1.28 : 1;
  const guidedDuration = phase ? durations[phase] ?? 4 : 4;

  const defaultLabel =
    phase === "inhale"
      ? "Inhale"
      : phase === "hold1" || phase === "hold2"
      ? "Hold"
      : phase === "exhale"
      ? "Exhale"
      : "Breathe";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {rings.map((scale, i) => {
        const isMain = i === rings.length - 1;

        if (guided && !isMain) {
          // Outer rings stay still in guided mode - only the main circle
          // moves, so the breathing rhythm reads as one clear signal
          // instead of three independent pulses competing for attention.
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size * scale,
                height: size * scale,
                border: "1px solid rgba(43,111,107,0.2)",
              }}
            />
          );
        }

        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size * scale,
              height: size * scale,
              background:
                isMain
                  ? "radial-gradient(circle at 35% 30%, #4A8A85, #1E4F4C)"
                  : "transparent",
              border: !isMain ? "1px solid rgba(43,111,107,0.25)" : "none",
            }}
            animate={
              guided
                ? { scale: guidedScale, opacity: 1 }
                : {
                    scale: [1, 1.12, 1],
                    opacity: isMain ? [0.95, 1, 0.95] : [0.4, 0.9, 0.4],
                  }
            }
            transition={
              guided
                ? { duration: guidedDuration, ease: "easeInOut" }
                : { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }
            }
          />
        );
      })}
      {showLabel && (
        <span className="relative font-body text-xs tracking-[0.2em] uppercase text-white/90">
          {label || defaultLabel}
        </span>
      )}
    </div>
  );
}