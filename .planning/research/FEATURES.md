# Feature Research

**Domain:** Managed community clothing exchange (volunteer-operated, physical store)
**Researched:** 2026-04-07
**Confidence:** MEDIUM — No direct comparables exist (this niche is underserved by commercial software). Analysis draws from: thrift store POS systems, community gamification platforms, physical check-in apps, and the project's own validated MVP learnings.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that both volunteer-operators and visitors assume exist. Missing these = product feels broken.

#### Volunteer-Facing (Inventory Management)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Item creation with category/size/condition | Volunteers need a way to log incoming donations | LOW | Category taxonomy matters — don't over-engineer (Oberteil, Hose, Jacke, Schuhe reicht) |
| Auto-generated QR code per item | Core mechanic — item needs scannable identity | LOW | Generate on creation, print or display on screen |
| Item status tracking (available / taken) | Without this volunteers can't see what's still in stock | LOW | Already in MVP; keep it binary — avoid "reserved" |
| Bulk add / fast item entry | Volunteers process many items at once during sorting shifts | MEDIUM | Simple form with defaults from previous entry; not barcode-gun speed needed |
| Item list / search / filter | Volunteers need to find items (wrong QR, manual lookup) | LOW | Filter by category, status, date added |
| Admin dashboard with basic stats | "Is the store being used?" — organizations need this for reporting to stakeholders | MEDIUM | Visits today/week, items taken, campaigns active |

#### Visitor-Facing (Engagement)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| QR code scan → item checkout | Core mechanic visitors encounter on first visit | LOW | Open camera → scan → confirm → done. Max 2 taps |
| Door check-in (QR + GPS) | Verifies physical presence without tracking individuals | MEDIUM | GPS fuzzing acceptable; needs clear "I was here" UX |
| Point balance visible | Once points exist, visitors expect to see them | LOW | Single number on home screen — no point history required at MVP |
| "How many items did you take?" prompt | Covers non-digitized items — completes the visit flow | LOW | Simple stepper (1–10), shown after check-in |
| Store hours / location info | Visitors coming to physical store need basic info | LOW | Static per tenant; managed by volunteer admin |

### Differentiators (Competitive Advantage)

Features that make Plietsche Plünn meaningfully better than a paper list or WhatsApp group.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| PlietschPunkte gamification | Repeat visits — gives visitors a reason to return beyond need | MEDIUM | Points for check-in + item scan. Must feel rewarding without requiring effort |
| Campaigns / Aktionen | "Winterkleidung dringend gesucht — doppelte Punkte" drives targeted donations and visits | MEDIUM | Time-limited, per-tenant, with point multiplier or bonus. Admins create via dashboard |
| Schaufenster / item showcase | Selected items previewed in app — makes visitors curious before they arrive | MEDIUM | Volunteers mark items as "showcase" — displayed on home screen. Drives foot traffic |
| Privacy-first design | Visitors trust the system because it provably doesn't track who took what | LOW | This is architecture, not UI — but visible privacy messaging is a differentiator for the target audience (refugees, low-income, community) |
| Multi-tenant support | Platform value: other exchange stores can onboard, gets network effects | HIGH | Tenant = isolated data silo + custom branding (store name, color). Shared codebase. |
| Volunteer role hierarchy | Store managers vs. regular volunteers — managers configure store, volunteers enter items | LOW-MEDIUM | Two roles sufficient for MVP: `admin` (creates campaigns, configures store) and `volunteer` (manages items) |
| Onboarding flow for new visitors | Explains the concept on first open — reduces confusion at door | LOW | Single screen walkthrough, skippable. Critical for accessibility (diverse user base) |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Reservation / "hold this item" | "I want to make sure it's still there" | Violates the walk-in-first principle; creates unfairness between digital and non-digital visitors; requires reverting held items | Schaufenster shows desirable items exist without guaranteeing availability — drives urgency to visit |
| Who took what (per-user history) | "Useful for fairness / abuse prevention" | Violates the explicit privacy-first decision; creates chilling effect for target audience (refugees, low-income users who fear surveillance) | Aggregate stats (X items taken today) give operational insight without individual tracking |
| Leaderboard with usernames | "Makes gamification more competitive" | Publicly ranking users by activity creates social pressure and exclusion; poor fit for inclusive community store | Anonymous aggregate milestones ("100 items found a new home!") or private progress toward personal goals |
| Push notifications for new items | "Users want to know when good stuff arrives" | Requires persistent device permission; volunteers would need to trigger manually, adding burden; creates FOMO pressure | Campaigns serve this — "Neue Wintersachen da — komm vorbei!" as in-app banner when user opens app |
| User-to-user messaging / profiles | "Community building" | Scope creep; adds moderation burden; this is a physical-first community — digital socializing is not the use case | The store itself is the community; app's job is frictionless access to it |
| Online shop / item delivery | "Reach people who can't come" | Destroys the core model (managed inventory, no P2P, no logistics); the store IS the experience | Schaufenster creates awareness; physical visit remains the interaction |
| Ratings / reviews on items | Seems useful for quality signal | Items are donated, curated by volunteers — rating donations is culturally awkward; adds complexity without benefit | Condition field on item creation (Gut / Sehr gut / Wie neu) set by volunteer is enough |
| Complex point redemption store | "Points need to mean something tangible" | Reward redemption requires real resources (coupons, prizes); operationally heavy for volunteer org | Points as recognition and status milestones (badges/levels) are sufficient. Campaigns can offer "double points" as intrinsic reward |

