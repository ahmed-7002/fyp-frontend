import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useApiClient } from "../lib/api.js";

const TARGET_FRAMES = 155;          // within the required 150-160 range
const DURATION_MS = 30_000;          // capture window: 30 seconds
const CAPTURE_INTERVAL_MS = DURATION_MS / TARGET_FRAMES; // ~193ms between frames
const CAPTURE_WIDTH = 320;           // downscaled - plenty for face-emotion detection, keeps encode fast
const CAPTURE_HEIGHT = 240;
const JPEG_QUALITY = 0.8;

/**
 * Captures TARGET_FRAMES individual JPEG snapshots evenly spaced across
 * DURATION_MS, then uploads them as multipart/form-data to /api/fer/analyze.
 *
 * Performance notes (why this doesn't freeze the browser):
 *  - We NEVER touch the DOM video element's native resolution; frames are
 *    drawn onto a small off-screen <canvas> at 320x240, which keeps every
 *    draw + encode operation cheap.
 *  - canvas.toBlob() is used instead of canvas.toDataURL(). toBlob encodes
 *    asynchronously off the main thread's synchronous call stack (it still
 *    runs on the main thread internally, but returns via a callback so it
 *    never blocks rendering/input the way a large synchronous
 *    toDataURL() call can), and produces binary data ready for upload
 *    with no base64 bloat.
 *  - Frames are scheduled with setInterval instead of requestAnimationFrame
 *    so capture cadence is time-accurate and decoupled from paint/rAF load.
 *  - Each captured Blob is pushed into a plain array (no re-renders per
 *    frame) - React state only updates a lightweight frame counter, not the
 *    frame data itself, so the UI stays responsive throughout capture.
 */
export default function VideoAssessment({ onComplete }) {
  const api = useApiClient();
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const streamRef = useRef(null);
  const framesRef = useRef([]);
  const intervalRef = useRef(null);

  const [phase, setPhase] = useState("idle"); // idle | requesting | recording | uploading | error
  const [frameCount, setFrameCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => stopStream, [stopStream]); // cleanup on unmount

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState < 2) return;

    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          framesRef.current.push(blob);
          setFrameCount(framesRef.current.length);
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  }, []);

  const uploadFrames = useCallback(
    async (frames) => {
      setPhase("uploading");
      const formData = new FormData();
      frames.forEach((blob, i) => {
        formData.append("frames", blob, `frame_${i}.jpg`);
      });

      try {
        const res = await api.post("/api/fer/analyze", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        onComplete(res.data);
      } catch (err) {
        setPhase("error");
        setErrorMsg(
          err?.response?.data?.detail ||
            "We couldn't analyze the video frames. You can try again."
        );
      }
    },
    [api, onComplete]
  );

  const startCapture = useCallback(() => {
    setPhase("recording");
    framesRef.current = [];
    setFrameCount(0);

    intervalRef.current = setInterval(() => {
      captureFrame();
      if (framesRef.current.length >= TARGET_FRAMES) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        stopStream();
        // Give the last toBlob callback a brief moment to resolve
        setTimeout(() => uploadFrames(framesRef.current), 250);
      }
    }, CAPTURE_INTERVAL_MS);
  }, [captureFrame, stopStream, uploadFrames]);

  const requestCamera = async () => {
    setPhase("requesting");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      startCapture();
    } catch (err) {
      setPhase("error");
      setErrorMsg(
        "Camera access was denied or unavailable. Please allow camera permissions and try again."
      );
    }
  };

  const progress = Math.min(100, Math.round((frameCount / TARGET_FRAMES) * 100));

  return (
    <div className="max-w-xl mx-auto px-6 pt-14 pb-24 text-center">
      <span className="font-mono text-xs text-teal">Video analysis</span>
      <h2 className="font-display text-2xl md:text-3xl text-ink mt-2 mb-3">
        Let's take a quick look
      </h2>
      <p className="text-muted mb-8">
        We'll capture brief snapshots over 30 seconds - just look naturally at
        your screen. Nothing is recorded as video or stored as a photo album,
        only aggregated emotion metrics are saved.
      </p>

      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-ink mb-6 shadow-soft">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover -scale-x-100"
        />
        {phase === "recording" && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full bg-teal"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        )}
        {phase === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
            Camera preview will appear here
          </div>
        )}
      </div>

      {phase === "idle" && (
        <button
          onClick={requestCamera}
          className="px-7 py-3.5 rounded-full bg-teal text-white font-medium hover:bg-teal-dark transition-colors"
        >
          Enable camera & start
        </button>
      )}

      {phase === "requesting" && <p className="text-muted text-sm">Requesting camera access…</p>}

      {phase === "recording" && (
        <p className="text-muted text-sm font-mono">
          Capturing frame {frameCount} / {TARGET_FRAMES}
        </p>
      )}

      {phase === "uploading" && <p className="text-muted text-sm">Analyzing your session…</p>}

      {phase === "error" && (
        <div>
          <p className="text-clay text-sm mb-4">{errorMsg}</p>
          <button
            onClick={requestCamera}
            className="px-6 py-2.5 rounded-full border border-teal text-teal font-medium hover:bg-teal-light/40 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
