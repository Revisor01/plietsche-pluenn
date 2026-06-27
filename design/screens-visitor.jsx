// screens-visitor.jsx — Plietsche Plünn visitor-facing screens
// Onboarding, Auth, Home (3 layouts), Check-In, Scan, Badges (3 layouts),
// Punkte-Historie, Settings, Push-Settings, Store-Info.

// Sample data ─────────────────────────────────────────────────
const SHOWCASE = [
  { label: 'Wollpullover, S',  tone: 'teal' },
  { label: 'Jeansjacke, M',    tone: 'sky'  },
  { label: 'Sommerkleid, 38',  tone: 'sand' },
  { label: 'Kinder-Hose, 116', tone: 'ink'  },
];
const BADGES = [
  { id: 'b1', name: 'Watt\'n Auftakt',   tier: 'bronze', icon: 'sparkles', progress: 1,    desc: 'Erster Besuch',         unlocked: true,  date: '12. März' },
  { id: 'b2', name: 'Stammkundschaft',   tier: 'silver', icon: 'heart',    progress: 1,    desc: '10 Besuche',            unlocked: true,  date: '04. April' },
  { id: 'b3', name: 'Watt\'n Sammler',   tier: 'gold',   icon: 'shirt',    progress: 0.62, desc: '25 Teile mitgenommen',  unlocked: false, value: '15/25' },
  { id: 'b4', name: 'Wochen-Treue',      tier: 'silver', icon: 'flame',    progress: 0.75, desc: '4 Wochen in Folge',     unlocked: false, value: '3/4' },
  { id: 'b5', name: 'Fröhjohrs-Schiet',  tier: 'gold',   icon: 'leaf',     progress: 0.33, desc: 'Frühlings-Saison',      unlocked: false, value: '1/3 Aktionen' },
  { id: 'b6', name: 'Moin-Macher',       tier: 'bronze', icon: 'door',     progress: 1,    desc: '5 Check-Ins',           unlocked: true,  date: '21. April' },
  { id: 'b7', name: 'Watt-Forscher',     tier: 'gold',   icon: 'compass',  progress: 0.20, desc: '50 Teile entdeckt',     unlocked: false, value: '10/50' },
  { id: 'b8', name: 'Adventslicht',      tier: 'gold',   icon: 'star',     progress: 0,    desc: 'Winter-Saison',         unlocked: false, value: 'ab 1.12.' },
];
const HISTORY = [
  { day: 'Heute',           items: [
    { t: 'Wollpullover, S',  pts: '+30', kind: 'scan', time: '14:22' },
    { t: 'Check-In im Laden',pts: '+10', kind: 'door', time: '14:18' },
  ]},
  { day: 'Gestern',         items: [
    { t: 'Streak-Bonus · Woche 3', pts: '+25', kind: 'flame', time: '17:04' },
    { t: 'Jeansjacke, M',    pts: '+30', kind: 'scan', time: '16:51' },
    { t: 'Check-In im Laden',pts: '+10', kind: 'door', time: '16:44' },
  ]},
  { day: '21. April',       items: [
    { t: 'Badge: Moin-Macher', pts: '+50', kind: 'medal', time: '12:09' },
    { t: 'Sommerkleid, 38',  pts: '+30', kind: 'scan', time: '12:01' },
    { t: 'Check-In im Laden',pts: '+10', kind: 'door', time: '11:55' },
  ]},
];

// ─── Onboarding ────────────────────────────────────────────
function OnboardingWelcome() {
  return (
    <PPScreen padTop={64}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, textAlign: 'center' }}>
          <div style={{
            width: 132, height: 132, borderRadius: 999,
            background: PP.gradient, position: 'relative',
            boxShadow: '0 20px 50px rgba(39,176,146,0.30), inset 0 -10px 30px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="shirt" size={62} color="#fff" strokeWidth={1.7} />
            <div style={{ position: 'absolute', inset: 4, borderRadius: 999, border: '1.5px solid rgba(255,255,255,0.4)' }} />
          </div>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.6, color: PP.ink }}>Moin!</div>
            <div style={{ fontSize: 14, color: PP.ink2, marginTop: 8, lineHeight: 1.5, maxWidth: 280 }}>
              Schön, dass du da bist. Plietsche Plünn ist der Kleidertausch-Laden deiner Kirchengemeinde — und das hier ist deine App dazu.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
          <PPButton iconRight="arrow-right">Los geht's</PPButton>
          <PPButton variant="ghost" size="m">Schon dabei? Anmelden</PPButton>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', paddingTop: 14 }}>
          <Dot active /><Dot /><Dot /><Dot />
        </div>
      </div>
    </PPScreen>
  );
}
function Dot({ active }) {
  return <div style={{ width: active ? 18 : 6, height: 6, borderRadius: 4, background: active ? PP.teal : 'rgba(26,46,44,0.15)', transition: 'all .2s' }} />;
}

