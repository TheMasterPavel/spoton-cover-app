const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    allowedDevOrigins: [
      "https://3000-firebase-studio-1747900301578.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev",
      "https://6000-firebase-studio-1747900301578.cluster-6vyo4gb53jczovun3dxslzjahs.cloudworkstations.dev", // Añadida la URL del error
    ],
  },
};

export default nextConfig;
