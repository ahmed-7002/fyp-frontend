import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useApiClient } from "../lib/api.js";
import { getCachedSessions, prefetchSessions, setCachedSessions } from "../lib/sessionsStore.js";
import { useTheme } from "../lib/ThemeContext.jsx";
import { ProfileSkeleton } from "./Skeleton.jsx";
import { usePageTitle } from "../lib/usePageTitle.js";
import DeleteConfirmToast from "./DeleteConfirmToast.jsx";
import SuccessToast from "./SuccessToast.jsx";
import TipsCard from "./TipsCard.jsx";

const SEVERITY_COLOR = {
  Normal: "bg-teal-light text-teal-dark",
  Mild: "bg-lavender-light text-lavender",
  Moderate: "bg-clay-light text-clay",
  Severe: "bg-clay text-white",
  "Extremely Severe": "bg-ink text-white",
};

const RISK_COLOR = {
  Low: "bg-teal-light text-teal-dark",
  Moderate: "bg-lavender-light text-lavender",
  High: "bg-clay-light text-clay",
  "Needs Attention": "bg-ink text-white",
};

const MODE_LABEL = {
  questionnaire: "Question-based",
  video: "Video-based",
  combined: "Combined",
};

const MODE_BADGE_LABEL = {
  questionnaire: "Questions",
  video: "Video",
  combined: "Combined",
};

const EMOTION_COLORS = {
  happy: "#2B6F6B",
  neutral: "#8C7AA9",
  surprise: "#4A8A85",
  sad: "#C97B63",
  angry: "#B0503C",
  fear: "#9A6E8C",
  disgust: "#7A5A4A",
};

// Mirrors app/services/risk_engine.py's _SEVERITY_WEIGHT, so "worst
// subscale" and ring-fill logic here agree with how the backend already
// reasons about severity ordering.
const SEVERITY_WEIGHT = { Normal: 0, Mild: 1, Moderate: 2, Severe: 3, "Extremely Severe": 4 };
const RISK_WEIGHT = { Low: 1, Moderate: 2, High: 3, "Needs Attention": 4 };

const TIME_RANGES = [
  { key: "7d", label: "Last 7 Days", days: 7 },
  { key: "30d", label: "Last 30 Days", days: 30 },
  { key: "90d", label: "Last 90 Days", days: 90 },
  { key: "all", label: "All Time", days: null },
];

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Resolves this project's CSS-variable-driven theme colors (see
 * tailwind.config.js - colors read from --color-teal etc., defined
 * separately for :root and .dark) into literal "rgb(r g b)" strings.
 *
 * This is necessary because Recharts/SVG color props need real color
 * values, not Tailwind class names - and while modern browsers do support
 * var() in SVG presentation attributes, reading getComputedStyle directly
 * here is the most reliable way to guarantee chart colors update the
 * instant dark mode is toggled, without depending on attribute-level var()
 * support. Re-reads whenever `theme` changes.
 */
function useThemeColors() {
  const { theme } = useTheme();
  const [colors, setColors] = useState({});

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (name) => {
      const raw = styles.getPropertyValue(name).trim();
      return raw ? `rgb(${raw})` : "#8C7AA9"; // safe fallback, shouldn't normally trigger
    };
    setColors({
      teal: read("--color-teal"),
      tealDark: read("--color-teal-dark"),
      tealLight: read("--color-teal-light"),
      lavender: read("--color-lavender"),
      clay: read("--color-clay"),
      ink: read("--color-ink"),
      muted: read("--color-muted"),
      mist: read("--color-mist"),
    });
  }, [theme]);

  return colors;
}

function severityStrokeColor(severity, colors) {
  // Same family associations as SEVERITY_COLOR above, just resolved to
  // real color values instead of Tailwind classes.
  switch (severity) {
    case "Normal":
      return colors.teal;
    case "Mild":
      return colors.lavender;
    case "Moderate":
    case "Severe":
      return colors.clay;
    case "Extremely Severe":
      return colors.ink;
    default:
      return colors.muted;
  }
}

