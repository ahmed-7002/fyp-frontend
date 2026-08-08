import React, { useState } from "react";

const UI_TEXT = {
  en: {
    title: "Personalized Suggestions",
    subtitle: "Based on your specific scores - not generic advice.",
  },
  ur: {
    title: "ذاتی نوعیت کی تجاویز",
    subtitle: "آپ کے مخصوص اسکورز پر مبنی - عمومی مشورہ نہیں۔",
  },
};

/**
 * A reusable "Personalized Suggestions" card - shared by ResultsDashboard
 * (right after a fresh submission) and Profile's expanded session detail
 * (viewing an older saved session), so the UI stays identical in both places.
 *
 * `tips` is the array already returned by the backend as
 * `actionable_tips`: [{ en: "...", ur: "..." }, ...].
 *
 * Sizing/padding is set with mobile-first Tailwind classes (base = phone,
 * sm: = tablet/desktop). On a narrow viewport the previous fixed p-6 /
 * text-xl / text-sm values ate too much of the available width, so lines
 * wrapped hard and the card felt "stretched" - everything below scales
 * down at the base breakpoint and back up at sm:.
 */
export default function TipsCard({ tips }) {
  const [tipsLang, setTipsLang] = useState("en");

  const dir = tipsLang === "ur" ? "rtl" : "ltr";
  const t = UI_TEXT[tipsLang];

  if (!tips || tips.length === 0) return null;

  return (
    <section className="mb-6 sm:mb-10">
      <div className="card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-lavender/30 bg-lavender-light/30">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl text-ink leading-snug">
              {t.title}
            </h2>
            <p className="text-[11px] sm:text-xs text-muted mt-0.5">
              {t.subtitle}
            </p>
          </div>

          <div className="flex rounded-full border border-lavender/40 overflow-hidden shrink-0">
            {["en", "ur"].map((code) => (
              <button
                key={code}
                onClick={() => setTipsLang(code)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium transition-colors ${
                  tipsLang === code
                    ? "bg-lavender text-white"
                    : "text-muted hover:bg-lavender-light/60"
                }`}
              >
                {code === "en" ? "English" : "اردو"}
              </button>
            ))}
          </div>
        </div>

        <div dir={dir} className="space-y-2 sm:space-y-3 mt-3 sm:mt-4">
          {tips.map((tip, index) => {
            const text = tip[tipsLang] || tip.en;
            return (
              <div
                key={index}
                className="flex items-start gap-2.5 sm:gap-3 bg-surface/70 rounded-lg sm:rounded-xl px-3 py-2.5 sm:px-4 sm:py-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-lavender mt-1.5 sm:mt-2 shrink-0" />
                <p className="text-[13px] sm:text-sm text-ink leading-relaxed flex-1">
                  {text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}