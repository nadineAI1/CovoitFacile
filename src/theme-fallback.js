// fallback léger pour éviter les crashes si une librairie attend un "theme" global
if (typeof global.__APP_THEME_FALLBACK__ === 'undefined') {
  global.__APP_THEME_FALLBACK__ = {
    colors: {
      primary: '#1f6f8b',
      accent: '#6fcf97',
      background: '#f3f7f9',
      text: '#222',
      muted: '#666',
      white: '#ffffff',
    },
    cardRadius: 14,
    borderRadius: 12,
    spacing: {
      xs: 6,
      sm: 12,
      md: 16,
      lg: 24,
    },
    shadow: {
      color: '#000',
      offset: { width: 0, height: 4 },
      opacity: 0.06,
      radius: 8,
      elevation: 4,
    },
    avatarSize: 48,
    headerHeight: 64,
  };
}

// exposer global.Theme si du code en dépend
global.Theme = global.Theme || global.__APP_THEME_FALLBACK__;