function riskStrokeColor(risk, colors) {
  switch (risk) {
    case "Low":
      return colors.teal;
    case "Moderate":
      return colors.lavender;
    case "High":
      return colors.clay;
    case "Needs Attention":
      return colors.ink;
    default:
      return colors.muted;
  }
}

/** Whichever of the three DASS-21 subscales is currently most severe -
 * same "take the max" idea risk_engine.py already uses for overall risk. */
function worstDassSubscale(dass) {
  if (!dass) return null;
  const candidates = [
    { name: "Depression", score: dass.depression_score, severity: dass.depression_severity },
    { name: "Anxiety", score: dass.anxiety_score, severity: dass.anxiety_severity },
    { name: "Stress", score: dass.stress_score, severity: dass.stress_severity },
  ];
  return candidates.reduce((worst, c) =>
    SEVERITY_WEIGHT[c.severity] > SEVERITY_WEIGHT[worst.severity] ? c : worst
  );
}

/** A single comparable number per session, used for both the trend
 * indicator and the "how full is the ring" calculation. DASS-bearing
 * sessions use the sum of all three raw subscale scores (an interpretive
 * choice - the brief asked for one combined "Overall Progress" line, and
 * DASS-21 has three subscales, so this collapses them into one trackable
 * total). Video-only sessions fall back to the dominant emotion's
 * percentage, since they have no DASS score at all. */
function sessionTrackScore(detail) {
  if (detail.dass_result) {
    const d = detail.dass_result;
    return d.depression_score + d.anxiety_score + d.stress_score;
  }
  if (detail.fer_result && detail.fer_result.frames_analyzed > 0) {
    return detail.fer_result[detail.fer_result.dominant_emotion] ?? 0;
  }
  return null;
}

