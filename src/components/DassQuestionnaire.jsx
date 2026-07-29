import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApiClient } from "../lib/api.js";

/**
 * DASS-21 in English and Urdu. Scoring only ever depends on the numeric
 * 0-3 answers (see backend/app/services/dass_scoring.py), so which
 * language the questions were read in never needs to reach the backend -
 * this component stays fully self-contained.
 *
 * NOTE: These Urdu translations are provided for accessibility/convenience
 * and are not a clinically-normed/officially validated instrument the way
 * the original English DASS-21 is. That's worth knowing if precise
 * clinical comparability matters for your use case.
 *
 * Text-to-speech has two layers:
 *  1. Browser-native Web Speech API (window.speechSynthesis) - free,
 *     instant, no backend involved. Used whenever the visitor's own
 *     device has a voice installed for the selected language.
 *  2. Backend gTTS fallback (GET /api/tts) - used only when the browser
 *     has no voice for that language at all (common for Urdu on many
 *     Windows machines). Requires the backend to have internet access
 *     and takes a moment longer, since it's a real network request.
 */

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "ur", label: "Urdu", native: "اردو" },
];

// BCP-47 tags for the browser API, plain ISO codes for the backend gTTS API.
const SPEECH_LANG = { en: "en-US", ur: "ur-PK" };
const TTS_LANG = { en: "en", ur: "ur" };

const CONTENT = {
  en: {
    dir: "ltr",
    intro: "Over the past week...",
    stepLabel: (i, total) => `Question ${i} of ${total}`,
    back: "← Back",
    changeLanguage: "Change language",
    chooseLanguageTitle: "Choose your language",
    chooseLanguageSubtitle: "You can switch anytime before you start.",
    listen: "Listen to this question",
    stopListening: "Stop",
    loadingSpeech: "Loading audio…",
    speechError: "Couldn't play audio - check your internet connection.",
    answerLabels: [
      "Did not apply to me at all",
      "Applied to me to some degree, or some of the time",
      "Applied to me to a considerable degree, or a good part of time",
      "Applied to me very much, or most of the time",
    ],
    questions: [
      "I found it hard to wind down",
      "I was aware of dryness of my mouth",
      "I couldn't seem to experience any positive feeling at all",
      "I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)",
      "I found it difficult to work up the initiative to do things",
      "I tended to over-react to situations",
      "I experienced trembling (e.g. in the hands)",
      "I felt that I was using a lot of nervous energy",
      "I was worried about situations in which I might panic and make a fool of myself",
      "I felt that I had nothing to look forward to",
      "I found myself getting agitated",
      "I found it difficult to relax",
      "I felt down-hearted and blue",
      "I was intolerant of anything that kept me from getting on with what I was doing",
      "I felt I was close to panic",
      "I was unable to become enthusiastic about anything",
      "I felt I wasn't worth much as a person",
      "I found myself getting rather touchy",
      "I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)",
      "I felt scared without any good reason",
      "I felt that life was meaningless",
    ],
  },
  ur: {
    dir: "rtl",
    intro: "پچھلے ہفتے کے دوران...",
    stepLabel: (i, total) => `سوال ${i} از ${total}`,
    back: "→ پیچھے",
    changeLanguage: "زبان تبدیل کریں",
    chooseLanguageTitle: "اپنی زبان منتخب کریں",
    chooseLanguageSubtitle: "آپ شروع کرنے سے پہلے کسی بھی وقت زبان تبدیل کر سکتے ہیں۔",
    listen: "یہ سوال سنیں",
    stopListening: "روکیں",
    loadingSpeech: "آڈیو لوڈ ہو رہی ہے...",
    speechError: "آڈیو چلانے میں مسئلہ ہوا - انٹرنیٹ کنکشن چیک کریں۔",
    answerLabels: [
      "مجھ پر بالکل لاگو نہیں ہوا",
      "کسی حد تک، یا کبھی کبھار مجھ پر لاگو ہوا",
      "کافی حد تک، یا زیادہ تر وقت مجھ پر لاگو ہوا",
      "بہت زیادہ، یا تقریباً ہر وقت مجھ پر لاگو ہوا",
    ],
    questions: [
      "مجھے ذہنی سکون حاصل کرنا مشکل لگا",
      "مجھے اپنے منہ میں خشکی کا احساس ہوا",
      "مجھے بالکل بھی کوئی مثبت احساس محسوس نہیں ہوا",
      "مجھے سانس لینے میں دشواری محسوس ہوئی (مثلاً بہت تیز سانس آنا یا بغیر جسمانی مشقت کے سانس پھولنا)",
      "مجھے کسی بھی کام کا آغاز کرنے کے لیے حوصلہ پیدا کرنا مشکل لگا",
      "میں حالات پر ضرورت سے زیادہ ردعمل ظاہر کرنے لگا",
      "مجھے کپکپاہٹ محسوس ہوئی (مثلاً ہاتھوں میں)",
      "مجھے محسوس ہوا کہ میں بہت زیادہ اعصابی توانائی خرچ کر رہا ہوں",
      "مجھے ایسے حالات کی فکر رہی جن میں گھبرا کر میں خود کو شرمندہ کر سکتا تھا",
      "مجھے لگا کہ میرے پاس آگے دیکھنے کے لیے کچھ نہیں بچا",
      "میں بے چین اور مضطرب محسوس کرنے لگا",
      "مجھے پرسکون (ریلیکس) ہونا مشکل لگا",
      "میں اداس اور دل شکستہ محسوس کرتا رہا",
      "مجھے ہر اس چیز سے چڑ ہوتی تھی جو میرے کام میں رکاوٹ بنے",
      "مجھے لگا کہ میں گھبراہٹ (پینک) کے قریب ہوں",
      "میں کسی بھی چیز کے بارے میں پرجوش نہیں ہو پا رہا تھا",
      "مجھے لگا کہ بطور انسان میری کوئی زیادہ اہمیت نہیں",
      "میں جلد چڑ جانے والا محسوس کرنے لگا",
      "مجھے بغیر جسمانی مشقت کے اپنے دل کی دھڑکن کا احساس ہوا (مثلاً دھڑکن تیز ہونا یا دھڑکن رک جانے کا احساس)",
      "مجھے بغیر کسی وجہ کے خوف محسوس ہوا",
      "مجھے لگا کہ زندگی بے معنی ہے",
    ],
  },
};

