// theme.jsx — Plietsche Plünn design tokens
// Brand gradient + warm surfaces + Work Sans.

const PP = {
  // brand gradient (teal -> mint -> sky)
  teal: '#27b092',
  mint: '#79c4b0',
  sky:  '#80b4e2',
  gradient: 'linear-gradient(135deg, #27b092 0%, #79c4b0 50%, #80b4e2 100%)',
  gradientSoft: 'linear-gradient(135deg, rgba(39,176,146,0.12) 0%, rgba(121,196,176,0.10) 50%, rgba(128,180,226,0.12) 100%)',
  gradientVertical: 'linear-gradient(180deg, #27b092 0%, #79c4b0 55%, #80b4e2 100%)',

  // surfaces — slightly warmer than pure white for community feel
  bg: '#F4F7F4',
  surface: '#FFFFFF',
  sand: '#F4EFE6',          // warm second surface
  sandDeep: '#EBE3D2',
  glass: 'rgba(255,255,255,0.65)',
  glassDark: 'rgba(26,46,44,0.55)',

  // text
  ink: '#1A2E2C',
  ink2: '#5A6B6A',
  ink3: '#9AA8A7',
  hairline: '#E5EDEB',

  // semantic
  warn: '#E8A93B',
  err:  '#D9534F',

  // achievement tiers
  bronze: '#CD7F32',
  silver: '#B8B8B8',
  gold:   '#E8B923',

  // type
  font: '"Work Sans", -apple-system, system-ui, sans-serif',
};