function OnboardingHow() {
  const steps = [
    { icon: 'door',   t: 'Komm vorbei',         d: 'Bei jedem Besuch checkst du kurz an der Tür ein.' },
    { icon: 'qr-scan',t: 'Stöber & nimm mit',   d: 'Manche Teile haben einen QR-Code. Scan = Punkte.' },
    { icon: 'medal',  t: 'Sammel PlietschPunkte', d: 'Watt\'n schönes Hobby. Mit Badges, Streaks, Spaß.' },
  ];
  return (
    <PPScreen padTop={64}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, color: PP.ink }}>So funktioniert's</div>
          <div style={{ fontSize: 13, color: PP.ink2, marginTop: 4 }}>Drei Schritte, kein Schnickschnack.</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: PP.gradientSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(39,176,146,0.18)',
              }}>
                <Icon name={s.icon} size={26} color={PP.teal} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: PP.ink, letterSpacing: -0.2 }}>{s.t}</div>
                <div style={{ fontSize: 13, color: PP.ink2, marginTop: 2, lineHeight: 1.4 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PPButton iconRight="arrow-right">Weiter</PPButton>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', paddingTop: 14 }}>
          <Dot /><Dot active /><Dot /><Dot />
        </div>
      </div>
    </PPScreen>
  );
}

function OnboardingPermissions() {
  return (
    <PPScreen padTop={64}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4, color: PP.ink }}>Zwei kleine Bitten</div>
          <div style={{ fontSize: 13, color: PP.ink2, marginTop: 4 }}>Beides nur, wenn du willst.</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          <Card pad={16} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: PP.gradientSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="location" size={22} color={PP.teal} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: PP.ink }}>Standort beim Check-In</div>
              <div style={{ fontSize: 12.5, color: PP.ink2, marginTop: 3, lineHeight: 1.4 }}>Wir prüfen nur, ob du wirklich im Laden bist. Sonst nichts.</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <Pill icon="check" color={PP.teal}>Erlaubt</Pill>
              </div>
            </div>
          </Card>
          <Card pad={16} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: PP.gradientSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="bell" size={22} color={PP.teal} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: PP.ink }}>Sanfte Erinnerungen</div>
              <div style={{ fontSize: 12.5, color: PP.ink2, marginTop: 3, lineHeight: 1.4 }}>Freitags ein freundlicher Schubs bevor dein Streak reißt — und Bescheid bei Aktionen.</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Später</Pill>
              </div>
            </div>
          </Card>
        </div>
        <PPButton iconRight="arrow-right">Fertig</PPButton>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', paddingTop: 14 }}>
          <Dot /><Dot /><Dot active /><Dot />
        </div>
      </div>
    </PPScreen>
  );
}

// ─── Auth (Login/Register) ──────────────────────────────────
function AuthLogin() {
  return (
    <PPScreen padTop={64}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 18, marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: PP.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(39,176,146,0.32)',
          }}>
            <Icon name="shirt" size={32} color="#fff" strokeWidth={1.8} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 14, letterSpacing: -0.4 }}>Tach auch!</div>
          <div style={{ fontSize: 13, color: PP.ink2, marginTop: 4 }}>Melde dich an, dann geht's los.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field icon="mail"  label="E-Mail"   value="anna@example.de" />
          <Field icon="lock"  label="Passwort" value="••••••••••" trailingIcon="eye-off" />
          <div style={{ textAlign: 'right', fontSize: 12.5, color: PP.teal, fontWeight: 500, marginTop: -2 }}>Passwort vergessen?</div>
        </div>
        <div style={{ marginTop: 22 }}>
          <PPButton>Anmelden</PPButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: PP.hairline }} />
          <span style={{ fontSize: 11, color: PP.ink3, letterSpacing: 0.4, textTransform: 'uppercase' }}>oder</span>
          <div style={{ flex: 1, height: 1, background: PP.hairline }} />
        </div>
        <PPButton variant="secondary">Neu hier? Registrieren</PPButton>
      </div>
    </PPScreen>
  );
}

