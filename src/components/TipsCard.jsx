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
 */
export default function TipsCard({ tips }) {
  const [tipsLang, setTipsLang] = useState("en");

  const dir = tipsLang === "ur" ? "rtl" : "ltr";
  const t = UI_TEXT[tipsLang];

  if (!tips || tips.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="card p-6 border-lavender/30 bg-lavender-light/30">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">{t.title}</h2>
            <p className="text-xs text-muted mt-0.5">{t.subtitle}</p>
          </div>

          <div className="flex rounded-full border border-lavender/40 overflow-hidden shrink-0">
            {["en", "ur"].map((code) => (
              <button
                key={code}
                onClick={() => setTipsLang(code)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
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

        <div dir={dir} className="space-y-3 mt-4">
          {tips.map((tip, index) => {
            const text = tip[tipsLang] || tip.en;
            return (
              <div
                key={index}
                className="flex items-start gap-3 bg-surface/70 rounded-xl px-4 py-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-lavender mt-2 shrink-0" />
                <p className="text-sm text-ink leading-relaxed flex-1">{text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}