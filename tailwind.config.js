import { heroui } from '@heroui/theme';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: "#090D4C",
        secondary: "#B5843C",
        success: "#2ECC71",
        danger: "#F34649",
        "light-secondary": "rgba(181, 132, 60, 0.1)",
        "light-white": "rgba(255, 255, 255, 0.3)",
        "light-green ": "rgba(106, 231, 110, 0.25)",
        "linear-gradient": {
          secondary:
            "linear-gradient(0deg, rgba(181,132,60,1) 0%, rgba(89,68,69,1) 50%, rgba(9,13,76,1) 100%)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      },
  },
  plugins: [
    heroui({
      // themes: {
      //   light: {
      //     colors: {
      //       primary: {
      //         DEFAULT: '#747480',
      //         foreground: '#000000',
      //       },
      //       secondary: {
      //         DEFAULT: '#FFEB0A',
      //         foreground: '#000000',
      //       },
      //     },
      //     dark: {
      //       colors: {
      //         primary: {
      //           DEFAULT: '#747480',
      //           foreground: '#000000',
      //         },
      //         secondary: {
      //           DEFAULT: '#CCBB00',
      //           foreground: '#000000',
      //         },
      //       },
      //     },
      //   },
      // },
    }),
  ],
};
