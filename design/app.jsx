// app.jsx — Plietsche Plünn design canvas entry point
// Hosts all screens in iOS + Android frames + tweak panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "homeVariant": "cozy",
  "tabVariant": "glass",
  "badgeVariant": "list"
}/*EDITMODE-END*/;

// ── Phone wrappers ──────────────────────────────────────────
// Slightly scaled-down device dimensions so two phones fit comfortably
// side by side. Both share the same content area within their frames.
const PHONE_W = 372;
const PHONE_H = 766;

function IOSPhone({ children }) {
  return <IOSDevice width={PHONE_W} height={PHONE_H}>{children}</IOSDevice>;
}
function AndroidPhone({ children }) {
  return <AndroidDevice width={PHONE_W + 8} height={PHONE_H + 12}>{children}</AndroidDevice>;
}

// ── Brand cover artboard ────────────────────────────────────
function BrandCover() {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: PP.bg, fontFamily: PP.font, padding: 30, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 11, color: PP.ink2, letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>Plattdeutsch für: kluge Klamotten</div>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1.6, color: PP.ink, lineHeight: 1, marginTop: 14 }}>Plietsche</div>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1.6, lineHeight: 1, marginTop: -2,
          background: PP.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Plünn.</div>
        <div style={{ fontSize: 14, color: PP.ink2, marginTop: 14, maxWidth: 320, lineHeight: 1.5 }}>
          Kleidertausch-App für die Kirchengemeinde. Sammelt PlietschPunkte, ohne wer-was-mitnimmt zu tracken. Privatsphäre als Feature.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
        <div style={{
          width: 130, height: 130, borderRadius: 28, background: PP.gradient,
          boxShadow: '0 20px 50px rgba(39,176,146,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <Icon name="shirt" size={64} color="#fff" strokeWidth={1.7} />
          <div style={{ position: 'absolute', inset: 4, borderRadius: 24, border: '1.5px solid rgba(255,255,255,0.4)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <Swatch hex="#27b092" label="Teal" />
            <Swatch hex="#79c4b0" label="Mint" />
            <Swatch hex="#80b4e2" label="Sky" />
          </div>
          <div style={{ fontSize: 12, color: PP.ink2 }}>Work Sans · 400 / 500 / 600 / 700</div>
        </div>
      </div>
    </div>
  );
}

function Swatch({ hex, label }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ width: '100%', height: 38, borderRadius: 10, background: hex, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }} />
      <div style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 10.5, color: PP.ink2, marginTop: 6 }}>{hex}</div>
    </div>
  );
}

