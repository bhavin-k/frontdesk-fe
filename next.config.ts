import type { NextConfig } from "next";

const config: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  poweredByHeader: false,
  allowedDevOrigins: process.env.APP_BASE_URL ? [new URL(process.env.APP_BASE_URL).hostname] : [],
  logging: {
    incomingRequests: {
      ignore: [
        /\/api\/recruitment\/oauth\//,
        /\/api\/auth\//,
        /\/reset-password/,
      ],
    },
  },
  turbopack: { root: import.meta.dirname },
};

export default config;
