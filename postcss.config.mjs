/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind v4: o plugin dedicado substitui `tailwindcss` + `autoprefixer`.
    "@tailwindcss/postcss": {},
  },
};

export default config;