function Field({ icon, label, value, trailingIcon }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(26,46,44,0.04)',
      border: '1px solid rgba(26,46,44,0.06)',
    }}>
      {icon && <Icon name={icon} size={18} color={PP.ink3} strokeWidth={1.8} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10.5, color: PP.ink3, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 14.5, color: PP.ink, fontWeight: 500, marginTop: 1 }}>{value}</div>
      </div>
      {trailingIcon && <Icon name={trailingIcon} size={18} color={PP.ink3} strokeWidth={1.8} />}
    </div>
  );
}

// ─── HOME variants ──────────────────────────────────────────
// V1 — Cozy Card: hero rounded card with gradient ring of points
function HomeCozy({ tabVariant = 'glass' }) {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Plietsche Plünn"
        title="Moin, Anna!"
        leading={<Avatar initials="AS" gradient />}
        trailing={<IconButton icon="bell" badge />}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px' }}>
          <Card pad={22} radius={26} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <GradientRing size={120} stroke={11} progress={0.66}>
              <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase' }}>Punkte</div>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.8, color: PP.ink, lineHeight: 1 }}>1.245</div>
              <div style={{ fontSize: 11, color: PP.ink2, marginTop: 2 }}>noch 255 bis Gold</div>
            </GradientRing>
            <div style={{ flex: 1 }}>
              <Pill icon="flame" color={PP.warn} bg="rgba(232,169,59,0.14)">3 Wochen Streak</Pill>
              <div style={{ fontSize: 13.5, color: PP.ink, marginTop: 12, lineHeight: 1.45 }}>
                Watt'n Lauf! Komm bis <b>Freitag</b> vorbei, dann hältst du dein Streak.
              </div>
            </div>
          </Card>
        </div>

        <CampaignBanner />

        <SectionTitle title="Schaufenster" action="Alles ansehen" />
        <ShowcaseRow />

        <SectionTitle title="Watt's neu" />
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ActivityRow icon="medal" tone="gold" t="Badge freigeschaltet: Moin-Macher" sub="Vor 2 Tagen · +50 Punkte" />
          <ActivityRow icon="shirt" tone="teal" t="Wollpullover mitgenommen" sub="Vor 3 Tagen · +30 Punkte" />
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="home" />
    </PPScreen>
  );
}

// V2 — Layered Stack: small header card + ribbon strip
function HomeLayered({ tabVariant = 'glass' }) {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Heute, 14:32"
        title="Moin, Anna!"
        leading={<Avatar initials="AS" gradient />}
        trailing={<IconButton icon="bell" badge />}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <Card pad={14} style={{ flex: 1.4 }}>
              <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase' }}>PlietschPunkte</div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, color: PP.ink, lineHeight: 1.05, marginTop: 4 }}>1.245</div>
              <div style={{ marginTop: 10 }}>
                <ProgressBar value={0.66} height={6} />
                <div style={{ fontSize: 10.5, color: PP.ink2, marginTop: 6 }}>255 bis nächster Stufe</div>
              </div>
            </Card>
            <Card pad={14} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 500, letterSpacing: 0.3, textTransform: 'uppercase' }}>Streak</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: PP.warn, lineHeight: 1, letterSpacing: -0.6 }}>3</div>
                <div style={{ fontSize: 11.5, color: PP.ink2, paddingBottom: 4 }}>Wochen</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,1,1,0].map((on, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: on ? PP.warn : 'rgba(26,46,44,0.10)' }} />
                ))}
              </div>
            </Card>
          </div>
          <CampaignCardInline />
        </div>

        <SectionTitle title="Schaufenster" action="Alles ansehen" />
        <ShowcaseRow />

        <SectionTitle title="Nächste Badge" />
        <div style={{ padding: '0 20px' }}>
          <Card pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BadgeMedallion icon="shirt" tier="gold" size={48} earned={false} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: PP.ink }}>Watt'n Sammler</div>
              <div style={{ fontSize: 11.5, color: PP.ink2, marginBottom: 6 }}>15 von 25 Teilen</div>
              <ProgressBar value={0.62} tier="gold" />
            </div>
          </Card>
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="home" />
    </PPScreen>
  );
}

