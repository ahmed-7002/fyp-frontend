import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import BreathingOrb from "./BreathingOrb.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

export default function LandingPage() {
  const navigate = useNavigate();
  usePageTitle();

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-12 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden grid md:grid-cols-2 gap-10 items-center pt-10 md:pt-20">
        {/* Subtle decorative gradient - sits behind the copy/orb, never competes with them */}
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[26rem] h-[26rem] rounded-full bg-teal/10 blur-3xl" />
          <div className="absolute top-1/3 right-32 w-[16rem] h-[16rem] rounded-full bg-lavender/10 blur-3xl" />
        </div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <span className="inline-block text-xs tracking-[0.2em] uppercase text-teal font-medium mb-4">
            A quiet moment for yourself
          </span>
          <h1 className="text-4xl md:text-5xl font-display text-ink leading-[1.1] mb-6">
            Check in with how you're{" "}
            <span className="italic text-teal">really</span> doing.
          </h1>
          <p className="text-muted text-lg leading-relaxed mb-8 max-w-md">
            A short, private well-being screening combining the DASS-21
            questionnaire with optional facial expression analysis - built to
            help you reflect, not to replace a professional.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/onboarding">
                <button className="px-7 py-3.5 rounded-full bg-teal text-white font-medium hover:bg-teal-dark transition-colors shadow-soft">
                  Take Assessment
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => navigate("/onboarding")}
                className="px-7 py-3.5 rounded-full bg-teal text-white font-medium hover:bg-teal-dark transition-colors shadow-soft"
              >
                Take Assessment
              </button>
            </SignedIn>
            <span className="text-sm text-muted">Takes about 5-10 minutes</span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="flex justify-center"
        >
          <BreathingOrb />
        </motion.div>
      </section>

      {/* Disclaimer */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.4 }}
        variants={fadeUp}
        className="mt-20 card p-6 md:p-7 border-clay/30 bg-clay-light/50 flex gap-4 items-start"
      >
        <div className="w-2 h-2 rounded-full bg-clay mt-2 shrink-0" />
        <p className="text-sm md:text-base text-ink/80 leading-relaxed">
          <strong className="font-semibold text-ink">
            This is a question-based asset, not a professional diagnostic tool.
          </strong>{" "}
          For a professional assessment, please consult a medical doctor.
        </p>
      </motion.section>

      {/* How it works */}
      <section className="mt-20 grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Question-based",
            body: "The clinically-used DASS-21 scale measures depression, anxiety, and stress.",
          },
          {
            title: "Video-based",
            body: "Optional facial expression analysis across your session using FER-2013.",
          },
          {
            title: "Combined view",
            body: "See both signals side by side on one results dashboard.",
          },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={i}
            className="card p-6"
          >
            <span className="font-mono text-xs text-teal">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="font-display text-xl text-ink mt-2 mb-2">{item.title}</h3>
            <p className="text-muted text-sm leading-relaxed">{item.body}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}