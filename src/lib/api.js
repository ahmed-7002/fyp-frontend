import axios from "axios";
import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Returns an axios instance pre-configured to attach the current Clerk
 * session token as a Bearer header on every request. Use inside components:
 *
 *   const api = useApiClient();
 *   const res = await api.get("/api/dass21/questions");
 */
export function useApiClient() {
  const { getToken } = useAuth();

  return useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE_URL });

    instance.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return instance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export { API_BASE_URL };
