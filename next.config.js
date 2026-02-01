/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Important pe Windows/OneDrive: ignoră fișierele de sistem
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/.git/**",
        "**/.next/**",
        "**/node_modules/**",
        "**/System Volume Information/**",
        "**/DumpStack.log.tmp",
        "**/hiberfil.sys",
        "**/pagefile.sys",
        "**/swapfile.sys",
      ],
    };
    return config;
  },
};

module.exports = nextConfig;