function InfoIcon({ label }) {
  return (
    <span title={label} aria-label={label} className="text-muted/70 hover:text-muted transition-colors cursor-help">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 11v5.5M12 8v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function TrendIndicator({ delta }) {
  if (delta === null) {
    return <span className="text-xs text-muted">First session</span>;
  }
  if (delta === 0) {
    return <span className="text-xs text-muted">= No change</span>;
  }
  const improving = delta < 0; // lower DASS/negative-emotion score = improvement
  return (
    <span className={`text-xs font-medium flex items-center gap-1 ${improving ? "text-teal-dark" : "text-clay"}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ transform: improving ? "none" : "scaleY(-1)" }}>
        <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {improving ? delta : `+${delta}`} pts from last
    </span>
  );
}

/** Hand-rolled SVG ring rather than another Recharts component - simpler
 * to control precisely at this small size, and the brief explicitly
 * allowed "a donut chart or thick SVG circle". */
function RadialScore({ value, percent, color, size = 64 }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(percent, 0), 100) / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-mist" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-sm text-ink">{value}</span>
      </div>
    </div>
  );
}

function AssessmentCard({ session, detail, trendDelta, colors }) {
  const dassWorst = worstDassSubscale(detail.dass_result);
  const hasDass = !!dassWorst;

  const severityText = hasDass ? `${dassWorst.severity} ${dassWorst.name}` : `${session.final_risk_level} Risk`;
  const ringColor = hasDass ? severityStrokeColor(dassWorst.severity, colors) : riskStrokeColor(session.final_risk_level, colors);
  const ringPercent = hasDass
    ? (SEVERITY_WEIGHT[dassWorst.severity] / 4) * 100
    : (RISK_WEIGHT[session.final_risk_level] / 4) * 100;
  const ringValue = hasDass
    ? dassWorst.score
    : detail.fer_result
    ? Math.round(detail.fer_result[detail.fer_result.dominant_emotion] ?? 0)
    : "-";

  return (
    <div className="card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs text-muted font-mono">{formatDate(session.created_at)}</span>
        <span
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
            RISK_COLOR[session.final_risk_level] || "bg-mist text-muted"
          }`}
        >
          {MODE_BADGE_LABEL[session.assessment_mode] || session.assessment_mode}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <RadialScore value={ringValue} percent={ringPercent} color={ringColor} />
        <div>
          <p className="font-display text-base text-ink leading-snug">{severityText}</p>
          <div className="mt-1">
            <TrendIndicator delta={trendDelta} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, infoLabel, children }) {
  return (
    <div className="card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-ink">{title}</h3>
        <InfoIcon label={infoLabel} />
      </div>
      {children}
    </div>
  );
}

function EmptyChartState({ message }) {
  return <div className="h-56 flex items-center justify-center text-sm text-muted">{message}</div>;
}

/**
 * The new Insights layout: header + filter, two charts, then a preview
 * grid of recent assessment cards. Sits above the existing full session
 * list (which is untouched below) - "View All" scrolls down to it rather
 * than linking to a separate route, since this app only has one /profile
 * page today.
 */
function InsightsSection({ api, refreshToken, onViewAllClick }) {
  const colors = useThemeColors();
  const [rangeKey, setRangeKey] = useState("30d");
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // When set to "depression" | "anxiety" | "stress", only that line is
  // drawn on the Overall Progress chart (the other two are hidden). Reset
  // to null - showing all three again - via the clear ("x") button or by
  // clicking the same color a second time.
  const [isolatedLine, setIsolatedLine] = useState(null);

  // Single range-filtered, column-trimmed request per range change -
  // replaces the old "fetch full detail for every session, then filter by
  // date in the browser" N+1 pattern. The backend applies the date cutoff
  // in SQL and only selects the fields these charts use, so this stays
  // fast even with a long session history.
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    setIsolatedLine(null);
    api
      .get(`/api/assessments/insights?range=${rangeKey}`)
      .then((res) => mounted && setFiltered(res.data))
      .catch(() => mounted && setError("Couldn't load insights."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeKey, refreshToken]);

  // Line chart data - questionnaire + combined sessions only, each point
  // carrying all three DASS-21 subscale scores separately (rather than a
  // single summed total), so depression/anxiety/stress can each be drawn
  // as their own colored line instead of being collapsed together.
  const progressData = useMemo(() => {
    return filtered
      .filter((s) => (s.assessment_mode === "questionnaire" || s.assessment_mode === "combined") && s.dass_result)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((s) => ({
        date: formatShortDate(s.created_at),
        depression: s.dass_result.depression_score,
        anxiety: s.dass_result.anxiety_score,
        stress: s.dass_result.stress_score,
      }));
  }, [filtered]);

  // Bar chart data - video + combined sessions only, counting how many
  // sessions had each emotion as their dominant one.
  const emotionData = useMemo(() => {
    const counts = {};
    filtered
      .filter((s) => (s.assessment_mode === "video" || s.assessment_mode === "combined") && s.fer_result && s.fer_result.frames_analyzed > 0)
      .forEach((s) => {
        const emo = s.fer_result.dominant_emotion;
        counts[emo] = (counts[emo] || 0) + 1;
      });
    return Object.entries(counts).map(([emotion, count]) => ({
      emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
      count,
    }));
  }, [filtered]);

  // Recent cards - most recent 6, each with a trend computed against the
  // previous session of the SAME comparable type (DASS-bearing vs
  // video-only), so a DASS score is never compared against an FER
  // percentage.
  const recentCards = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return sorted.slice(0, 6).map((session) => {
      const currentScore = sessionTrackScore(session);
      const sameTypeEarlier = sorted.find(
        (s) =>
          new Date(s.created_at) < new Date(session.created_at) &&
          !!s.dass_result === !!session.dass_result
      );
      const prevScore = sameTypeEarlier ? sessionTrackScore(sameTypeEarlier) : null;
      // Rounded to a whole number: DASS subscale scores are already ints,
      // but FER dominant-emotion percentages are floats, so a plain
      // subtraction (e.g. 62.34 - 58.56) can surface binary floating-point
      // noise like 3.780000000000001 instead of a clean 3.78/4.
      const trendDelta =
        currentScore !== null && prevScore !== null ? Math.round(currentScore - prevScore) : null;
      return { session, detail: session, trendDelta };
    });
  }, [filtered]);

  // Single source of truth for the three DASS-21 lines - drives both the
  // clickable legend buttons and the <Line> components below, so colors
  // and labels can't drift apart between the two.
  const DASS_LINES = [
    { key: "depression", label: "Depression", color: colors.teal },
    { key: "anxiety", label: "Anxiety", color: colors.lavender },
    { key: "stress", label: "Stress", color: colors.clay },
  ];

  return (
    <section className="mb-12">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl md:text-3xl text-ink font-bold">Insights</h2>
          <p className="text-muted text-sm mt-1">Track your progress and assessment analytics.</p>
        </div>
        <select
          value={rangeKey}
          onChange={(e) => setRangeKey(e.target.value)}
          className="px-4 py-2 rounded-full border border-teal/30 text-sm font-medium text-muted bg-transparent hover:text-ink hover:bg-teal-light/30 transition-colors cursor-pointer"
        >
          {TIME_RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-clay text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="card p-6 rounded-2xl h-72 animate-pulse bg-mist/40" />
          <div className="card p-6 rounded-2xl h-72 animate-pulse bg-mist/40" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <ChartCard
            title="Overall Progress"
            infoLabel="DASS-21 scores for depression, anxiety, and stress across question-based and combined sessions."
          >
            {progressData.length === 0 ? (
              <EmptyChartState message="No question-based sessions in this range yet." />
            ) : (
              <>
                {/* Custom legend: click a color to isolate that line (the
                    other two hide); click it again, or hit the x, to bring
                    all three back. Built by hand instead of recharts'
                    <Legend onClick> so we get an explicit clear button and
                    full control over the "dimmed" styling. */}
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  {DASS_LINES.map((line) => {
                    const isDimmed = isolatedLine !== null && isolatedLine !== line.key;
                    return (
                      <button
                        key={line.key}
                        type="button"
                        onClick={() => setIsolatedLine((prev) => (prev === line.key ? null : line.key))}
                        aria-pressed={isolatedLine === line.key}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-100 ${
                          isDimmed ? "opacity-40" : "opacity-100"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: line.color }} />
                        <span style={{ color: colors.muted }}>{line.label}</span>
                      </button>
                    );
                  })}
                  {isolatedLine && (
                    <button
                      type="button"
                      onClick={() => setIsolatedLine(null)}
                      aria-label="Show all lines"
                      title="Show all lines"
                      className="flex items-center justify-center w-5 h-5 rounded-full text-muted hover:text-ink hover:bg-mist transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={progressData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={colors.mist} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
                    {/* Positive width + non-negative chart margin so tick labels
                        (incl. their leading digit) render fully inside the card
                        instead of being clipped by the card's own border/padding. */}
                    <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} width={34} />
                    <Tooltip
                      contentStyle={{ background: colors.mist, border: "none", borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: colors.ink }}
                    />
                    {DASS_LINES.map((line) => (
                      <Line
                        key={line.key}
                        type="monotone"
                        dataKey={line.key}
                        name={line.label}
                        stroke={line.color}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        hide={isolatedLine !== null && isolatedLine !== line.key}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </ChartCard>

          <ChartCard title="Facial Emotion Summary" infoLabel="How often each dominant expression appeared, across video and combined sessions.">
            {emotionData.length === 0 ? (
              <EmptyChartState message="No video sessions in this range yet." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={emotionData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={colors.mist} />
                  <XAxis dataKey="emotion" tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} />
                  {/* Same fix as Overall Progress's YAxis: non-negative
                      chart margin + wider axis width so tick numbers
                      render fully instead of being clipped by the card's
                      own border/padding. */}
                  <YAxis tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: colors.mist, border: "none", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: colors.ink }}
                  />
                  <Bar dataKey="count" fill={colors.teal} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl text-ink font-bold">Recent Assessments</h2>
        <button onClick={onViewAllClick} className="text-sm font-medium text-teal hover:text-teal-dark transition-colors">
          View All →
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-6 rounded-2xl h-32 animate-pulse bg-mist/40" />
          ))}
        </div>
      ) : recentCards.length === 0 ? (
        <div className="card p-8 text-center rounded-2xl">
          <p className="text-muted text-sm">No sessions in this range yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recentCards.map(({ session, detail, trendDelta }) => (
            <AssessmentCard key={session.id} session={session} detail={detail} trendDelta={trendDelta} colors={colors} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * A session row that lazily fetches its own full detail (DASS scores, FER
 * breakdown, summary, and tips) only the first time it's expanded, then
 * caches it locally so re-collapsing/re-expanding doesn't refetch.
 */
function SessionRow({ session, api, onRequestDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail && !loading) {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/assessments/${session.id}`);
        setDetail(res.data);
      } catch {
        setError("Couldn't load this session's details.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteClick = (e) => {
    // Stop this from also bubbling up to the row's own toggle() click.
    e.stopPropagation();
    onRequestDelete(session.id);
  };

  return (
    <div className="card overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-teal-light/20 transition-colors"
      >
        <div>
          <p className="text-ink font-medium">{MODE_LABEL[session.assessment_mode]}</p>
          <p className="text-xs text-muted font-mono mt-0.5">{formatDate(session.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              RISK_COLOR[session.final_risk_level] || "bg-mist text-muted"
            }`}
          >
            {session.final_risk_level}
          </span>

          {/* Delete trigger - opens the confirmation toast, does not delete by itself */}
          <span
            role="button"
            tabIndex={0}
            onClick={handleDeleteClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleDeleteClick(e);
            }}
            aria-label="Delete this session"
            title="Delete this session"
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-clay hover:bg-clay-light/50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-muted">
            ▾
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-teal-light/60">
              {loading && <p className="text-sm text-muted py-4">Loading details…</p>}
              {error && <p className="text-sm text-clay py-4">{error}</p>}

              {detail && (
                <div className="pt-4 space-y-5">
                  <p className="text-sm text-muted">{detail.final_summary}</p>

                  {detail.dass_result && (
                    <div>
                      <p className="text-xs font-mono text-teal mb-2">DASS-21</p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {[
                          ["Depression", detail.dass_result.depression_score, detail.dass_result.depression_severity],
                          ["Anxiety", detail.dass_result.anxiety_score, detail.dass_result.anxiety_severity],
                          ["Stress", detail.dass_result.stress_score, detail.dass_result.stress_severity],
                        ].map(([label, score, severity]) => (
                          <div key={label} className="rounded-xl bg-mist/60 p-3">
                            <p className="text-xs text-muted mb-1">{label}</p>
                            <p className="font-display text-lg text-ink">{score}</p>
                            <span
                              className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${
                                SEVERITY_COLOR[severity] || "bg-mist"
                              }`}
                            >
                              {severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.fer_result && detail.fer_result.frames_analyzed > 0 && (
                    <div>
                      <p className="text-xs font-mono text-teal mb-2">
                        Facial emotion analysis - {detail.fer_result.frames_analyzed} of{" "}
                        {detail.fer_result.frames_captured} frames · dominant:{" "}
                        <span className="capitalize text-ink">{detail.fer_result.dominant_emotion}</span>
                      </p>
                      <div className="space-y-2">
                        {Object.keys(EMOTION_COLORS).map((emotion) => {
                          const value = detail.fer_result[emotion] ?? 0;
                          return (
                            <div key={emotion} className="flex items-center gap-2">
                              <span className="w-16 text-xs capitalize text-muted">{emotion}</span>
                              <div className="flex-1 h-2 rounded-full bg-mist overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${value}%`, backgroundColor: EMOTION_COLORS[emotion] }}
                                />
                              </div>
                              <span className="w-10 text-right text-xs font-mono text-ink">{value.toFixed(1)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <TipsCard tips={detail.actionable_tips} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Profile() {
  const { user } = useUser();
  const api = useApiClient();
  usePageTitle("Your Profile");

  // Lazy initializer: if Navbar's onMouseEnter/onFocus already warmed the
  // cache before this page mounted, this renders the real list on the
  // very first paint - no loading skeleton flash at all.
  const [sessions, setSessions] = useState(() => getCachedSessions());
  const [error, setError] = useState("");

  const allSessionsRef = useRef(null);

  // --- Delete flow state --------------------------------------------------
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  // Bumped after a successful delete so InsightsSection (which now owns
  // its own fetch against /api/assessments/insights) refetches instead of
  // continuing to show the deleted session in its charts.
  const [insightsRefreshToken, setInsightsRefreshToken] = useState(0);

  useEffect(() => {
    let mounted = true;
    // prefetchSessions() resolves instantly from cache if Navbar already
    // fetched this on hover/focus, reuses that same in-flight request if
    // it's still pending, or - if neither happened - starts a fresh GET
    // right here. Either way this component only ever fires at most one
    // network request of its own, never a duplicate of a hover-triggered
    // one.
    prefetchSessions(api)
      .then((data) => mounted && setSessions(data))
      .catch(() => mounted && setError("Couldn't load your past sessions."));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestDelete = (id) => {
    setDeleteError("");
    setPendingDeleteId(id);
  };

  const cancelDelete = () => {
    if (deleting) return;
    setPendingDeleteId(null);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/api/assessments/${pendingDeleteId}`);
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== pendingDeleteId);
        // Sync the shared cache too - otherwise a hover over the Navbar
        // Profile link right after this delete would instantly show the
        // pre-delete list again (cache still holding the old array).
        setCachedSessions(next);
        return next;
      });
      setInsightsRefreshToken((t) => t + 1);
      setPendingDeleteId(null);
      setSuccessMessage("Session deleted");
    } catch {
      setDeleteError("Couldn't delete this session. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const scrollToAllSessions = () => {
    allSessionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pt-16 pb-24">
      <h1 className="font-display text-3xl text-ink mb-1">Your profile</h1>
      <p className="text-muted mb-8">
        {user?.fullName ? `${user.fullName} · ` : ""}Every past session you've completed.
      </p>

      {/* Back home - kept above everything, including Insights */}
      <Link to="/" className="inline-block mb-8 text-sm font-medium text-muted hover:text-ink transition-colors">
        ← Back home
      </Link>

      {error && <p className="text-clay">{error}</p>}

      {!sessions && !error && <ProfileSkeleton />}

      {sessions && sessions.length > 0 && (
        <InsightsSection api={api} refreshToken={insightsRefreshToken} onViewAllClick={scrollToAllSessions} />
      )}

      {sessions && sessions.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-muted">You haven't completed any assessments yet.</p>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div ref={allSessionsRef}>
          <h2 className="font-display text-xl text-ink font-bold mb-5">All Sessions</h2>
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} api={api} onRequestDelete={requestDelete} />
            ))}
          </div>
        </div>
      )}

      <DeleteConfirmToast
        open={pendingDeleteId !== null}
        onCancel={cancelDelete}
        onHoldComplete={confirmDelete}
        deleting={deleting}
        error={deleteError}
      />

      <SuccessToast
        open={!!successMessage}
        message={successMessage}
        onDismiss={() => setSuccessMessage("")}
      />
    </div>
  );
}