// V3 — Hero Gradient: full-bleed gradient hero, content overlaps below
function HomeHero({ tabVariant = 'glass' }) {
  return (
    <PPScreen padTop={0}>
      {/* Gradient hero behind status bar area */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 280,
        background: PP.gradient,
        borderBottomLeftRadius: 34, borderBottomRightRadius: 34,
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0, opacity: 0.25,
          background: 'radial-gradient(circle at 85% 25%, rgba(255,255,255,0.6) 0%, transparent 45%), radial-gradient(circle at 5% 90%, rgba(255,255,255,0.3) 0%, transparent 35%)',
        }} />
      </div>
      <div style={{ position: 'relative', paddingTop: 64 }}>
        <PPHeader
          subtitle={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Plietsche Plünn</span>}
          title={<span style={{ color: '#fff' }}>Moin, Anna!</span>}
          leading={<Avatar initials="AS" />}
          trailing={<IconButton icon="bell" badge dark />}
        />
        <div style={{ padding: '6px 20px 0', color: '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.2, textTransform: 'uppercase', fontWeight: 600 }}>Deine Punkte</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -1.4, lineHeight: 1 }}>1.245</div>
            <Pill icon="flame" bg="rgba(255,255,255,0.22)" color="#fff">3 Wochen</Pill>
          </div>
        </div>
        <ScrollArea>
          <div style={{ padding: '24px 20px 0' }}>
            <Card pad={16} radius={20} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(232,169,59,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="megaphone" size={22} color={PP.warn} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Doppelte Punkte am Samstag</div>
                <div style={{ fontSize: 11.5, color: PP.ink2, marginTop: 2 }}>Frühlingsaktion · 25. – 27. April</div>
              </div>
              <Icon name="chevron-right" size={18} color={PP.ink3} />
            </Card>
          </div>
          <SectionTitle title="Schaufenster" action="Alles ansehen" />
          <ShowcaseRow />
          <SectionTitle title="Watt's neu" />
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ActivityRow icon="medal" tone="gold" t="Badge: Moin-Macher" sub="Vor 2 Tagen · +50" />
            <ActivityRow icon="shirt" tone="teal" t="Wollpullover, S" sub="Vor 3 Tagen · +30" />
          </div>
          <div style={{ height: 24 }} />
        </ScrollArea>
      </div>
      <TabBar variant={tabVariant} active="home" />
    </PPScreen>
  );
}

// ─── shared home bits ───────────────────────────────────────
function CampaignBanner() {
  return (
    <div style={{ padding: '14px 20px 0' }}>
      <GradientCard pad={16} radius={20}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="sparkles" size={22} color="#fff" strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Frühling × Doppelpunkte</div>
            <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 1 }}>25. – 27. April · alles ×2</div>
          </div>
          <Icon name="chevron-right" size={18} color="#fff" />
        </div>
      </GradientCard>
    </div>
  );
}
function CampaignCardInline() {
  return (
    <Card pad={14} style={{ display: 'flex', gap: 12, alignItems: 'center', background: PP.sand, boxShadow: 'none', border: '1px solid rgba(180,150,90,0.18)' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="sparkles" size={22} color={PP.warn} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: PP.ink }}>Doppelte Punkte am Samstag</div>
        <div style={{ fontSize: 11.5, color: PP.ink2, marginTop: 1 }}>Frühlingsaktion · 25. – 27. April</div>
      </div>
      <Icon name="chevron-right" size={18} color={PP.ink3} />
    </Card>
  );
}

function ShowcaseRow() {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'hidden', padding: '0 20px', paddingBottom: 4 }}>
      {SHOWCASE.map((s, i) => (
        <div key={i} style={{ width: 132, flexShrink: 0 }}>
          <ImgSlot h={158} label={s.label} tone={s.tone} radius={18} />
          <div style={{ fontSize: 12.5, fontWeight: 600, color: PP.ink, marginTop: 8 }}>{s.label.split(',')[0]}</div>
          <div style={{ fontSize: 11, color: PP.ink2, marginTop: 1 }}>{s.label.split(',')[1]?.trim()}</div>
        </div>
      ))}
    </div>
  );
}