// Native Web Speech API - no import needed, but not every browser has it.
const SPEECH_SUPPORTED = typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Renders a language picker first, then the DASS-21 one question at a
 * time. Calls onComplete(answers) with a 21-length array of 0-3 ints once
 * the last question is answered - identical contract to before, so
 * AssessmentFlow.jsx needs no changes.
 */
export default function DassQuestionnaire({ onComplete }) {
  const api = useApiClient();
  const [language, setLanguage] = useState(null); // null until chosen
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState(false);
  const [voices, setVoices] = useState(() => (SPEECH_SUPPORTED ? window.speechSynthesis.getVoices() : []));

  const audioRef = useRef(null); // holds the <audio> element for the gTTS fallback path

  // Voice lists load asynchronously in some browsers (notably Chrome) -
  // getVoices() can return an empty array on the very first call even
  // when voices do exist, so we also listen for the moment they finish
  // loading rather than trusting a single synchronous read.
  useEffect(() => {
    if (!SPEECH_SUPPORTED) return;
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
  }, []);

  const stopAllSpeech = () => {
    if (SPEECH_SUPPORTED) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsLoadingSpeech(false);
  };

  // Stop any in-progress speech whenever the question changes, the
  // language changes, or the component unmounts - prevents two questions'
  // audio from ever overlapping.
  useEffect(() => {
    return () => stopAllSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, language]);

  const hasVoiceForLang = (bcp47) => {
    const prefix = bcp47.split("-")[0].toLowerCase(); // "ur" from "ur-PK"
    return voices.some((v) => v.lang.toLowerCase().startsWith(prefix));
  };

  // --- Step 0: language selection ------------------------------------
  if (!language) {
    const resuming = index > 0 || answers.length > 0;
    return (
      <div className="max-w-md mx-auto px-6 pt-16 pb-24 text-center">
        <span className="font-mono text-xs text-teal">Step 1</span>
        <h1 className="font-display text-2xl md:text-3xl text-ink mt-2 mb-2">
          Choose your language
        </h1>
        <p className="text-muted mb-8">
          {resuming
            ? `You'll continue from question ${index + 1} - your answers so far are kept.`
            : "You can switch anytime before you start."}
        </p>

        <div className="space-y-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className="w-full px-5 py-4 rounded-xl border border-teal-light hover:bg-teal-light/40 transition-colors flex items-center justify-between"
            >
              <span className="text-ink font-medium">{lang.label}</span>
              <span className="text-muted">{lang.native}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const t = CONTENT[language];
  const total = t.questions.length;
  const progress = (index / total) * 100;
  const voiceAvailable = SPEECH_SUPPORTED && hasVoiceForLang(SPEECH_LANG[language]);

  const speakWithBrowser = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(t.questions[index]);
    utterance.lang = SPEECH_LANG[language];
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const speakWithBackend = async () => {
    setSpeechError(false);
    setIsLoadingSpeech(true);
    try {
      const res = await api.get("/api/tts", {
        params: { text: t.questions[index], lang: TTS_LANG[language] },
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => {
        setIsLoadingSpeech(false);
        setIsSpeaking(true);
      };
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoadingSpeech(false);
        setSpeechError(true);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsLoadingSpeech(false);
      setSpeechError(true);
    }
  };

  const speakQuestion = () => {
    // Acts as a toggle: clicking while already speaking/loading just stops it.
    if (isSpeaking || isLoadingSpeech) {
      stopAllSpeech();
      return;
    }
    setSpeechError(false);
    if (voiceAvailable) {
      speakWithBrowser();
    } else {
      speakWithBackend();
    }
  };

  const handleAnswer = (value) => {
    const next = [...answers];
    next[index] = value;
    setAnswers(next);

    if (index === total - 1) {
      onComplete(next);
    } else {
      setIndex(index + 1);
    }
  };

  const handleBack = () => {
    if (index > 0) setIndex(index - 1);
  };

  return (
    <div dir={t.dir} className="max-w-2xl mx-auto px-6 pt-14 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex justify-between text-xs font-mono text-muted mb-2">
            <span>{t.stepLabel(index + 1, total)}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-teal-light overflow-hidden">
            <motion.div
              className="h-full bg-teal"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>
        <button
          onClick={() => setLanguage(null)}
          className="ms-4 text-xs text-muted hover:text-ink transition-colors whitespace-nowrap"
        >
          {t.changeLanguage}
        </button>
      </div>

      <p className="text-sm text-muted mb-3">{t.intro}</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: t.dir === "rtl" ? -18 : 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: t.dir === "rtl" ? 18 : -18 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="flex items-start gap-3 mb-2">
            <h2 className="font-display text-2xl md:text-3xl text-ink leading-snug flex-1">
              {t.questions[index]}
            </h2>

            <button
              onClick={speakQuestion}
              aria-label={isSpeaking || isLoadingSpeech ? t.stopListening : t.listen}
              title={isSpeaking || isLoadingSpeech ? t.stopListening : t.listen}
              className={`shrink-0 mt-1.5 w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                isSpeaking
                  ? "bg-teal text-white"
                  : "text-teal hover:bg-teal-light/40 border border-teal-light"
              }`}
            >
              {isLoadingSpeech ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-teal-light border-t-teal animate-spin" />
              ) : isSpeaking ? (
                // Stop icon (small square) - shown while actively speaking
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              ) : (
                // Speaker icon
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 9v6h4l5 4V5L8 9H4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M17 8.5a5 5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path
                    d="M19.5 6a8.5 8.5 0 0 1 0 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                </svg>
              )}
            </button>
          </div>

          {speechError && <p className="text-xs text-clay mb-6">{t.speechError}</p>}
          {!speechError && <div className="mb-6" />}

          <div className="space-y-3">
            {t.answerLabels.map((label, val) => (
              <button
                key={val}
                onClick={() => handleAnswer(val)}
                className={`w-full text-start px-5 py-3.5 rounded-xl border transition-colors ${
                  answers[index] === val
                    ? "bg-teal text-white border-teal"
                    : "border-teal-light hover:bg-teal-light/40 text-ink"
                }`}
              >
                <span className="font-mono text-xs me-3 opacity-60">{val}</span>
                {label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {index > 0 && (
        <button onClick={handleBack} className="mt-8 text-sm text-muted hover:text-ink transition-colors">
          {t.back}
        </button>
      )}
    </div>
  );
}