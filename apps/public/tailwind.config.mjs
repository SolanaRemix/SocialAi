/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00fff5',
        'neon-magenta': '#ff00ff',
        'neon-violet': '#8b5cf6',
        'neon-lime': '#00ff88',
        'neon-orange': '#ff6b00',
        'dark-base': '#0a0a0f',
        'dark-surface': '#12121a',
        'dark-border': '#1e1e2e',
      },
      boxShadow: {
        'neon-cyan': '0 0 8px #00fff5, 0 0 20px rgba(0,255,245,0.3)',
        'neon-magenta': '0 0 8px #ff00ff, 0 0 20px rgba(255,0,255,0.3)',
        'neon-violet': '0 0 8px #8b5cf6, 0 0 20px rgba(139,92,246,0.3)',
        'neon-lime': '0 0 8px #00ff88, 0 0 20px rgba(0,255,136,0.3)',
        'glass': '0 4px 24px rgba(0,0,0,0.4)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(135deg, #00fff5 0%, #8b5cf6 50%, #ff00ff 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0a0a0f 0%, #12121a 100%)',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: {
        'glass': '12px',
      },
    },
  },
  plugins: [],
};
