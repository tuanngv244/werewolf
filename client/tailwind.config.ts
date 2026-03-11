import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Day Phase
        day: {
          bg: '#FFF8E7',
          card: '#FFFFFF',
          text: '#2C1810',
          'text-secondary': '#8B7355',
          muted: '#8B7355',
          border: '#D4C5A0',
          accent: '#E8A838',
          sky: '#87CEEB',
          sunlight: '#FFD93D',
          grass: '#7EC850',
        },
        // Night Phase
        night: {
          bg: '#1A1A2E',
          card: '#16213E',
          text: '#E8E8E8',
          'text-secondary': '#8892A8',
          muted: '#8892A8',
          border: '#2A3A5C',
          accent: '#C4A35A',
          sky: '#0B1026',
          moon: '#C4D7E0',
        },
        // Role Colors
        role: {
          doctor: '#3498DB',
          gunner: '#B8860B',
          seer: '#9B59B6',
          'aura-seer': '#E6E6FA',
          medium: '#7FDBFF',
          witch: '#6C3483',
          avenger: '#C0392B',
          'beast-hunter': '#8B6914',
          cursed: '#27AE60',
          werewolf: '#8B0000',
          'werewolf-shaman': '#800080',
          'alpha-werewolf': '#4A0000',
          'werewolf-seer': '#191970',
          headhunter: '#2C3E50',
          fool: '#FF6B6B',
          bomber: '#FF8C00',
          villager: '#8B7355',
        },
        // Seer Results
        seer: {
          good: '#4CAF50',
          evil: '#E74C3C',
          unknown: '#9E9E9E',
        },
        // Status
        status: {
          alive: '#4CAF50',
          dead: '#95A5A6',
          voting: '#F39C12',
          protected: '#3498DB',
        },
        // UI
        primary: '#4CAF50',
        'primary-hover': '#45a049',
        danger: '#E74C3C',
        'danger-hover': '#C0392B',
        success: '#4CAF50',
        warning: '#F39C12',
        info: '#3498DB',
        wood: '#D4A574',
        'wood-dark': '#8B6914',
        'wood-light': '#E8D5B7',
      },
      fontFamily: {
        heading: ['var(--font-fredoka)', 'Fredoka One', 'cursive'],
        body: ['var(--font-nunito)', 'Nunito', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      borderRadius: {
        'game': '16px',
        'button': '12px',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(232, 168, 56, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(232, 168, 56, 0.8)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
