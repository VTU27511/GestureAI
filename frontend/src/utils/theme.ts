export interface ColorTheme {
  name: string;
  primary: string;
  secondary: string;
  glow: string;
  gradient: string;
  textAccent: string;
}

export const DYNAMIC_THEMES: ColorTheme[] = [
  {
    name: 'Electric Cyan',
    primary: '#06b6d4',
    secondary: '#38bdf8',
    glow: 'rgba(6, 182, 212, 0.45)',
    gradient: 'linear-gradient(135deg, #06b6d4, #0284c7)',
    textAccent: '#38bdf8',
  },
  {
    name: 'Neon Purple',
    primary: '#a855f7',
    secondary: '#c084fc',
    glow: 'rgba(168, 85, 247, 0.45)',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    textAccent: '#c084fc',
  },
  {
    name: 'Cyber Emerald',
    primary: '#10b981',
    secondary: '#34d399',
    glow: 'rgba(16, 185, 129, 0.45)',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    textAccent: '#34d399',
  },
  {
    name: 'Cyberpunk Pink',
    primary: '#f43f5e',
    secondary: '#fb7185',
    glow: 'rgba(244, 63, 94, 0.45)',
    gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)',
    textAccent: '#fb7185',
  },
  {
    name: 'Solar Amber',
    primary: '#f59e0b',
    secondary: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.45)',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    textAccent: '#fbbf24',
  },
  {
    name: 'Electric Violet',
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    glow: 'rgba(139, 92, 246, 0.45)',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    textAccent: '#a78bfa',
  },
  {
    name: 'Hyper Teal',
    primary: '#14b8a6',
    secondary: '#2dd4bf',
    glow: 'rgba(20, 184, 166, 0.45)',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    textAccent: '#2dd4bf',
  },
  {
    name: 'Neon Magenta',
    primary: '#ec4899',
    secondary: '#f472b6',
    glow: 'rgba(236, 72, 153, 0.45)',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    textAccent: '#f472b6',
  },
];

export function applyThemeVariables(theme: ColorTheme) {
  document.documentElement.style.setProperty('--accent-cyan', theme.primary);
  document.documentElement.style.setProperty('--accent-cyan-hover', theme.secondary);
  document.documentElement.style.setProperty('--accent-violet', theme.primary);
  document.documentElement.style.setProperty('--brand-glow', theme.glow);
}