---

## Feature Dependencies

```
[Tenant Setup]
    └──requires──> [Multi-Tenant Architecture]
                       └──enables──> [Per-Tenant Config (name, hours, GPS location)]
                                         └──enables──> [Door Check-In GPS]

[Door Check-In (QR + GPS)]
    └──requires──> [Tenant GPS coordinates stored]
    └──requires──> [Store QR code generated per tenant]
    └──enables──> [PlietschPunkte (check-in reward)]

[Item QR Scan]
    └──requires──> [Item created with QR]
    └──enables──> [PlietschPunkte (item reward)]
    └──enables──> [Item status → taken]

[PlietschPunkte System]
    └──requires──> [User account (visitor)]
    └──requires──> [At least one reward trigger: check-in OR item scan]
    └──enhanced-by──> [Campaigns (point multipliers)]

[Campaigns / Aktionen]
    └──requires──> [Volunteer admin role]
    └──requires──> [PlietschPunkte System]
    └──enhanced-by──> [Push notifications (anti-feature — skip)]

[Schaufenster]
    └──requires──> [Items exist in inventory]
    └──requires──> [Volunteer can mark item as "showcase"]
    └──enhances──> [Visitor motivation to visit store]

[Admin Dashboard]
    └──requires──> [Check-in events logged (aggregate, not per-user)]
    └──requires──> [Item status changes logged (aggregate)]
```

### Dependency Notes

- **Door Check-In requires Tenant GPS:** The check-in verification compares visitor device GPS to stored store coordinates. Per-tenant coordinates must be set during tenant onboarding.
- **PlietschPunkte requires at least one trigger:** Points without earning mechanics are meaningless. Minimum viable: check-in reward. Item scan reward adds engagement but is optional at launch.
- **Campaigns enhance PlietschPunkte:** Campaigns are a multiplier layer on top of the base points system. Cannot launch campaigns without a working points system.
- **Multi-Tenant conflicts with single-store simplicity:** Early phases should build single-tenant first, extract multi-tenant as explicit layer. Don't pre-optimize tenant isolation before core mechanics work.

---

## MVP Definition

### Launch With (v1)

Minimum needed to validate the concept with the existing store.

- [ ] Volunteer: Create item → auto QR code generated → item visible in list
- [ ] Volunteer: Admin dashboard showing daily visits + items taken (aggregate)
- [ ] Visitor: Scan item QR → mark as taken + earn points
- [ ] Visitor: Door check-in (QR + GPS) → log visit + earn points
- [ ] Visitor: "How many items?" prompt after check-in (for non-digitized items)
- [ ] Visitor: Point balance visible on home screen
- [ ] Store info page (hours, address) — static per tenant

