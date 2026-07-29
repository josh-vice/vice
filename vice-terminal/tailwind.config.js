/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				terminal: {
					// Vice — Miami cyber dark theme (midnight indigo canvas)
					bg: '#0a0a12',
					'bg-secondary': '#0f0f1a',
					'bg-tertiary': '#17172a',
					'bg-hover': '#1d1d33',
					'bg-panel': '#0c0c16',
					border: '#222238',
					'border-light': '#33334d',
					text: '#e8e8f2',
					'text-secondary': '#9696ad',
					'text-muted': '#56566e',
					// Vice neon accents — aqua mint (up) / flamingo pink (down)
					green: '#2ee6c2',
					'green-dim': '#22c7a8',
					'green-bg': 'rgba(46, 230, 194, 0.1)',
					red: '#ff3d9a',
					'red-dim': '#e02d85',
					'red-bg': 'rgba(255, 61, 154, 0.1)',
					blue: '#2e7bff',
					purple: '#9b57ff',
					'purple-bg': 'rgba(155, 87, 255, 0.15)',
					yellow: '#f5b82e',
					orange: '#ff7847',
					cyan: '#4fd6f7'
				}
			},
			fontFamily: {
				mono: ['var(--font-terminal-mono)'],
				sans: ['var(--font-terminal-sans)']
			},
			fontSize: {
				'3xs': ['0.5625rem', { lineHeight: '0.75rem' }],
				'2xs': ['0.71875rem', { lineHeight: '0.9375rem' }],
				'xs':  ['0.8125rem',  { lineHeight: '1.125rem' }],
				'sm':  ['0.875rem',   { lineHeight: '1.25rem'  }]
			},
			spacing: {
				'sidebar': '200px',
				'right-panel': '320px'
			},
			animation: {
				'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'fade-in': 'fadeIn 0.15s ease-out',
				'slide-up': 'slideUp 0.2s ease-out',
				'slide-down': 'slideDown 0.15s ease-out',
				'flash-green': 'flashGreen 0.3s ease-out',
				'flash-red': 'flashRed 0.3s ease-out'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				slideUp: {
					'0%': { transform: 'translateY(8px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				slideDown: {
					'0%': { transform: 'translateY(-8px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				flashGreen: {
					'0%': { backgroundColor: 'rgba(46, 230, 194, 0.25)' },
					'100%': { backgroundColor: 'transparent' }
				},
				flashRed: {
					'0%': { backgroundColor: 'rgba(255, 61, 154, 0.25)' },
					'100%': { backgroundColor: 'transparent' }
				}
			},
			boxShadow: {
				'glow-green': '0 0 12px rgba(46, 230, 194, 0.3)',
				'glow-red': '0 0 12px rgba(255, 61, 154, 0.3)',
				'panel': '0 1px 3px rgba(0,0,0,0.4)'
			}
		}
	},
	plugins: []
};
