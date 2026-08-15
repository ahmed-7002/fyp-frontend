import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useAssessment } from "../lib/AssessmentContext.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";
import PrivacyNote from "./PrivacyNote.jsx";

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

// Letters only (any language script) with single spaces between words -
// no digits, no punctuation/symbols of any kind. \p{L} matches letters in
// any language (needs the "u" regex flag), so accented names and
// non-Latin scripts still work correctly.
const NAME_PATTERN = /^\p{L}+(?: \p{L}+)*$/u;

export default function OnboardingForm() {
  const { user } = useUser();
  const { update } = useAssessment();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");

  usePageTitle("About You");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const ageNum = Number(age);

    if (!trimmedName) return setError("Please enter your name.");
    if (!NAME_PATTERN.test(trimmedName)) {
      return setError("Name can only contain letters - no numbers or special characters.");
    }
    if (!ageNum || ageNum < 10 || ageNum > 120) return setError("Please enter a valid age.");
    if (!gender) return setError("Please select a gender option.");

    setError("");
    update({ profile: { fullName: trimmedName, age: ageNum, gender } });
    navigate("/select");
  };

  return (
    <div className="max-w-md mx-auto px-6 pt-16 pb-24">
      {/* Back home - same placement/style as the Profile page */}
      <Link to="/" className="inline-block mb-8 text-sm font-medium text-muted hover:text-ink transition-colors">
        ← Back home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card p-8"
      >
        <span className="font-mono text-xs text-teal">Step 1 of 3</span>
        <h1 className="font-display text-2xl text-ink mt-2 mb-1">A little about you</h1>
        <p className="text-muted text-sm mb-6">
          This helps us tailor your results. It stays private to your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-ink mb-1.5">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-teal-light bg-mist/50 px-4 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-teal/40"
              placeholder="Jordan Reyes"
            />
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-ink mb-1.5">
              Age
            </label>
            <input
              id="age"
              type="number"
              min={10}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-xl border border-teal-light bg-mist/50 px-4 py-2.5 text-ink focus:outline-none focus:ring-2 focus:ring-teal/40"
              placeholder="28"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-ink mb-1.5">Gender</span>
            <div className="grid grid-cols-2 gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    gender === opt.value
                      ? "bg-teal text-white border-teal"
                      : "border-teal-light text-ink hover:bg-teal-light/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            className="w-full mt-2 px-6 py-3 rounded-full bg-teal text-white font-medium hover:bg-teal-dark transition-colors"
          >
            Continue
          </button>

          <PrivacyNote className="justify-center" />
        </form>
      </motion.div>
    </div>
  );
}