// lib/api.js
import axios from "axios";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Returns a stable axios instance pre-configured to attach the current
 * Clerk session token as a Bearer header on every request.
 *
 * Fixes the "getToken called before Clerk finished loading" race:
 * - Waits for Clerk's isLoaded flag before sending any request instead of
 *   firing immediately on mount.
 * - Keeps a ref to the latest getToken/isLoaded/isSignedIn so the axios
 *   instance itself can stay referentially stable across renders (safe to
 *   put in useEffect dependency arrays) while always using fresh auth state.
 *
 * Usage:
 *   const api = useApiClient();
 *   useEffect(() => {
 *     api.get("/api/assessments").then(...);
 *   }, [api]); // safe, api reference never changes
 */
export function useApiClient() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const authRef = useRef({ getToken, isLoaded, isSignedIn });
  useEffect(() => {
    authRef.current = { getToken, isLoaded, isSignedIn };
  }, [getToken, isLoaded, isSignedIn]);

  const instance = useMemo(() => {
    const client = axios.create({ baseURL: API_BASE_URL });

    client.interceptors.request.use(async (config) => {
      // Wait for Clerk to finish loading instead of racing it.
      // Polls a ref (not state) so this closure never goes stale,
      // even though the instance itself is created only once.
      const waitForClerk = async () => {
        const maxWaitMs = 5000;
        const intervalMs = 50;
        let waited = 0;
        while (!authRef.current.isLoaded && waited < maxWaitMs) {
          await new Promise((r) => setTimeout(r, intervalMs));
          waited += intervalMs;
        }
      };

      await waitForClerk();

      if (authRef.current.isSignedIn) {
        try {
          const token = await authRef.current.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (err) {
          console.error("Failed to get Clerk token:", err);
        }
      }

      return config;
    });

    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error(
            "API request unauthorized (401) — token missing, expired, or rejected by backend:",
            error.config?.url
          );
        }
        return Promise.reject(error);
      }
    );

    return client;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return instance;
}

export { API_BASE_URL };