// ── Tech-stack note artboard ────────────────────────────────
function TechStackNote() {
  return (
    <div style={{
      width: '100%', height: '100%', background: PP.sand,
      fontFamily: PP.font, padding: 24, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto',
    }}>
      <div>
        <div style={{ fontSize: 11, color: '#8a6d3a', letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 600 }}>Tach! Vorab kurz</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: PP.ink, letterSpacing: -0.4, marginTop: 4 }}>Stack-Empfehlung</div>
      </div>
      <Bullet t="Expo (React Native)" sub="Ja, nimm Expo. Bare RN braucht ihr nur, wenn echte Native-Module zwingend sind — euer Feature-Set (QR, GPS, Push via FCM/APNs, Bilder) deckt Expo SDK 50+ vollständig ab. Hot reload, EAS Build, OTA-Updates über expo-updates. Wenn ihr mit Expo schon gute Erfahrung habt: keine Diskussion." />
      <Bullet t="Flutter — wann ja?" sub="Wenn ihr in Dart fitter seid oder Animationen/Custom-Paints ein Killer-Feature wären. Für eine CRUD+Scanner+Gamification-App reizt Flutter seine Stärken nicht aus. Skip." />
      <Bullet t="Backend: PocketBase oder Express?" sub="PocketBase ist klasse für genau eure Größe: Auth, File-Storage, Realtime, Admin-UI, alles in einer Binary. Schema-Migrations als Code, Hooks in JS. Für >5k aktive Nutzer oder wenn ihr komplexe Gamification-Logik (Badge-Engine mit Triggern) als Cronjobs braucht, Express + PostgreSQL ist mächtiger. Für den Start: PocketBase." />
      <Bullet t="Hybrid-Vorschlag" sub="PocketBase als BaaS. Badge-Engine + Push-Scheduler als kleiner Node-Service der per Cron PocketBase-Daten liest und Achievements vergibt." />
      <div style={{
        marginTop: 'auto', padding: 12, background: 'rgba(255,255,255,0.6)', borderRadius: 12,
        fontSize: 11, color: PP.ink2, lineHeight: 1.5,
      }}>
        Watt'n Hinweis: dieses Design ist Plattform-neutral. iOS- und Android-Frames laufen mit denselben Komponenten — kein extra Design pro OS nötig.
      </div>
    </div>
  );
}
function Bullet({ t, sub }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: PP.teal }} />
        <div style={{ fontSize: 13.5, fontWeight: 600, color: PP.ink, letterSpacing: -0.1 }}>{t}</div>
      </div>
      <div style={{ fontSize: 12, color: PP.ink2, marginTop: 4, lineHeight: 1.5, paddingLeft: 14 }}>{sub}</div>
    </div>
  );
}

