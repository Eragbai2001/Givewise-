import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the dev server answer through the ngrok tunnel (needed for Log in with PayPal).
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: { formats: ["image/avif", "image/webp"], qualities: [75, 90] },
};

export default nextConfig;
