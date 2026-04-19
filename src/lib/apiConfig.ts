// API configuration helper
// Use this instead of hardcoding localhost:5000 or other URLs

export const getApiBaseUrl = (): string => {
  // In browser, use relative paths
  if (typeof window !== "undefined") {
    return ""; // Empty string means relative paths (/api/...)
  }

  // Server-side (if needed)
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
};

export const getApiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  // If endpoint doesn't start with /, add it
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return base + path;
};