// Tiny stroke-icon set (FA6-style: 1.8px stroke, rounded caps, no fill)
// Returns an inline SVG element. Pass size + color.
function Icon({ name, size = 22, color = 'currentColor', strokeWidth = 1.8, style }) {
  const p = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    'house':       <path {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
    'qr':          <g {...p}><rect x="3" y="3"  width="7" height="7" rx="1"/><rect x="14" y="3"  width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3h3M18 21h3"/></g>,
    'medal':       <g {...p}><circle cx="12" cy="15" r="6"/><path d="M9 9L6 2h12l-3 7"/></g>,
    'coins':       <g {...p}><ellipse cx="9" cy="8"  rx="6" ry="2.5"/><path d="M3 8v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V8"/><ellipse cx="15" cy="14" rx="6" ry="2.5"/><path d="M9 14v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/></g>,
    'camera':      <g {...p}><path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/></g>,
    'location':    <g {...p}><path d="M12 22s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></g>,
    'check':       <path {...p} d="M5 12l5 5L20 7"/>,
    'plus':        <path {...p} d="M12 5v14M5 12h14"/>,
    'minus':       <path {...p} d="M5 12h14"/>,
    'flame':       <path {...p} d="M12 3c2 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-2-4 1-8z"/>,
    'bell':        <g {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></g>,
    'gear':        <g {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.7l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>,
    'search':      <g {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></g>,
    'filter':      <path {...p} d="M3 5h18l-7 9v6l-4-2v-4z"/>,
    'chevron-right': <path {...p} d="M9 6l6 6-6 6"/>,
    'chevron-left':  <path {...p} d="M15 6l-6 6 6 6"/>,
    'chevron-down':  <path {...p} d="M6 9l6 6 6-6"/>,
    'arrow-right':   <path {...p} d="M5 12h14M13 6l6 6-6 6"/>,
    'x':           <path {...p} d="M6 6l12 12M18 6L6 18"/>,
    'sparkles':    <g {...p}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></g>,
    'leaf':        <path {...p} d="M4 20c0-10 6-16 16-16 0 10-6 16-16 16zM4 20l7-7"/>,
    'trophy':      <g {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3M9 15h6v3H9zM8 21h8"/></g>,
    'list':        <g {...p}><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/></g>,
    'grid':        <g {...p}><rect x="3" y="3"  width="7" height="7" rx="1"/><rect x="14" y="3"  width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></g>,
    'shirt':       <path {...p} d="M8 4l-5 3 2 4 3-1v10h12V10l3 1 2-4-5-3-3 2h-6z"/>,
    'tag':         <g {...p}><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/></g>,
    'user':        <g {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></g>,
    'users':       <g {...p}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 3-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="17" cy="9" r="2.8"/><path d="M15 14c4 0 6 2 6 5"/></g>,
    'calendar':    <g {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></g>,
    'chart':       <path {...p} d="M3 19h18M5 16l4-5 4 3 6-8"/>,
    'star':        <path {...p} d="M12 3l2.7 6 6.3.6-4.8 4.4 1.5 6.3L12 17l-5.7 3.3 1.5-6.3L3 9.6 9.3 9z"/>,
    'image':       <g {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-6-5-9 9"/></g>,
    'edit':        <path {...p} d="M5 19l-1 1 1-5L17 3l4 4L8 20l-5 1z"/>,
    'trash':       <g {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v7M14 11v7"/></g>,
    'send':        <path {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>,
    'eye':         <g {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></g>,
    'eye-off':     <g {...p}><path d="M3 3l18 18M9.5 5.4A10 10 0 0 1 22 12s-1.6 2.8-4.4 4.7M6.4 6.5A11 11 0 0 0 2 12s4 7 10 7c1.7 0 3.3-.5 4.6-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></g>,
    'mail':        <g {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></g>,
    'lock':        <g {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></g>,
    'door':        <g {...p}><rect x="5" y="3" width="14" height="18" rx="1"/><circle cx="15" cy="12" r=".8" fill={color}/></g>,
    'compass':     <g {...p}><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-4 0 2-6z"/></g>,
    'heart':       <path {...p} d="M12 21s-7-4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 5-9 9-9 9z"/>,
    'clock':       <g {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>,
    'info':        <g {...p}><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".8" fill={color}/></g>,
    'phone':       <path {...p} d="M5 4h4l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/>,
    'map-pin':     <g {...p}><path d="M12 22s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></g>,
    'qr-scan':     <g {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M4 12h16" stroke={PP.teal}/></g>,
    'bookmark':    <path {...p} d="M6 4h12v17l-6-4-6 4z"/>,
    'megaphone':   <g {...p}><path d="M3 11v2a1 1 0 0 0 1 1h2l8 5V5L6 10H4a1 1 0 0 0-1 1z"/><path d="M18 8a4 4 0 0 1 0 8"/></g>,
    'sliders':     <g {...p}><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill={PP.bg} stroke={color}/><circle cx="15" cy="12" r="2" fill={PP.bg} stroke={color}/><circle cx="7" cy="18" r="2" fill={PP.bg} stroke={color}/></g>,
    'arrow-up':    <path {...p} d="M12 19V5M6 11l6-6 6 6"/>,
    'arrow-down':  <path {...p} d="M12 5v14M6 13l6 6 6-6"/>,
    'arrow-left':  <path {...p} d="M19 12H5M11 6l-6 6 6 6"/>,
    'circle':      <circle {...p} cx="12" cy="12" r="9"/>,
    'cloud':       <path {...p} d="M7 18a4 4 0 0 1-1-8 5 5 0 0 1 10 0 4 4 0 0 1 0 8z"/>,
    'gift':        <g {...p}><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12"/><path d="M12 9c-2-4-7-3-7 0 0 2 4 2 7 0zM12 9c2-4 7-3 7 0 0 2-4 2-7 0z"/></g>,
    'shirt-2':     <path {...p} d="M7 4l-4 3 2 5 2-1v10h10V11l2 1 2-5-4-3-2 2-4 0z"/>,
    'menu':        <path {...p} d="M4 7h16M4 12h16M4 17h16"/>,
    'more-h':      <g><circle cx="6" cy="12" r="1.6" fill={color}/><circle cx="12" cy="12" r="1.6" fill={color}/><circle cx="18" cy="12" r="1.6" fill={color}/></g>,
    'ring':        <g {...p}><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 8 8"/></g>,
    'gauge':       <g {...p}><path d="M5 18a9 9 0 1 1 14 0"/><path d="M12 16l4-5"/></g>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0, ...style }}>
      {paths[name] ?? paths['circle']}
    </svg>
  );
}

Object.assign(window, { PP, Icon });