// ── Palette artboard ────────────────────────────────────────
function PaletteCard() {
  const groups = [
    { t: 'Brand', items: [['Teal', '#27b092'], ['Mint', '#79c4b0'], ['Sky', '#80b4e2']] },
    { t: 'Surface', items: [['BG', '#F4F7F4'], ['Sand', '#F4EFE6'], ['White', '#FFFFFF']] },
    { t: 'Ink', items: [['Primary', '#1A2E2C'], ['Secondary', '#5A6B6A'], ['Muted', '#9AA8A7']] },
    { t: 'Badges', items: [['Bronze', '#CD7F32'], ['Silber', '#B8B8B8'], ['Gold', '#E8B923']] },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', fontFamily: PP.font, padding: 24, boxSizing: 'border-box', overflow: 'auto' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: PP.ink, letterSpacing: -0.4 }}>Farben</div>
      <div style={{ fontSize: 12, color: PP.ink2, marginTop: 2 }}>Spec-Palette, nichts dazu erfunden.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 18 }}>
        {groups.map(g => (
          <div key={g.t}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: PP.ink2, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>{g.t}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {g.items.map(([n, h]) => (
                <div key={h} style={{ flex: 1 }}>
                  <div style={{ height: 56, borderRadius: 10, background: h, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }} />
                  <div style={{ fontSize: 11, color: PP.ink, marginTop: 5, fontWeight: 600 }}>{n}</div>
                  <div style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 10, color: PP.ink2 }}>{h}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{
          padding: 14, borderRadius: 14, background: PP.gradient, color: '#fff',
        }}>
          <div style={{ fontSize: 10.5, opacity: 0.85, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Brand Gradient · 135°</div>
          <div style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', fontSize: 11, marginTop: 4 }}>#27b092 → #79c4b0 → #80b4e2</div>
        </div>
      </div>
    </div>
  );
}

// ── Tab-bar variant showcase (3 phones with mini home content) ──
function TabBarShowcase({ variant }) {
  return (
    <IOSPhone>
      <PPScreen>
        <PPHeader
          subtitle={`Variante · ${variant === 'glass' ? 'Liquid Glass' : variant === 'classic' ? 'Klassisch' : 'Minimal'}`}
          title="Tab-Bar"
          leading={<Avatar initials="AS" gradient />}
        />
        <ScrollArea>
          <div style={{ padding: '0 20px' }}>
            <Card pad={20} radius={20}>
              <div style={{ fontSize: 11, color: PP.ink2, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                {variant === 'glass'   && 'Blur + Tint, floating'}
                {variant === 'classic' && 'Solid, bodenständig'}
                {variant === 'minimal' && 'Nur Icons, sehr ruhig'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: PP.ink, marginTop: 6, lineHeight: 1.4 }}>
                {variant === 'glass'   && 'Modern, ein bisschen verspielt, hebt Gradient hervor.'}
                {variant === 'classic' && 'Robust, vertraut. Funktioniert auf Android wie iOS gleich.'}
                {variant === 'minimal' && 'Maximale Ruhe für das Schaufenster — Schriftakzent reicht.'}
              </div>
            </Card>
          </div>
          <SectionTitle title="Vorschau Inhalt" />
          <ShowcaseRow />
        </ScrollArea>
        <TabBar variant={variant} active="home" />
      </PPScreen>
    </IOSPhone>
  );
}

// ── Helper: pick a Home variant ─────────────────────────────
function HomeForVariant({ which, tabVariant }) {
  if (which === 'layered') return <HomeLayered tabVariant={tabVariant} />;
  if (which === 'hero')    return <HomeHero    tabVariant={tabVariant} />;
  return <HomeCozy tabVariant={tabVariant} />;
}
function BadgesForVariant({ which, tabVariant }) {
  if (which === 'list')     return <BadgesList     tabVariant={tabVariant} />;
  if (which === 'timeline') return <BadgesTimeline tabVariant={tabVariant} />;
  return <BadgesGrid tabVariant={tabVariant} />;
}

// ── App ─────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  return (
    <>
      <DesignCanvas>
        <DCSection id="00-system" title="Plietsche Plünn — System" subtitle="Marke · Stack · Farben">
          <DCArtboard id="cover"   label="A · Brand-Cover" width={460} height={620}><BrandCover /></DCArtboard>
          <DCArtboard id="palette" label="B · Farbpalette"  width={420} height={620}><PaletteCard /></DCArtboard>
          <DCArtboard id="stack"   label="C · Stack-Empfehlung" width={420} height={620}><TechStackNote /></DCArtboard>
        </DCSection>

        <DCSection id="01-onboarding" title="01 · Onboarding" subtitle="Erstkontakt — drei Schritte, freundlich gehalten">
          <DCArtboard id="welcome-ios"     label="iOS · Willkommen"        width={PHONE_W} height={PHONE_H}><IOSPhone><OnboardingWelcome /></IOSPhone></DCArtboard>
          <DCArtboard id="welcome-android" label="Android · Willkommen"    width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><OnboardingWelcome /></AndroidPhone></DCArtboard>
          <DCArtboard id="how-ios"         label="iOS · So funktioniert's" width={PHONE_W} height={PHONE_H}><IOSPhone><OnboardingHow /></IOSPhone></DCArtboard>
          <DCArtboard id="how-android"     label="Android · So funktioniert's" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><OnboardingHow /></AndroidPhone></DCArtboard>
          <DCArtboard id="perm-ios"        label="iOS · Berechtigungen"    width={PHONE_W} height={PHONE_H}><IOSPhone><OnboardingPermissions /></IOSPhone></DCArtboard>
          <DCArtboard id="perm-android"    label="Android · Berechtigungen" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><OnboardingPermissions /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="02-auth" title="02 · Anmelden" subtitle="Login / Registrierung">
          <DCArtboard id="login-ios"     label="iOS · Login"     width={PHONE_W} height={PHONE_H}><IOSPhone><AuthLogin /></IOSPhone></DCArtboard>
          <DCArtboard id="login-android" label="Android · Login" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><AuthLogin /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="03-home" title="03 · Home" subtitle="Drei Layout-Varianten — über Tweaks umschaltbar. Aktive Variante zeigt iOS + Android.">
          <DCArtboard id="home-ios"     label={`iOS · Home · ${t.homeVariant}`}     width={PHONE_W} height={PHONE_H}><IOSPhone><HomeForVariant which={t.homeVariant} tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="home-android" label={`Android · Home · ${t.homeVariant}`} width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><HomeForVariant which={t.homeVariant} tabVariant={t.tabVariant} /></AndroidPhone></DCArtboard>
          <DCArtboard id="home-cozy"    label="A · Cozy Ring"     width={PHONE_W} height={PHONE_H}><IOSPhone><HomeCozy    tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="home-layered" label="B · Stat-Stack"    width={PHONE_W} height={PHONE_H}><IOSPhone><HomeLayered tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="home-hero"    label="C · Gradient-Hero" width={PHONE_W} height={PHONE_H}><IOSPhone><HomeHero    tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
        </DCSection>

        <DCSection id="04-checkin" title="04 · Check-In" subtitle="Tür-QR + GPS-Verifizierung + Stepper für mitgenommene Teile.">
          <DCArtboard id="checkin-ios"     label="iOS · Check-In"     width={PHONE_W} height={PHONE_H}><IOSPhone><CheckInScreen tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="checkin-android" label="Android · Check-In" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><CheckInScreen tabVariant={t.tabVariant} /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="05-scan" title="05 · Item-Scan" subtitle="QR auf Kleidungsstück — Mitnahme bestätigen, Punkte buchen.">
          <DCArtboard id="scan-ios"     label="iOS · Scan"     width={PHONE_W} height={PHONE_H}><IOSPhone><ScanScreen /></IOSPhone></DCArtboard>
          <DCArtboard id="scan-android" label="Android · Scan" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><ScanScreen /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="06-badges" title="06 · Badges" subtitle="Drei Layouts: Grid, Liste, Timeline. Aktive Variante zeigt iOS + Android.">
          <DCArtboard id="badges-ios"     label={`iOS · ${t.badgeVariant}`}     width={PHONE_W} height={PHONE_H}><IOSPhone><BadgesForVariant which={t.badgeVariant} tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="badges-android" label={`Android · ${t.badgeVariant}`} width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><BadgesForVariant which={t.badgeVariant} tabVariant={t.tabVariant} /></AndroidPhone></DCArtboard>
          <DCArtboard id="badges-grid"     label="A · Grid"     width={PHONE_W} height={PHONE_H}><IOSPhone><BadgesGrid     tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="badges-list"     label="B · Liste"    width={PHONE_W} height={PHONE_H}><IOSPhone><BadgesList     tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="badges-timeline" label="C · Timeline" width={PHONE_W} height={PHONE_H}><IOSPhone><BadgesTimeline tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
        </DCSection>

        <DCSection id="07-points" title="07 · Punkte-Historie" subtitle="Chart + gefilterte Transaktionsliste, gruppiert nach Tag.">
          <DCArtboard id="points-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><PointsHistory tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="points-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><PointsHistory tabVariant={t.tabVariant} /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="08-tabbar" title="08 · Tab-Bar — drei Stile" subtitle="Liquid Glass, Klassisch, Minimal. Via Tweaks anwendbar auf alle Screens.">
          <DCArtboard id="tab-glass"   label="A · Liquid Glass" width={PHONE_W} height={PHONE_H}><TabBarShowcase variant="glass"   /></DCArtboard>
          <DCArtboard id="tab-classic" label="B · Klassisch"    width={PHONE_W} height={PHONE_H}><TabBarShowcase variant="classic" /></DCArtboard>
          <DCArtboard id="tab-minimal" label="C · Minimal"      width={PHONE_W} height={PHONE_H}><TabBarShowcase variant="minimal" /></DCArtboard>
        </DCSection>

        <DCSection id="09-vol-items" title="09 · Ehrenamt — Bestand" subtitle="Item-Liste mit Suche, Filter, QR-Tag pro Teil.">
          <DCArtboard id="vol-list-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><VolunteerItems tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="vol-list-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><VolunteerItems tabVariant={t.tabVariant} /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="10-vol-form" title="10 · Ehrenamt — Teil anlegen" subtitle="Foto, Kategorie, Zustand → QR-Code wird erzeugt.">
          <DCArtboard id="vol-form-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><VolunteerItemForm /></IOSPhone></DCArtboard>
          <DCArtboard id="vol-form-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><VolunteerItemForm /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="11-admin-dash" title="11 · Admin — Dashboard" subtitle="KPIs, Sparkline, beliebte Teile, Schnellzugriffe.">
          <DCArtboard id="admin-dash-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><AdminDashboard tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="admin-dash-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><AdminDashboard tabVariant={t.tabVariant} /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="12-admin-badge" title="12 · Admin — Badge-Editor" subtitle="CRUD mit Trigger-Bedingungen als lesbare Regel.">
          <DCArtboard id="admin-badge-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><AdminBadgeEditor /></IOSPhone></DCArtboard>
          <DCArtboard id="admin-badge-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><AdminBadgeEditor /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="13-admin-push" title="13 · Admin — Push senden" subtitle="Komposition + Zielgruppen-Auswahl + Vorschau.">
          <DCArtboard id="admin-push-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><AdminPushCompose /></IOSPhone></DCArtboard>
          <DCArtboard id="admin-push-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><AdminPushCompose /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="14-admin-users" title="14 · Admin — Nutzer" subtitle="Rollen-Verwaltung, Suche, Aktivitäts-Indikator.">
          <DCArtboard id="admin-users-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><AdminUsers tabVariant={t.tabVariant} /></IOSPhone></DCArtboard>
          <DCArtboard id="admin-users-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><AdminUsers tabVariant={t.tabVariant} /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="15-admin-store" title="15 · Admin — Laden bearbeiten" subtitle="Adresse, Öffnungszeiten, Cover-Foto.">
          <DCArtboard id="admin-store-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><AdminStoreEdit /></IOSPhone></DCArtboard>
          <DCArtboard id="admin-store-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><AdminStoreEdit /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="16-push-settings" title="16 · Push-Einstellungen (Besucher)" subtitle="Sanft, granular, abschaltbar.">
          <DCArtboard id="push-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><PushSettings /></IOSPhone></DCArtboard>
          <DCArtboard id="push-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><PushSettings /></AndroidPhone></DCArtboard>
        </DCSection>

        <DCSection id="17-store-info" title="17 · Laden-Info (Besucher)" subtitle="Öffnungszeiten, Adresse, Route.">
          <DCArtboard id="store-ios"     label="iOS"     width={PHONE_W} height={PHONE_H}><IOSPhone><StoreInfo /></IOSPhone></DCArtboard>
          <DCArtboard id="store-android" label="Android" width={PHONE_W + 8} height={PHONE_H + 12}><AndroidPhone><StoreInfo /></AndroidPhone></DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks · Plietsche Plünn">
        <TweakSection label="Home-Layout (Sektion 03)" />
        <TweakRadio label="Variante" value={t.homeVariant} options={[
          { value: 'cozy',    label: 'Cozy'    },
          { value: 'layered', label: 'Stack'   },
          { value: 'hero',    label: 'Hero'    },
        ]} onChange={(v) => setTweak('homeVariant', v)} />

        <TweakSection label="Badge-Übersicht (Sektion 06)" />
        <TweakRadio label="Layout" value={t.badgeVariant} options={[
          { value: 'grid',     label: 'Grid'   },
          { value: 'list',     label: 'Liste'  },
          { value: 'timeline', label: 'Timeline' },
        ]} onChange={(v) => setTweak('badgeVariant', v)} />

        <TweakSection label="Tab-Bar (überall)" />
        <TweakRadio label="Stil" value={t.tabVariant} options={[
          { value: 'glass',   label: 'Glass' },
          { value: 'classic', label: 'Klass.' },
          { value: 'minimal', label: 'Min.'  },
        ]} onChange={(v) => setTweak('tabVariant', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
