/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"], deviceSizes: [640, 828, 1080, 1280, 1600, 2048, 2560, 3200, 3840] },
};
export default nextConfig;
