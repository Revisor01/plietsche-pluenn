// screens-staff.jsx — Plietsche Plünn volunteer + admin screens
// Item-Liste, Item-Form, Admin Dashboard, Badge-CRUD, Push-Composer, User-Mgmt.

const ITEMS = [
  { t: 'Wollpullover',  s: 'Damen · S',    pts: 30, tag: 4,  tone: 'teal' },
  { t: 'Jeansjacke',    s: 'Herren · M',   pts: 30, tag: 12, tone: 'sky'  },
  { t: 'Sommerkleid',   s: 'Damen · 38',   pts: 30, tag: 2,  tone: 'sand' },
  { t: 'Kinder-Hose',   s: 'Kids · 116',   pts: 20, tag: 7,  tone: 'ink'  },
  { t: 'Strickjacke',   s: 'Damen · M',    pts: 30, tag: 9,  tone: 'teal' },
  { t: 'Hemd',          s: 'Herren · L',   pts: 30, tag: 3,  tone: 'sky'  },
];

// ─── Volunteer Item-Liste ───────────────────────────────────
function VolunteerItems({ tabVariant = 'glass' }) {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Plünn-Verwaltung"
        title="Bestand"
        leading={<Avatar initials="MV" gradient />}
        trailing={
          <div style={{
            width: 40, height: 40, borderRadius: 14, background: PP.gradient,
            boxShadow: '0 6px 14px rgba(39,176,146,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="plus" size={20} color="#fff" strokeWidth={2.4} /></div>
        }
      />
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 2px rgba(26,46,44,0.04)' }}>
          <Icon name="search" size={18} color={PP.ink3} strokeWidth={2} />
          <div style={{ flex: 1, fontSize: 14, color: PP.ink3 }}>Suchen — Kategorie, Tag-Nummer …</div>
          <Icon name="sliders" size={18} color={PP.ink2} strokeWidth={2} />
        </div>
      </div>
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6, overflowX: 'hidden' }}>
        <Pill style={{ background: PP.gradient, color: '#fff' }}>Alle · 84</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Damen</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Herren</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Kinder</Pill>
        <Pill icon="tag" bg="rgba(26,46,44,0.06)" color={PP.ink2} size="s">Mit QR</Pill>
      </div>
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {ITEMS.map((it, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 1px 2px rgba(26,46,44,0.04)' }}>
              <div style={{ position: 'relative' }}>
                <ImgSlot h={110} radius={0} label={`${it.t}, ${it.s.split(' · ')[1]}`} tone={it.tone} />
                <div style={{ position: 'absolute', top: 8, left: 8 }}>
                  <Pill icon="tag" bg="rgba(255,255,255,0.92)" color={PP.ink} size="s" style={{ backdropFilter: 'blur(6px)' }}>#{String(it.tag).padStart(3, '0')}</Pill>
                </div>
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: PP.ink, letterSpacing: -0.1 }}>{it.t}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <div style={{ fontSize: 10.5, color: PP.ink2 }}>{it.s}</div>
                  <Pill icon="coins" size="s" bg="rgba(39,176,146,0.10)">+{it.pts}</Pill>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="home" />
    </PPScreen>
  );
}

