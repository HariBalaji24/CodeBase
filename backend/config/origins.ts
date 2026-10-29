// Frontend origins allowed by CORS and by the CSRF check on cookie-based auth endpoints.
// Add more with a comma-separated FRONTEND_URL, e.g. FRONTEND_URL=https://my-app.vercel.app
export const allowedOrigins = [
  "http://localhost:3000",
  "https://code-base-xi.vercel.app",
  ...(process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

export const isAllowedOrigin = (origin: string) => allowedOrigins.includes(origin.replace(/\/$/, ""));
