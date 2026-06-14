/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // If you are deploying to https://vikasyadavnsit.github.io/ , you don't need basePath.
  // If it was vikasyadavnsit.github.io/repo-name, you would need it.
  turbopack: {},
};

export default nextConfig;
