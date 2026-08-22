import type { NextConfig } from "next";

/**
 * Routes from the previous member portal. The mobile-first rebuild reorganised
 * the member IA, so old bookmarks, WhatsApp links and notification deep links
 * are mapped onto their new homes instead of 404ing.
 */
const MEMBER_PORTAL_REDIRECTS: { source: string; destination: string }[] = [
  { source: "/member/dashboard", destination: "/member" },
  { source: "/member/check-ins", destination: "/member/activity" },
  { source: "/member/plans", destination: "/member/membership/renew" },
  { source: "/member/workout", destination: "/member/train" },
  { source: "/member/nutrition", destination: "/member/train" },
  { source: "/member/ai-trainer", destination: "/member/train" },
  { source: "/member/fitness-profile", destination: "/member/train" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async redirects() {
    return MEMBER_PORTAL_REDIRECTS.map((entry) => ({ ...entry, permanent: false }));
  },
};

export default nextConfig;