function ActivityRow({ icon, tone = 'teal', t, sub }) {
  const colors = { teal: PP.teal, gold: PP.gold, sky: PP.sky };
  const c = colors[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff', borderRadius: 16, boxShadow: '0 1px 2px rgba(26,46,44,0.04)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: `${c}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={c} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: PP.ink }}>{t}</div>
        <div style={{ fontSize: 11.5, color: PP.ink2, marginTop: 1 }}>{sub}</div>
      </div>
    </div>
  );
}

function IconButton({ icon, badge, dark = false }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 14,
      background: dark ? 'rgba(255,255,255,0.18)' : '#fff',
      boxShadow: dark ? 'none' : '0 1px 2px rgba(26,46,44,0.04)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      <Icon name={icon} size={20} color={dark ? '#fff' : PP.ink} strokeWidth={1.8} />
      {badge && <div style={{ position: 'absolute', top: 9, right: 11, width: 7, height: 7, borderRadius: 4, background: PP.warn, border: '1.5px solid #fff' }} />}
    </div>
  );
}

function ScrollArea({ children }) {
  return <div style={{ flex: 1, overflow: 'hidden' }}>{children}</div>;
}

// ─── Check-In ───────────────────────────────────────────────
function CheckInScreen({ tabVariant = 'glass' }) {
  return (
    <PPScreen padTop={0} padBottom={0} bg="#0e1c1b">
      {/* Camera viewfinder */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 38%, #1a3735 0%, #0a1716 80%)',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 6px)',
        }} />
        {/* viewfinder corners */}
        <div style={{ position: 'absolute', top: 220, left: '50%', transform: 'translateX(-50%)', width: 240, height: 240 }}>
          {['tl','tr','bl','br'].map((corner) => {
            const pos = {
              tl: { top: 0, left: 0 },
              tr: { top: 0, right: 0 },
              bl: { bottom: 0, left: 0 },
              br: { bottom: 0, right: 0 },
            }[corner];
            return (
              <div key={corner} style={{
                position: 'absolute', ...pos, width: 28, height: 28,
                borderTop:    corner[0] === 't' ? '3px solid #fff' : 'none',
                borderBottom: corner[0] === 'b' ? '3px solid #fff' : 'none',
                borderLeft:   corner[1] === 'l' ? '3px solid #fff' : 'none',
                borderRight:  corner[1] === 'r' ? '3px solid #fff' : 'none',
                borderTopLeftRadius:     corner === 'tl' ? 14 : 0,
                borderTopRightRadius:    corner === 'tr' ? 14 : 0,
                borderBottomLeftRadius:  corner === 'bl' ? 14 : 0,
                borderBottomRightRadius: corner === 'br' ? 14 : 0,
              }} />
            );
          })}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="qr" size={68} color="rgba(255,255,255,0.25)" strokeWidth={1.4} />
          </div>
        </div>
      </div>
      {/* top: title + close */}
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>Check-In</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.4, marginTop: 2 }}>Tür-QR scannen</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color="#fff" strokeWidth={2} />
        </div>
      </div>
      {/* GPS pill */}
      <div style={{ position: 'absolute', top: 178, left: '50%', transform: 'translateX(-50%)' }}>
        <Pill icon="location" bg="rgba(39,176,146,0.22)" color={PP.mint} style={{ backdropFilter: 'blur(12px)' }}>Im Laden · 12 m</Pill>
      </div>
      {/* bottom sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: PP.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '8px 20px 26px',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(26,46,44,0.16)', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 11, color: PP.ink2, letterSpacing: 0.3, textTransform: 'uppercase', fontWeight: 600 }}>Watt mitgenommen?</div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Stepper value={2} />
          <div style={{ flex: 1, fontSize: 11.5, color: PP.ink2, lineHeight: 1.4 }}>
            Wenn ein Teil einen QR hat, kannst du es danach noch einzeln scannen.
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <PPButton icon="check" iconRight={null}>Einchecken</PPButton>
        </div>
      </div>
    </PPScreen>
  );
}

function Stepper({ value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 16, padding: '6px 8px', border: '1px solid rgba(26,46,44,0.06)' }}>
      <CircleBtn icon="minus" />
      <div style={{ fontSize: 24, fontWeight: 700, color: PP.ink, minWidth: 28, textAlign: 'center', letterSpacing: -0.4 }}>{value}</div>
      <CircleBtn icon="plus" primary />
    </div>
  );
}
function CircleBtn({ icon, primary }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 12,
      background: primary ? PP.gradient : 'rgba(26,46,44,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: primary ? '0 4px 10px rgba(39,176,146,0.25)' : 'none',
    }}>
      <Icon name={icon} size={18} color={primary ? '#fff' : PP.ink} strokeWidth={2.4} />
    </div>
  );
}

// ─── Item Scan ──────────────────────────────────────────────
function ScanScreen() {
  return (
    <PPScreen padTop={0} padBottom={0} bg="#0e1c1b">
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 38%, #1f3a37 0%, #0b1716 80%)',
      }} />
      {/* item preview hero */}
      <div style={{ position: 'absolute', top: 110, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200 }}>
        <ImgSlot h={200} w={200} tone="teal" radius={24} label="Wollpullover, S" />
        <div style={{ position: 'absolute', inset: -8, border: '2px solid rgba(255,255,255,0.55)', borderRadius: 28 }} />
      </div>
      {/* top */}
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>Erkannt</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.4, marginTop: 2 }}>Wollpullover</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={20} color="#fff" strokeWidth={2} />
        </div>
      </div>
      {/* bottom sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: PP.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '8px 20px 26px',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(26,46,44,0.16)', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: PP.ink, letterSpacing: -0.3 }}>Wollpullover, Größe S</div>
            <div style={{ fontSize: 12.5, color: PP.ink2, marginTop: 2 }}>Damen · Oberteil · grün-meliert</div>
          </div>
          <Pill icon="coins" bg="rgba(39,176,146,0.14)">+30</Pill>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Gut erhalten</Pill>
          <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Tag 4</Pill>
        </div>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PPButton icon="check">Mitnehmen</PPButton>
          <PPButton variant="ghost" size="m">Doch nicht — zurück</PPButton>
        </div>
      </div>
      <Toast title="Tach! +30 Punkte" subtitle="Watt'n schönes Stück." />
    </PPScreen>
  );
}

// ─── Badges (3 variants) ────────────────────────────────────
function BadgeMedallion({ icon, tier = 'gold', size = 56, earned = true }) {
  const fills = { gold: PP.gold, silver: PP.silver, bronze: PP.bronze };
  const c = fills[tier];
  const bg = earned ? c : 'rgba(26,46,44,0.06)';
  const inner = earned ? '#fff' : PP.ink3;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: earned ? `0 8px 20px ${c}40, inset 0 -3px 6px rgba(0,0,0,0.1)` : 'inset 0 0 0 1px rgba(26,46,44,0.06)',
      position: 'relative',
    }}>
      <Icon name={icon} size={size * 0.45} color={inner} strokeWidth={1.7} />
      {earned && <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.4)' }} />}
    </div>
  );
}

function BadgesGrid({ tabVariant = 'glass' }) {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Sammlung"
        title="Watt'n Schatz"
        leading={<IconButton icon="chevron-left" />}
        trailing={<IconButton icon="filter" />}
      />
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6, overflowX: 'hidden' }}>
        <Pill style={{ background: PP.gradient, color: '#fff' }}>Alle · 8</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Bringer</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Holer</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Saison</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Streak</Pill>
      </div>
      <ScrollArea>
        <div style={{ padding: '4px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {BADGES.map(b => (
            <div key={b.id} style={{
              background: '#fff', borderRadius: 18, padding: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              boxShadow: '0 1px 2px rgba(26,46,44,0.04)',
              opacity: b.unlocked ? 1 : 0.95,
            }}>
              <BadgeMedallion icon={b.icon} tier={b.tier} size={52} earned={b.unlocked} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: PP.ink, lineHeight: 1.2 }}>{b.name}</div>
                <div style={{ fontSize: 10, color: PP.ink2, marginTop: 2 }}>{b.unlocked ? b.date : b.value || b.desc}</div>
              </div>
              {!b.unlocked && (
                <div style={{ width: '100%', marginTop: 2 }}>
                  <ProgressBar value={b.progress} height={4} tier={b.tier} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="badges" />
    </PPScreen>
  );
}

function BadgesList({ tabVariant = 'glass' }) {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Sammlung"
        title="Watt'n Schatz"
        leading={<IconButton icon="chevron-left" />}
        trailing={<IconButton icon="filter" />}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BADGES.map(b => (
            <div key={b.id} style={{
              background: '#fff', borderRadius: 18, padding: '14px 14px 14px 14px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 1px 2px rgba(26,46,44,0.04)',
            }}>
              <BadgeMedallion icon={b.icon} tier={b.tier} size={48} earned={b.unlocked} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: PP.ink, letterSpacing: -0.1 }}>{b.name}</div>
                  <div style={{ fontSize: 10.5, color: PP.ink3, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{b.tier}</div>
                </div>
                <div style={{ fontSize: 11.5, color: PP.ink2, marginTop: 2, marginBottom: 8 }}>{b.desc}{b.unlocked && ` · ${b.date}`}</div>
                {b.unlocked ? (
                  <Pill icon="check" bg="rgba(39,176,146,0.10)" size="s">Freigeschaltet</Pill>
                ) : (
                  <div>
                    <ProgressBar value={b.progress} height={5} tier={b.tier} />
                    <div style={{ fontSize: 10.5, color: PP.ink2, marginTop: 4 }}>{b.value}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="badges" />
    </PPScreen>
  );
}

function BadgesTimeline({ tabVariant = 'glass' }) {
  // group by status
  const groups = [
    { label: 'Freigeschaltet · 3', items: BADGES.filter(b => b.unlocked) },
    { label: 'In Arbeit · 4',      items: BADGES.filter(b => !b.unlocked && b.progress > 0) },
    { label: 'Noch im Kasten · 1', items: BADGES.filter(b => !b.unlocked && b.progress === 0) },
  ];
  return (
    <PPScreen>
      <PPHeader
        subtitle="Sammlung"
        title="Watt'n Schatz"
        leading={<IconButton icon="chevron-left" />}
        trailing={<IconButton icon="filter" />}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.map((g, gi) => (
            <div key={gi}>
              <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10 }}>{g.label}</div>
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', top: 14, bottom: 14, left: 10, width: 2, background: 'linear-gradient(180deg, rgba(39,176,146,0.25), rgba(128,180,226,0.25))', borderRadius: 1 }} />
                {g.items.map((b, i) => (
                  <div key={b.id} style={{ position: 'relative', marginBottom: 10, display: 'flex', gap: 12 }}>
                    <div style={{
                      position: 'absolute', left: -23, top: 14,
                      width: 22, height: 22, borderRadius: '50%',
                      background: b.unlocked ? PP.gradient : '#fff',
                      border: b.unlocked ? 'none' : `2px solid ${PP.hairline}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {b.unlocked && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <Card pad={12} style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center' }}>
                      <BadgeMedallion icon={b.icon} tier={b.tier} size={40} earned={b.unlocked} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: PP.ink, letterSpacing: -0.1 }}>{b.name}</div>
                        <div style={{ fontSize: 11, color: PP.ink2, marginTop: 1 }}>{b.unlocked ? b.date : b.value || b.desc}</div>
                        {!b.unlocked && b.progress > 0 && <div style={{ marginTop: 6 }}><ProgressBar value={b.progress} height={4} tier={b.tier} /></div>}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="badges" />
    </PPScreen>
  );
}

