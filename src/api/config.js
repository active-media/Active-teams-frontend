const configuredBase = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const API_BASE = configuredBase.replace(/\/+$/, "");