### Add After Validation (v1.x)

Add once core check-in + points loop is working and volunteers are using it regularly.

- [ ] Campaigns / Aktionen — trigger when "volunteers want to drive specific donations"
- [ ] Schaufenster — trigger when "visitors say they want a reason to check the app between visits"
- [ ] Volunteer role hierarchy (admin vs. volunteer) — trigger when second person joins the admin team
- [ ] Onboarding flow for new visitors — trigger when feedback shows confusion at first use

### Future Consideration (v2+)

Defer until single-tenant is stable and validated.

- [ ] Multi-tenant support — trigger when a second store wants to onboard
- [ ] Per-tenant branding (colors, logo) — part of multi-tenant
- [ ] Advanced dashboard analytics (trends, popular categories) — trigger when admins ask for more insight
- [ ] Milestone badges / achievement levels — if points alone feel insufficient for retention

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Item creation + QR generation | HIGH (volunteers) | LOW | P1 |
| Item QR scan → checkout | HIGH (visitors) | LOW | P1 |
| Door check-in (QR + GPS) | HIGH (visitors + volunteers) | MEDIUM | P1 |
| PlietschPunkte (earn) | HIGH (visitors) | MEDIUM | P1 |
| Point balance display | MEDIUM (visitors) | LOW | P1 |
| Volunteer item list / search | HIGH (volunteers) | LOW | P1 |
| Admin dashboard (aggregate stats) | MEDIUM (volunteers) | MEDIUM | P1 |
| Store info page | MEDIUM (visitors) | LOW | P1 |
| Campaigns / Aktionen | HIGH (both) | MEDIUM | P2 |
| Schaufenster / showcase | MEDIUM (visitors) | MEDIUM | P2 |
| Onboarding flow | MEDIUM (visitors) | LOW | P2 |
| Volunteer role hierarchy | LOW-MEDIUM | LOW | P2 |
| Multi-tenant | HIGH (platform) | HIGH | P3 |
| Achievement badges / levels | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

There are no direct competitors in the "managed community clothing exchange with gamification" niche. The closest analogues and what we learn from them:

| Feature | ThriftCart (POS/Inventory) | Closest Closet (P2P swap) | Plietsche Plünn approach |
|---------|---------------------------|---------------------------|--------------------------|
| Inventory management | Full POS, barcode/label printing, volunteer roles | User self-manages own listings | Volunteer-only entry, QR on select items only, no full POS needed |
| Visitor checkout | POS terminal, staff-operated | User-to-user claim + hanger currency | Self-service QR scan by visitor; no transaction required |
| Gamification | None | Hanger currency (items posted = hangers earned) | Points for physical presence (check-in) + item scans — rewards visits, not listings |
| Campaigns | None | None | Time-limited point multipliers + messaging — unique to this system |
| Privacy | Standard retail tracking | Public profiles and item history | Explicitly no per-user item history — differentiator for community trust |
| Multi-tenant | Yes (commercial SaaS) | No | Planned for v2 |
| Mobile app | Web + tablet POS | iOS/Android | React Native (iOS + Android) |

---

## Sources

- ThriftCart feature analysis: https://thriftcart.com/
- Closest Closet / clothing swap app model: https://www.goodgoodgood.co/articles/closest-closet-clothing-swap-app
- Gamification pitfalls (dark side of points/badges): https://www.growthengineering.co.uk/dark-side-of-gamification/
- Community gamification patterns: https://www.gainsight.com/blog/community-gamification/
- Gamification failure analysis: https://spinify.com/blog/why-gamification-fails-and-how-to-fix-it-boost-engagement-effectively/
- Volunteer thrift store inventory software overview: https://zipdo.co/best/thrift-store-inventory-software/

---
*Feature research for: managed community clothing exchange (volunteer-operated, privacy-first, gamified)*
*Researched: 2026-04-07*