// ─── Punkte-Historie ────────────────────────────────────────
function PointsHistory({ tabVariant = 'glass' }) {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Historie"
        title="Deine Punkte"
        leading={<IconButton icon="chevron-left" />}
        trailing={<IconButton icon="filter" />}
      />
      <div style={{ padding: '0 20px 14px' }}>
        <Card pad={16} radius={20}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>Gesamt</div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, color: PP.ink, marginTop: 2, lineHeight: 1 }}>1.245</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Pill icon="arrow-up" bg="rgba(39,176,146,0.10)">+155 diese Woche</Pill>
              <div style={{ fontSize: 11, color: PP.ink2, marginTop: 4 }}>Stufe Silber</div>
            </div>
          </div>
          {/* mini bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 14, height: 38 }}>
            {[14, 22, 10, 30, 18, 36, 25].map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', height: v, background: i === 5 ? PP.gradient : 'rgba(39,176,146,0.18)', borderRadius: 4 }} />
                <div style={{ fontSize: 9, color: PP.ink3 }}>{['M','D','M','D','F','S','S'][i]}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div style={{ padding: '0 20px 10px', display: 'flex', gap: 6, overflowX: 'hidden' }}>
        <Pill style={{ background: PP.gradient, color: '#fff' }}>Alle</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Check-Ins</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Teile</Pill>
        <Pill bg="rgba(26,46,44,0.06)" color={PP.ink2}>Badges</Pill>
      </div>
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {HISTORY.map((g, i) => (
            <div key={i}>
              <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 }}>{g.day}</div>
              <Card pad={0} style={{ overflow: 'hidden' }}>
                {g.items.map((it, j) => {
                  const iconColor = it.kind === 'medal' ? PP.gold : it.kind === 'flame' ? PP.warn : it.kind === 'door' ? PP.sky : PP.teal;
                  return (
                    <div key={j} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, borderTop: j === 0 ? 'none' : `1px solid ${PP.hairline}` }}>
                      <div style={{ width: 34, height: 34, borderRadius: 11, background: `${iconColor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={it.kind === 'medal' ? 'medal' : it.kind === 'flame' ? 'flame' : it.kind === 'door' ? 'door' : 'shirt'} size={18} color={iconColor} strokeWidth={1.8} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: PP.ink }}>{it.t}</div>
                        <div style={{ fontSize: 11, color: PP.ink2, marginTop: 1 }}>{it.time}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: PP.teal, letterSpacing: -0.2 }}>{it.pts}</div>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
      <TabBar variant={tabVariant} active="points" />
    </PPScreen>
  );
}

// ─── Push Settings ──────────────────────────────────────────
function PushSettings() {
  const ToggleRow = ({ icon, t, sub, on }) => (
    <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(39,176,146,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={PP.teal} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: PP.ink }}>{t}</div>
        <div style={{ fontSize: 11.5, color: PP.ink2, marginTop: 2, lineHeight: 1.4 }}>{sub}</div>
      </div>
      <Switch on={on} />
    </div>
  );
  return (
    <PPScreen>
      <PPHeader
        subtitle="Einstellungen"
        title="Benachrichtigungen"
        leading={<IconButton icon="chevron-left" />}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <ToggleRow icon="flame"    t="Streak-Erinnerung"   sub="Freitags, wenn dein Streak zu reißen droht." on={true} />
            <div style={{ borderTop: `1px solid ${PP.hairline}` }} />
            <ToggleRow icon="megaphone" t="Aktionen & Kampagnen" sub="Doppelpunkte, Saison-Aktionen." on={true} />
            <div style={{ borderTop: `1px solid ${PP.hairline}` }} />
            <ToggleRow icon="medal"    t="Neue Badges"         sub="Bei einer Freischaltung." on={true} />
            <div style={{ borderTop: `1px solid ${PP.hairline}` }} />
            <ToggleRow icon="bell"     t="Sonstiges aus dem Laden" sub="Selten — nur was wichtig ist." on={false} />
          </Card>
          <div style={{ fontSize: 11.5, color: PP.ink2, padding: '0 6px', lineHeight: 1.5 }}>
            Wir benachrichtigen so wenig wie möglich. Versprochen. Watt zu viel ist, ist zu viel.
          </div>
        </div>
      </ScrollArea>
    </PPScreen>
  );
}

function Switch({ on }) {
  return (
    <div style={{ width: 46, height: 28, borderRadius: 999, background: on ? PP.teal : 'rgba(26,46,44,0.15)', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.18)', transition: 'left .15s',
      }} />
    </div>
  );
}

// ─── Store-Info (visitor view) ─────────────────────────────
function StoreInfo() {
  return (
    <PPScreen>
      <PPHeader
        subtitle="Über"
        title="Der Laden"
        leading={<IconButton icon="chevron-left" />}
      />
      <ScrollArea>
        <div style={{ padding: '0 20px' }}>
          <ImgSlot h={150} radius={20} label="Foto Ladenfront" tone="sand" />
        </div>
        <SectionTitle title="Öffnungszeiten" />
        <div style={{ padding: '0 20px' }}>
          <Card pad={0}>
            {[
              ['Di', '15 – 18 Uhr'],
              ['Mi', '–'],
              ['Do', '10 – 13 Uhr'],
              ['Fr', '15 – 18 Uhr'],
              ['Sa', '10 – 14 Uhr'],
            ].map(([d, h], i, arr) => (
              <div key={d} style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderTop: i === 0 ? 'none' : `1px solid ${PP.hairline}` }}>
                <div style={{ fontSize: 13.5, fontWeight: d === 'Di' ? 600 : 500, color: PP.ink }}>{d}</div>
                <div style={{ fontSize: 13, color: d === 'Di' ? PP.teal : PP.ink2, fontWeight: d === 'Di' ? 600 : 400 }}>{h}</div>
              </div>
            ))}
          </Card>
        </div>
        <SectionTitle title="Wo du uns findest" />
        <div style={{ padding: '0 20px' }}>
          <Card pad={14} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(39,176,146,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="map-pin" size={20} color={PP.teal} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: PP.ink }}>Kirchstraße 12</div>
              <div style={{ fontSize: 12.5, color: PP.ink2 }}>22529 Hamburg-Lokstedt</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <Pill icon="map-pin" size="s">Route</Pill>
                <Pill icon="phone" bg="rgba(26,46,44,0.06)" color={PP.ink} size="s">040 12 34 56</Pill>
              </div>
            </div>
          </Card>
        </div>
        <div style={{ height: 24 }} />
      </ScrollArea>
    </PPScreen>
  );
}

Object.assign(window, {
  OnboardingWelcome, OnboardingHow, OnboardingPermissions,
  AuthLogin, HomeCozy, HomeLayered, HomeHero,
  CheckInScreen, ScanScreen,
  BadgesGrid, BadgesList, BadgesTimeline, BadgeMedallion,
  PointsHistory, PushSettings, StoreInfo,
});
