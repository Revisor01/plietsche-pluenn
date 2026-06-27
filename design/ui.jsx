// ui.jsx — Plietsche Plünn shared UI primitives
// Brand cards, gradient ring, progress bars, item placeholders, tab bars.

// ─── Screen wrapper ─────────────────────────────────────────
// Fills the device frame's content area. Caller picks padTop based on
// platform (iOS has an overlaid status bar; Android consumes its own).
function PPScreen({ children, bg = PP.bg, padTop = 58, padBottom = 96, style }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      fontFamily: PP.font, color: PP.ink,
      paddingTop: padTop, paddingBottom: padBottom,
      boxSizing: 'border-box', position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  );
}

// ─── Card ───────────────────────────────────────────────────
function Card({ children, pad = 18, radius = 22, bg = '#fff', style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: bg, borderRadius: radius, padding: pad,
      boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(26,46,44,0.04), 0 8px 24px rgba(26,46,44,0.05)',
      ...style,
    }}>{children}</div>
  );
}

// Gradient card: brand gradient bg, light text. Soft pattern hint optional.
function GradientCard({ children, pad = 18, radius = 22, style, pattern = true }) {
  return (
    <div style={{
      background: PP.gradient, borderRadius: radius, padding: pad,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(39,176,146,0.18), 0 2px 6px rgba(39,176,146,0.12)',
      color: '#fff',
      ...style,
    }}>
      {pattern && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none',
          background: 'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.55) 0%, transparent 45%), radial-gradient(circle at 15% 110%, rgba(255,255,255,0.4) 0%, transparent 40%)',
        }} />
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

// Glass card (for liquid-glass tab bar option, modals)
function GlassCard({ children, pad = 18, radius = 24, style, tint = 'light' }) {
  return (
    <div style={{
      background: tint === 'light' ? 'rgba(255,255,255,0.62)' : 'rgba(26,46,44,0.55)',
      backdropFilter: 'blur(22px) saturate(180%)',
      WebkitBackdropFilter: 'blur(22px) saturate(180%)',
      borderRadius: radius, padding: pad,
      border: '0.5px solid rgba(255,255,255,0.5)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 10px 30px rgba(26,46,44,0.10)',
      ...style,
    }}>{children}</div>
  );
}

// ─── Gradient ring (points/progress) ────────────────────────
function GradientRing({ size = 132, stroke = 12, progress = 0.66, children, trackColor }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, progress)));
  const gid = `ppg-${size}-${stroke}`;
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"  stopColor={PP.teal} />
            <stop offset="50%" stopColor={PP.mint} />
            <stop offset="100%" stopColor={PP.sky} />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke={trackColor || 'rgba(26,46,44,0.06)'} strokeWidth={stroke} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={`url(#${gid})`} strokeWidth={stroke}
          strokeLinecap="round" fill="none"
          strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Progress bar ───────────────────────────────────────────
function ProgressBar({ value = 0.5, height = 6, tier, label }) {
  const fill = tier === 'gold' ? PP.gold : tier === 'silver' ? PP.silver : tier === 'bronze' ? PP.bronze : null;
  return (
    <div style={{ width: '100%' }}>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: PP.ink2, marginBottom: 4 }}>{label}</div>}
      <div style={{ height, background: 'rgba(26,46,44,0.08)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%',
          background: fill || PP.gradient, borderRadius: 999,
        }} />
      </div>
    </div>
  );
}

// ─── Pill / chip ────────────────────────────────────────────
function Pill({ children, color, bg, icon, style, size = 'm' }) {
  const padH = size === 's' ? 8 : 12;
  const padV = size === 's' ? 4 : 6;
  const fs = size === 's' ? 11 : 12.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: `${padV}px ${padH}px`, borderRadius: 999,
      background: bg || 'rgba(39,176,146,0.10)', color: color || PP.teal,
      fontSize: fs, fontWeight: 500, letterSpacing: 0.1,
      ...style,
    }}>
      {icon && <Icon name={icon} size={fs + 2} color={color || PP.teal} strokeWidth={2} />}
      {children}
    </span>
  );
}