// ─── Volunteer Item-Form ────────────────────────────────────
function VolunteerItemForm() {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Neues Teil"
        title="Anlegen"
        leading={<IconButton icon="chevron-left" />}
        trailing={
          <div style={{ fontSize: 13, color: PP.teal, fontWeight: 600, padding: '8px 6px' }}>Speichern</div>
        }
      />
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <ImgSlot w={102} h={102} radius={16} label="foto.jpg" tone="teal" />
            <div style={{
              width: 102, height: 102, borderRadius: 16, background: 'rgba(26,46,44,0.04)',
              border: `1.5px dashed ${PP.hairline}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <Icon name="plus" size={20} color={PP.ink3} strokeWidth={2} />
              <div style={{ fontSize: 10.5, color: PP.ink3, fontWeight: 500 }}>Foto</div>
            </div>
          </div>

          <FormField label="Bezeichnung" value="Wollpullover" />
          <div style={{ display: 'flex', gap: 10 }}>
            <FormField label="Kategorie" value="Damen · Oberteil" trailing="chevron-down" />
            <FormField label="Größe"     value="S" trailing="chevron-down" />
          </div>
          <FormField label="Zustand" value="Gut erhalten" trailing="chevron-down" />
          <FormField label="Notiz (optional)" value="grün-meliert, leichter Wollanteil" multiline />

          <div style={{ padding: '14px 16px', background: '#fff', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 2px rgba(26,46,44,0.04)' }}>
            <div style={{ width: 60, height: 60, borderRadius: 10, background: '#fff', padding: 6, border: `1px solid ${PP.hairline}` }}>
              {/* tiny faux QR */}
              <div style={{ width: '100%', height: '100%', background: 'repeating-conic-gradient(#1A2E2C 0% 25%, #fff 0% 50%) 50% / 8px 8px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: PP.ink }}>QR-Code · #084</div>
              <div style={{ fontSize: 11.5, color: PP.ink2, marginTop: 1 }}>Wird beim Speichern erzeugt.</div>
            </div>
            <Pill icon="check" size="s" bg="rgba(39,176,146,0.10)">+30 Pkt</Pill>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <PPButton variant="secondary" size="m" style={{ flex: 1 }} fullWidth={false}>QR drucken</PPButton>
            <PPButton size="m" style={{ flex: 1.2 }} fullWidth={false} icon="check">Speichern</PPButton>
          </div>
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
    </PPScreen>
  );
}

function FormField({ label, value, trailing, multiline }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '10px 14px',
      flex: 1,
      boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(26,46,44,0.04)',
      border: '1px solid rgba(26,46,44,0.06)',
      display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 8,
      minHeight: multiline ? 64 : 'auto',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10.5, color: PP.ink3, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 14, color: PP.ink, fontWeight: 500, marginTop: 2, lineHeight: 1.35 }}>{value}</div>
      </div>
      {trailing && <Icon name={trailing} size={18} color={PP.ink3} strokeWidth={1.8} />}
    </div>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────
function AdminDashboard({ tabVariant = 'glass' }) {
  // sparkline path (manual cubic-ish polyline)
  const points = [10, 24, 18, 32, 28, 44, 38, 52, 48, 60, 54, 70];
  const max = 80, w = 320, h = 88;
  const xs = points.map((_, i) => (i / (points.length - 1)) * w);
  const ys = points.map(v => h - (v / max) * h);
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <PPScreen>
      <PPHeader
        subtitle="Admin"
        title="Übersicht"
        leading={<Avatar initials="JH" gradient />}
        trailing={<Pill icon="calendar" bg="#fff" color={PP.ink}>Apr 2026</Pill>}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px' }}>
          <Card pad={16} radius={20}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Besuche · April</div>
                <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6, marginTop: 4 }}>342</div>
              </div>
              <Pill icon="arrow-up" bg="rgba(39,176,146,0.10)">+18% MoM</Pill>
            </div>
            <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 12 }}>
              <defs>
                <linearGradient id="adm-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PP.teal} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={PP.teal} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="adm-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={PP.teal} />
                  <stop offset="100%" stopColor={PP.sky} />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#adm-area)" />
              <path d={path} fill="none" stroke="url(#adm-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {xs.map((x, i) => i === xs.length - 1 && <circle key={i} cx={x} cy={ys[i]} r="4" fill="#fff" stroke={PP.teal} strokeWidth="2.5" />)}
            </svg>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
            <Card pad={14} radius={18}>
              <Stat value="84" label="Teile mit QR" delta={12} />
            </Card>
            <Card pad={14} radius={18}>
              <Stat value="156" label="Aktive Nutzer" delta={6} />
            </Card>
            <Card pad={14} radius={18}>
              <Stat value="412" label="Punkte vergeben" delta={22} />
            </Card>
            <Card pad={14} radius={18}>
              <Stat value="29" label="Badges erspielt" delta={-4} />
            </Card>
          </div>
        </div>

        <SectionTitle title="Beliebt diese Woche" action="Alles ansehen" />
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ITEMS.slice(0, 3).map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: '#fff', borderRadius: 14, boxShadow: '0 1px 2px rgba(26,46,44,0.04)' }}>
              <ImgSlot w={48} h={48} radius={12} label="" tone={it.tone} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: PP.ink }}>{it.t}</div>
                <div style={{ fontSize: 11, color: PP.ink2, marginTop: 1 }}>{it.s} · #{String(it.tag).padStart(3, '0')}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: PP.teal }}>{(8 - i) * 11}×</div>
            </div>
          ))}
        </div>

        <SectionTitle title="Schnellzugriff" />
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <QuickTile icon="megaphone" t="Aktion starten" />
          <QuickTile icon="medal"     t="Badges" />
          <QuickTile icon="bell"      t="Push senden" />
          <QuickTile icon="users"     t="Nutzer" />
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="home" />
    </PPScreen>
  );
}

function QuickTile({ icon, t }) {
  return (
    <div style={{ padding: 14, background: '#fff', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 2px rgba(26,46,44,0.04)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 11, background: PP.gradientSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={PP.teal} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: PP.ink }}>{t}</div>
    </div>
  );
}

// ─── Admin Badge-CRUD ─────────────────────────────────────
function AdminBadgeEditor() {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Admin · Badges"
        title="Badge bearbeiten"
        leading={<IconButton icon="chevron-left" />}
        trailing={<div style={{ fontSize: 13, color: PP.teal, fontWeight: 600, padding: '8px 6px' }}>Speichern</div>}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card pad={16} radius={20} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <BadgeMedallion icon="shirt" tier="gold" size={64} earned />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Vorschau</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: PP.ink, letterSpacing: -0.3, marginTop: 2 }}>Watt'n Sammler</div>
              <div style={{ fontSize: 12, color: PP.ink2, marginTop: 2 }}>Holer · Gold-Stufe</div>
            </div>
          </Card>

          <FormField label="Name" value="Watt'n Sammler" />
          <FormField label="Beschreibung" value="25 Teile mitgenommen" multiline />
          <div style={{ display: 'flex', gap: 10 }}>
            <FormField label="Kategorie" value="Holer" trailing="chevron-down" />
            <FormField label="Stufe" value="Gold" trailing="chevron-down" />
          </div>

          <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4 }}>Trigger-Bedingung</div>
          <Card pad={14} radius={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Pill bg="rgba(26,46,44,0.06)" color={PP.ink}>wenn</Pill>
              <Pill bg="rgba(39,176,146,0.10)">items_scanned</Pill>
              <Pill bg="rgba(26,46,44,0.06)" color={PP.ink}>≥</Pill>
              <Pill bg="rgba(232,169,59,0.14)" color={PP.warn}>25</Pill>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Pill bg="rgba(26,46,44,0.06)" color={PP.ink}>vergebe</Pill>
              <Pill bg="rgba(39,176,146,0.10)">+250 Pkt</Pill>
              <Pill bg="rgba(26,46,44,0.06)" color={PP.ink}>und</Pill>
              <Pill icon="bell" size="s">Push</Pill>
            </div>
          </Card>

          <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4 }}>Verfügbar</div>
          <Card pad={0}>
            <ToggleRowSimple t="Saison-Badge"   sub="Nur in einem Zeitraum" on={false} />
            <div style={{ borderTop: `1px solid ${PP.hairline}` }} />
            <ToggleRowSimple t="Sichtbar im Catalog" sub="Auch wenn noch nicht freigeschaltet" on={true} />
          </Card>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, padding: '0 4px' }}>
            <div style={{ fontSize: 11.5, color: PP.ink2 }}>15 Nutzer haben dieses Badge</div>
            <div style={{ fontSize: 12.5, color: PP.err, fontWeight: 600 }}>Badge löschen</div>
          </div>
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
    </PPScreen>
  );
}

function ToggleRowSimple({ t, sub, on }) {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: PP.ink }}>{t}</div>
        {sub && <div style={{ fontSize: 11.5, color: PP.ink2, marginTop: 2 }}>{sub}</div>}
      </div>
      <Switch on={on} />
    </div>
  );
}

// Reuse Switch from visitor screens (already on window)

// ─── Admin Push-Composer ───────────────────────────────────
function AdminPushCompose() {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Admin"
        title="Push senden"
        leading={<IconButton icon="chevron-left" />}
        trailing={<div style={{ fontSize: 13, color: PP.teal, fontWeight: 600, padding: '8px 6px' }}>Senden</div>}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Titel" value="Doppelte Punkte am Samstag" />
          <FormField label="Text"  value="Watt'n schönes Wochenende! Komm vorbei und kassiere x2 PlietschPunkte." multiline />

          <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4 }}>Empfänger</div>
          <Card pad={0}>
            <RadioRow t="Alle Besucher" sub="156 Personen" on />
            <div style={{ borderTop: `1px solid ${PP.hairline}` }} />
            <RadioRow t="Streak ≥ 2 Wochen" sub="42 Personen" />
            <div style={{ borderTop: `1px solid ${PP.hairline}` }} />
            <RadioRow t="Inaktiv ≥ 14 Tage"  sub="61 Personen" />
          </Card>

          <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4 }}>Vorschau</div>
          <div style={{
            background: 'linear-gradient(180deg, rgba(26,46,44,0.92), rgba(26,46,44,0.86))',
            borderRadius: 18, padding: 14, color: '#fff',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: PP.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="shirt" size={20} color="#fff" strokeWidth={1.7} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.7 }}>
                <span>Plietsche Plünn</span><span>jetzt</span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>Doppelte Punkte am Samstag</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1, lineHeight: 1.4 }}>Watt'n schönes Wochenende! Komm vorbei und kassiere x2 PlietschPunkte.</div>
            </div>
          </div>

          <PPButton icon="send">Jetzt senden · 156 Empfänger</PPButton>
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
    </PPScreen>
  );
}

function RadioRow({ t, sub, on }) {
  return (
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        border: on ? `2px solid ${PP.teal}` : `2px solid ${PP.hairline}`,
        background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {on && <div style={{ width: 10, height: 10, borderRadius: '50%', background: PP.teal }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: PP.ink }}>{t}</div>
        {sub && <div style={{ fontSize: 11.5, color: PP.ink2, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Admin Users ────────────────────────────────────────────
function AdminUsers({ tabVariant = 'glass' }) {
  const users = [
    { i: 'AS', n: 'Anna Schmidt',     pts: 1245, badge: 8, role: 'Besucher',     act: '2 h' },
    { i: 'TM', n: 'Tomma Möller',     pts: 980,  badge: 6, role: 'Besucher',     act: 'gestern' },
    { i: 'JH', n: 'Jörg Hansen',      pts: 0,    badge: 0, role: 'Admin',        act: 'jetzt' },
    { i: 'MV', n: 'Maren Voß',        pts: 0,    badge: 0, role: 'Ehrenamtlich', act: '5 min' },
    { i: 'PB', n: 'Petra Bäcker',     pts: 712,  badge: 4, role: 'Besucher',     act: '3 Tg' },
    { i: 'KK', n: 'Kalle Knopf',      pts: 510,  badge: 3, role: 'Besucher',     act: '1 W'  },
  ];
  const roleColor = { 'Admin': PP.warn, 'Ehrenamtlich': PP.sky, 'Besucher': PP.teal };
  return (
    <PPScreen>
      <PPHeader
        subtitle="Admin"
        title="Nutzer"
        leading={<IconButton icon="chevron-left" />}
        trailing={<IconButton icon="plus" />}
      />
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 2px rgba(26,46,44,0.04)' }}>
          <Icon name="search" size={18} color={PP.ink3} strokeWidth={2} />
          <div style={{ flex: 1, fontSize: 14, color: PP.ink3 }}>Name oder E-Mail …</div>
        </div>
      </div>
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((u, i) => (
            <div key={i} style={{ padding: 12, background: '#fff', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 2px rgba(26,46,44,0.04)' }}>
              <Avatar initials={u.i} gradient={u.role === 'Besucher'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: PP.ink }}>{u.n}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <Pill size="s" bg={`${roleColor[u.role]}1a`} color={roleColor[u.role]}>{u.role}</Pill>
                  {u.pts > 0 && <Pill icon="coins" size="s" bg="rgba(26,46,44,0.04)" color={PP.ink2}>{u.pts}</Pill>}
                  {u.badge > 0 && <Pill icon="medal" size="s" bg="rgba(26,46,44,0.04)" color={PP.ink2}>{u.badge}</Pill>}
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: PP.ink3 }}>{u.act}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="home" />
    </PPScreen>
  );
}

// ─── Admin Store-Info Editor ───────────────────────────────
function AdminStoreEdit() {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Admin"
        title="Laden bearbeiten"
        leading={<IconButton icon="chevron-left" />}
        trailing={<div style={{ fontSize: 13, color: PP.teal, fontWeight: 600, padding: '8px 6px' }}>Speichern</div>}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <ImgSlot h={120} radius={18} label="Cover" tone="sand" />
            <div style={{ position: 'absolute', right: 10, bottom: 10 }}>
              <Pill icon="image" bg="rgba(255,255,255,0.95)" color={PP.ink} size="s">Foto ändern</Pill>
            </div>
          </div>
          <FormField label="Name" value="Plietsche Plünn" />
          <FormField label="Adresse" value="Kirchstraße 12, 22529 Hamburg" />
          <FormField label="Telefon" value="040 12 34 56" />

          <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4 }}>Öffnungszeiten</div>
          <Card pad={0}>
            {[
              ['Mo', '–'],
              ['Di', '15 – 18 Uhr'],
              ['Mi', '–'],
              ['Do', '10 – 13 Uhr'],
              ['Fr', '15 – 18 Uhr'],
              ['Sa', '10 – 14 Uhr'],
              ['So', '–'],
            ].map(([d, h], i) => (
              <div key={d} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: i === 0 ? 'none' : `1px solid ${PP.hairline}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: PP.ink, width: 32 }}>{d}</div>
                <div style={{ flex: 1, fontSize: 13, color: h === '–' ? PP.ink3 : PP.ink }}>{h}</div>
                <Icon name="edit" size={16} color={PP.ink3} strokeWidth={1.8} />
              </div>
            ))}
          </Card>
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
    </PPScreen>
  );
}

Object.assign(window, {
  VolunteerItems, VolunteerItemForm,
  AdminDashboard, AdminBadgeEditor, AdminPushCompose, AdminUsers, AdminStoreEdit,
});
