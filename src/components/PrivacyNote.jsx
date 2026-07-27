import React from "react";

/**
 * A small trust-building line placed under buttons where someone is about
 * to commit to sharing personal data (starting the questionnaire, enabling
 * the camera). Deliberately quiet - a small lock glyph and muted text,
 * not a banner - so it reassures without feeling like a legal disclaimer.
 */
export default function PrivacyNote({ className = "" }) {
  return (
    <p className={`flex items-center gap-1.5 text-xs text-muted ${className}`}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-70">
        <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      Your responses are private and visible only to you.
    </p>
  );
}