// ─── Striped image placeholder ──────────────────────────────
function ImgSlot({ w = '100%', h = 120, label = 'photo', radius = 14, tone = 'teal' }) {
  const palettes = {
    teal: { a: 'rgba(39,176,146,0.18)',  b: 'rgba(39,176,146,0.08)',  ink: '#27b092' },
    sky:  { a: 'rgba(128,180,226,0.20)', b: 'rgba(128,180,226,0.08)', ink: '#80b4e2' },
    sand: { a: 'rgba(180,150,90,0.18)',  b: 'rgba(180,150,90,0.06)',  ink: '#8a6d3a' },
    ink:  { a: 'rgba(26,46,44,0.10)',    b: 'rgba(26,46,44,0.04)',    ink: '#1A2E2C' },
  };
  const c = palettes[tone] || palettes.teal;
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: `repeating-linear-gradient(135deg, ${c.a} 0 8px, ${c.b} 8px 16px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      <span style={{
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        fontSize: 10, color: c.ink, opacity: 0.75, letterSpacing: 0.2,
        padding: '3px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.7)',
      }}>{label}</span>
    </div>
  );
}

// ─── Button ─────────────────────────────────────────────────
function PPButton({ children, variant = 'primary', size = 'l', icon, iconRight, style, fullWidth = true, onClick }) {
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';
  const h = size === 'l' ? 52 : size === 'm' ? 44 : 36;
  const fs = size === 'l' ? 16 : size === 'm' ? 14.5 : 13;
  const radius = size === 'l' ? 16 : 14;
  return (
    <button onClick={onClick} style={{
      height: h, width: fullWidth ? '100%' : undefined, padding: '0 22px',
      borderRadius: radius, border: 'none', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontFamily: PP.font, fontSize: fs, fontWeight: 600, letterSpacing: 0.1,
      background: isPrimary ? PP.gradient : isSecondary ? '#fff' : 'transparent',
      color: isPrimary ? '#fff' : isGhost ? PP.teal : PP.ink,
      boxShadow: isPrimary ? '0 6px 18px rgba(39,176,146,0.32)' : isSecondary ? '0 1px 0 rgba(26,46,44,0.05), inset 0 0 0 1px rgba(26,46,44,0.08)' : 'none',
      transition: 'transform .12s',
      ...style,
    }}>
      {icon && <Icon name={icon} size={fs + 4} color="currentColor" strokeWidth={2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={fs + 4} color="currentColor" strokeWidth={2} />}
    </button>
  );
}

// ─── Header (warm, no platform chrome) ──────────────────────
function PPHeader({ title, subtitle, leading, trailing, style }) {
  return (
    <div style={{
      padding: '8px 20px 14px', display: 'flex', alignItems: 'center', gap: 12,
      ...style,
    }}>
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        {subtitle && <div style={{ fontSize: 12, color: PP.ink2, letterSpacing: 0.2, marginBottom: 2 }}>{subtitle}</div>}
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: PP.ink, lineHeight: 1.1 }}>{title}</div>
      </div>
      {trailing}
    </div>
  );
}

// ─── Avatar circle ──────────────────────────────────────────
function Avatar({ initials = 'AS', size = 38, gradient = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: gradient ? PP.gradient : PP.sand,
      color: gradient ? '#fff' : PP.ink, fontWeight: 600, fontSize: size * 0.36,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      letterSpacing: 0.4,
    }}>{initials}</div>
  );
}

// ─── Stat row (KPI for admin) ──────────────────────────────
function Stat({ value, label, delta, tone = 'ink' }) {
  return (
    <div style={{ flex: 1, padding: '10px 0' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: tone === 'teal' ? PP.teal : PP.ink, letterSpacing: -0.5, lineHeight: 1.05 }}>{value}</div>
      <div style={{ fontSize: 11, color: PP.ink2, marginTop: 3, letterSpacing: 0.1 }}>{label}</div>
      {delta != null && (
        <div style={{ fontSize: 10.5, color: delta >= 0 ? PP.teal : PP.err, marginTop: 2, fontWeight: 600 }}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </div>
      )}
    </div>
  );
}

// ─── Section header ─────────────────────────────────────────
function SectionTitle({ title, action, padding = '0 20px' }) {
  return (
    <div style={{ padding, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, marginTop: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: PP.ink, letterSpacing: -0.2 }}>{title}</div>
      {action && <div style={{ fontSize: 12, color: PP.teal, fontWeight: 500 }}>{action}</div>}
    </div>
  );
}

// ─── Tab bar variants ──────────────────────────────────────
// All 3 variants share the same icon set; only chrome differs.
const TAB_ITEMS = [
  { key: 'home',    label: 'Moin',     icon: 'house' },
  { key: 'checkin', label: 'Check-In', icon: 'qr-scan' },
  { key: 'badges',  label: 'Watt',     icon: 'medal' },
  { key: 'points',  label: 'Punkte',   icon: 'coins' },
];

function TabBar({ variant = 'glass', active = 'home', floatingMargin = 12 }) {
  const items = TAB_ITEMS;

  const renderItem = (it, isDark) => {
    const isActive = it.key === active;
    const c = isActive ? (isDark ? '#fff' : PP.teal) : (isDark ? 'rgba(255,255,255,0.55)' : PP.ink3);
    return (
      <div key={it.key} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '4px 0', position: 'relative',
      }}>
        <div style={{
          width: isActive ? 38 : 28, height: 28, borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isActive && variant === 'glass' ? 'rgba(39,176,146,0.14)' : 'transparent',
          transition: 'all .2s',
        }}>
          <Icon name={it.icon} size={22} color={c} strokeWidth={isActive ? 2.1 : 1.7} />
        </div>
        <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, color: c, letterSpacing: 0.1 }}>{it.label}</span>
      </div>
    );
  };

  if (variant === 'glass') {
    // Floating glass with rounded pill bg
    return (
      <div style={{
        position: 'absolute', bottom: floatingMargin, left: 12, right: 12,
        height: 64, borderRadius: 26,
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.6)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 12px 30px rgba(26,46,44,0.10), 0 2px 8px rgba(26,46,44,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 4px', zIndex: 5,
      }}>
        {items.map(it => renderItem(it, false))}
      </div>
    );
  }
  if (variant === 'classic') {
    // Solid white, bottom-anchored, top border
    return (
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: `1px solid ${PP.hairline}`,
        paddingBottom: 18, paddingTop: 8, display: 'flex',
        zIndex: 5,
      }}>
        {items.map(it => renderItem(it, false))}
      </div>
    );
  }
  // minimal: just icons, no chrome, transparent
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 18, paddingTop: 10, display: 'flex',
      zIndex: 5,
    }}>
      {items.map(it => renderItem(it, false))}
    </div>
  );
}

// ─── Toast (badge unlocked) ───────────────────────────────
function Toast({ title, subtitle, icon = 'medal', tone = 'gradient' }) {
  return (
    <div style={{
      position: 'absolute', top: 80, left: 16, right: 16, zIndex: 8,
      display: 'flex', alignItems: 'center', gap: 12, padding: 14,
      borderRadius: 18,
      background: tone === 'gradient' ? PP.gradient : '#fff',
      color: tone === 'gradient' ? '#fff' : PP.ink,
      boxShadow: '0 14px 40px rgba(39,176,146,0.28)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: tone === 'gradient' ? 'rgba(255,255,255,0.2)' : 'rgba(39,176,146,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={22} color={tone === 'gradient' ? '#fff' : PP.teal} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Status bar spacer note (for the inside-frame view) ───
// The device frame has its own status bar overlaid. PPScreen leaves padTop=56
// for iOS, and we override per-screen if Android.

Object.assign(window, {
  PPScreen, Card, GradientCard, GlassCard, GradientRing, ProgressBar,
  Pill, ImgSlot, PPButton, PPHeader, Avatar, Stat, SectionTitle,
  TabBar, TAB_ITEMS, Toast,
});
