/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0a0a1a',
          purple: '#5833ef',
          blue: '#3498db',
          green: '#2ecc71',
          yellow: '#f1c40f',
          red: '#e74c3c',
          orange: '#e67e22',
        },
        surface: {
          DEFAULT: '#12122a',
          light: '#1a1a35',
          lighter: '#222248',
          card: 'rgba(255,255,255,0.04)',
          hover: 'rgba(255,255,255,0.08)',
        },
        ludo: {
          red: '#e74c3c',
          blue: '#3498db',
          green: '#2ecc71',
          yellow: '#f1c40f',
          purple: '#9b59b6',
          orange: '#e67e22',
        },
      },
      fontFamily: {
        display: ["'Fredoka One'", 'cursive'],
        body: ["'Nunito'", 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        'card-lg': '28px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(241,196,15,0.3)',
        'glow-blue': '0 0 20px rgba(52,152,219,0.3)',
        'glow-green': '0 0 20px rgba(46,204,113,0.3)',
        'glow-purple': '0 0 20px rgba(88,51,239,0.3)',
        card: '0 8px 32px rgba(0,0,0,0.4)',
        'card-hover': '0 12px 48px rgba(0,0,0,0.6)',
        neon: '0 0 10px rgba(241,196,15,0.5), 0 0 40px rgba(241,196,15,0.2)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'dice-roll': 'diceRoll 0.6s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-scale': 'fadeInScale 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(5px) rotate(-1deg)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(241, 196, 15, 0.3)', transform: 'scale(1)' },
          '50%': { boxShadow: '0 0 25px rgba(241, 196, 15, 0.6)', transform: 'scale(1.03)' },
        },
        diceRoll: {
          '0%': { transform: 'rotateX(0deg) rotateY(0deg)' },
          '25%': { transform: 'rotateX(90deg) rotateY(45deg)' },
          '50%': { transform: 'rotateX(180deg) rotateY(90deg)' },
          '75%': { transform: 'rotateX(270deg) rotateY(135deg)' },
          '100%': { transform: 'rotateX(360deg) rotateY(180deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #5833ef, #3498db)',
        'gradient-warm': 'linear-gradient(135deg, #f1c40f, #e67e22)',
        'gradient-success': 'linear-gradient(135deg, #2ecc71, #27ae60)',
        'gradient-danger': 'linear-gradient(135deg, #e74c3c, #c0392b)',
        'gradient-dark': 'linear-gradient(135deg, #12122a, #1a1a35)',
        'gradient-board': 'linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #1a0a2e 100%)',
        'shimmer-light': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
      },
    },
  },
  plugins: [],
}
