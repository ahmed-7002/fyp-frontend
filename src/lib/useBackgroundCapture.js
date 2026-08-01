import { useRef, useState, useCallback, useEffect } from "react";

const CAPTURE_INTERVAL_MS = 2000;   // one frame every 2 seconds, regardless of how long the questionnaire takes
const TARGET_FRAMES = 155;           // capture stops automatically once this many frames exist
const CAPTURE_WIDTH = 320;           // downscaled - matches VideoAssessment.jsx's approach, keeps encode cheap
const CAPTURE_HEIGHT = 240;
const JPEG_QUALITY = 0.8;

/**
 * Silently captures webcam frames on a fixed 2-second interval for as long
 * as `active` is true, stopping automatically once TARGET_FRAMES is
 * reached. Unlike VideoAssessment.jsx (a fixed 30-second window), this is
 * designed to run alongside something of *variable* duration - e.g. a
 * self-paced questionnaire - and be stopped early via stopAndGetFrames()
 * whenever that other thing finishes, whatever the elapsed time was.
 *
 * Same performance approach as VideoAssessment.jsx and same reasoning:
 * off-screen downscaled canvas + canvas.toBlob() (not toDataURL()) so
 * capturing never blocks the main thread or freezes whatever UI is
 * actually on screen (the questionnaire, in this case).
 *
 * Returns a `videoRef` that the calling component must attach to a
 * (visually hidden, but still rendered/attached) <video> element - the
 * hook itself can't render JSX, but the stream needs a real <video> tag
 * in the DOM to decode into.
 */
export function useBackgroundCapture(active) {
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const streamRef = useRef(null);
  const framesRef = useRef([]);
  const intervalRef = useRef(null);

  const [frameCount, setFrameCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const stopInternal = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState < 2) return;
    if (framesRef.current.length >= TARGET_FRAMES) return;

    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (framesRef.current.length >= TARGET_FRAMES) return; // a late callback could otherwise sneak one extra frame in
        framesRef.current.push(blob);
        setFrameCount(framesRef.current.length);
        if (framesRef.current.length >= TARGET_FRAMES) {
          stopInternal();
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  }, [stopInternal]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Detects the camera being pulled away mid-session by something
        // outside this app's control (another program/driver process
        // grabbing it, a USB power-management drop, etc.) - this does NOT
        // fire from our own stopInternal()'s track.stop() calls, only from
        // a genuine external disconnection, per the MediaStreamTrack spec.
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            setCameraError(
              "The camera disconnected partway through - continuing with your answers using the frames captured so far."
            );
            stopInternal();
          };
        }

        setIsCapturing(true);
        intervalRef.current = setInterval(captureFrame, CAPTURE_INTERVAL_MS);
      } catch {
        setCameraError(
          "Camera access was denied or unavailable - continuing with the questionnaire only."
        );
      }
    })();

    return () => {
      cancelled = true;
      stopInternal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /**
   * Stops capture (if still running) and resolves with whatever frames
   * were collected so far. Waits briefly first so any capture already
   * mid-flight (canvas.toBlob's callback hasn't fired yet) has a chance
   * to land before the frame list is read - same reasoning as the small
   * grace delay in VideoAssessment.jsx.
   */
  const stopAndGetFrames = useCallback(() => {
    stopInternal();
    return new Promise((resolve) => {
      setTimeout(() => resolve([...framesRef.current]), 300);
    });
  }, [stopInternal]);

  return { videoRef, frameCount, isCapturing, cameraError, stopAndGetFrames, targetFrames: TARGET_FRAMES };
}