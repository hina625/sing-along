# Singalong — Project Vision & Roadmap

> **Positioning:** Not "another Zoom clone" — a **customizable live experience platform**.
> **Worship First** (emotional loyalty) → **Business Second** (recurring revenue) → **Hybrid** (the moat).

Audiences: Churches · Pastors · Ministries · Worship teams · Online congregations · Coaches · Teams · Educators · Businesses · Communities.

---

## 1. Meeting Modes (Core Architectural Concept)

Every session runs in one of three modes. The mode swaps the in-call UI, available tools, reaction set, and copy — but uses the same underlying engine (auth, video/audio, chat, notifications).

### 🎶 Worship Mode
- Lyrics overlay (center-screen, dimmed bg, smooth fades)
- Worship reactions: 🙏 Amen · ❤️ Love · 🔥 Fire · 👏 Praise
- "Give Offering" / "Sow a Seed" button visible in-session
- Spiritual visuals (cross, light rays, sky gradients)
- Bible panel (multi-translation)
- Prayer Request button (public/private)
- "Call to Altar" / response button
- Music Mode audio (stereo, low-latency, high bitrate)
- Copy tone: "Join Worship", "Let's Pray", "Be Blessed"

### 💼 Business Mode
- Whiteboard
- Notes panel
- Calendar integration
- Task sharing / file sharing
- Recording-status indicator in top bar
- Generic professional reactions
- Copy tone: "Start Meeting", "Share Screen", "Schedule"

### 🌍 Hybrid Mode
- Both Worship + Business toolsets simultaneously
- Use case: church leadership (prayer + discussion + presentation + collaboration)
- Mode picker per session; host can switch live

---

## 1A. Onboarding & Workspaces (Architectural Decision)

### Step 1 — Sign Up
Standard Clerk auth (already in place).

### Step 2 — Welcome Screen (post-signup)

> **"What would you like to use Singalong for?"**

Three primary use cases:

| Mode | For | Default tools |
|---|---|---|
| 🎶 **Worship & Church** | Churches · Ministries · Online congregations | Lyrics, prayer, donations, worship reactions, scheduled services |
| 💼 **Business Meetings** | Teams · Coaching · Clients · Companies | Whiteboard, notes, calendar, task/file sharing, recording |
| 🌍 **Community & Groups** | Online communities · Classes · Friend groups · Events | Chat-first, light moderation, RSVPs, recurring events |

**Critical:** the selection is *not* a lock-in. It's a starting preset that shapes the **first workspace**. Users can switch modes per workspace later, or add new workspaces of any type.

### Step 3 — Selection Effects
The chosen mode pre-configures:
- Dashboard layout & primary CTA copy ("Start Worship" vs "Start Meeting" vs "Open Room")
- Sidebar items shown
- Default reaction set
- Default audio profile (music-stereo for Worship, speech for Business/Community)
- Suggested integrations on the empty-state cards

---

### The Workspace Model (recommended architecture)

**Don't lock account types.** Lock workspaces.

```
User Account (one Clerk identity)
│
├── Workspace: "Grace Church"          [Worship mode]
│   ├── Members · Roles · Branding
│   ├── Meetings · Recordings · Donations
│   └── Analytics · Settings
│
├── Workspace: "Marketing Team"        [Business mode]
│   ├── Members · Roles
│   ├── Meetings · Notes · Files
│   └── Analytics
│
├── Workspace: "Youth Bible Study"     [Worship/Hybrid mode]
│
└── Workspace: "Private Coaching"      [Business mode]
```

### Why workspaces beat account-type lock-in

A pastor may also run a business, lead a youth group, and teach an online class. **One account-type forces them into a single mental model.**

| Approach | Outcome |
|---|---|
| ❌ Lock account type at signup | User stuck. Has to create separate accounts. |
| ✅ Workspace model | Flexible · Modern · Scalable · Feels native |

This is exactly how **Slack**, **Notion**, **Discord**, and **Zoom Teams** structure multi-context users.

### Workspace data model (proposed)

```ts
Workspace {
  _id, name, slug, mode: 'worship' | 'business' | 'community' | 'hybrid',
  ownerUserId, branding: { logoUrl, primaryColor, accentColor },
  createdAt
}

WorkspaceMember {
  workspaceId, userId, role: 'admin'|'host'|'cohost'|'member'|'guest',
  joinedAt
}

// Existing models gain a workspaceId:
Room.workspaceId
PrayerRequest.workspaceId
Donation.workspaceId
```

### Dashboard with Workspace Switcher

Top bar gets a workspace selector (Slack/Notion-style):

```
[ Grace Church ▼ ]   Dashboard | Worship Sessions | Members | ...   🔔   👤
   ├─ Grace Church           (Worship)
   ├─ Team Alpha             (Business)
   ├─ Coaching Hub           (Business)
   ├─ ────────────────
   └─ + New Workspace
```

Switching the workspace re-scopes:
- Sidebar items (Worship workspaces show "Prayer Requests"; Business workspaces show "Files / Notes")
- Members list
- Meetings list & recordings
- Donation/analytics widgets
- Branding (logo + accent colors)

### Migration path (current → workspace-aware)

1. Each existing user auto-gets a default workspace (mode = 'worship' since current product is Worship-First). Their existing rooms/prayers/donations attach to it.
2. Add `workspaceId` columns/fields with a backfill script.
3. Ship the Welcome Screen for *new* signups only; existing users see "Create another workspace" in the switcher.

---

## 2. Current State (codebase audit, 2026-05-09)

Stack: Next.js 14, TypeScript, Tailwind, Clerk, **LiveKit** (primary) + Stream (legacy), MongoDB/Mongoose, Stripe + Authorize.Net, Cloudinary, Nodemailer.

### ✅ Built
- LiveKit meeting room (HD A/V, screen share, raise hand, captions, bg blur, generic reactions, persisted chat) — `components/LiveKitMeeting.tsx`
- Clerk auth + sign-in/sign-up
- Marketing pages (about, feature, services, how-to-use, contact, policy, terms)
- Donate flow + Stripe + Authorize.Net + invoice generator
- Plans, checkout, success routes
- Dashboard shell (members, recordings page, settings, personal-room, previous, upcoming, create-meeting)
- Mongoose models: room, user/subscription, message
- APIs: `chat`, `create-room`, `donate`, `get-rooms`, `members`, `payment`, `send-invitation`, `subscription`, `livekit/token`
- Color palette tokens in `tailwind.config.ts` (Royal Purple, Deep Gold, Midnight Blue, Burgundy, Praise Orange, Teal, Cream, dark tokens)

### ❌ Missing (high level)
Worship: Lyrics Mode · Music Mode (stereo) · Bible · Prayer Requests · Call to Altar · Faith reactions · Worship visuals · Recording backend · Breakout rooms
Business: Whiteboard · Notes · Calendar · Task/file share · Meeting analytics
Hybrid: Mode switcher entirely
Roles: Admin/Host/Co-host/Member/Guest + moderation
Dashboards: Live analytics, donation reports, attendance, notification bell
Pricing: Growth + Ministry Pro tiers; Church vs Business plan split; Enterprise tier; per-tier enforcement
Payments: PayPal · Recurring donations · In-session "Give"
Mobile: PWA/native shell · Daily Verse · Push notifications
Design: Typography mismatch (using Marcellus/Rubik instead of spec's **Poppins/Inter**) · Dark mode toggle · Worship copy · Light-ray animations · Floating reactions

### ⚠️ Tech debt
Dual meeting stacks (Stream + LiveKit + Jitsi + mediasoup deps). Consolidate to **LiveKit only**.

---

## 3. Suggested Sidebar (updated dual-audience nav)

```
Dashboard
Worship Sessions     🎶
Meetings             💼
Members
Messages
Donations
Recordings
Analytics
Settings
```

Top bar: Logo · 🔔 Notifications · Profile

Home dashboard primary CTAs (equal weight):
- **Start Worship** 🎤 (gradient purple → gold, glow)
- **Start Meeting** 💼

---

## 4. Subscription Model (dual-track)

### Church Plans
| Tier | Price | Includes |
|---|---|---|
| Free | $0 | 50 participants, 40-min cap, Singalong branding |
| Starter | $10–15/mo | 100 participants, unlimited time, basic recording, custom church name |
| Growth | $25–40/mo | 300 participants, HD recording, donations, analytics, custom branding |
| Ministry Pro | $60–100/mo | 1000+ participants, full HD streaming, multi-host, priority support, API |

Features: Donations · Lyrics Mode · Prayer System · Worship branding

### Business Plans
Features: Team meetings · Collaboration tools · Meeting storage · Team analytics
(Tier breakdown TBD — mirror Church tiers on participants/recording/analytics axis)

### Enterprise
Large churches · Schools · Companies · Ministries — custom pricing, SSO, dedicated infra

---

## 5. Live Meeting UI

### Worship Layout
```
[ Logo | Title | Participants | Leave ]
-------------------------------------------
                VIDEO (Speaker)
-------------------------------------------
        Participant tiles
-------------------------------------------
[ 💬 | 🙏 | ❤️ | 🔥 | 👏 | 🎶 Lyrics | 💳 Give ]
```

### Business Layout
```
[ Title | Participants | 🔴 Rec | Leave ]
-------------------------------------------
   Speaker / Shared screen
-------------------------------------------
Right panel: Chat · People · Files
-------------------------------------------
[ Mic | Cam | Share | Record | React | Leave ]
```

### Lyrics Overlay (Worship key differentiator)
- Dimmed background
- Center-aligned text, large readable font
- Animated fade transitions between verses
- Host controls: next/prev, song picker, sync to song timer

### Prayer Request Modal
- Textarea
- Public / Private radio
- Submit → routed to host queue

### Donation Modal
- Preset chips: $10 · $25 · $50 · custom
- Card / PayPal / Stripe
- Recurring toggle
- CTA: "Sow a Seed" (gold)

---

## 6. Notifications

**Worship:** "Pastor is live now" · "Sunday worship starts soon" · "New prayer request"
**Business:** "Team meeting starts in 10 mins" · "New recording available" · "John shared a file"

Channels: in-app bell · push (mobile) · email · WhatsApp invite (new)

---

## 7. Mobile App

Big-button home: **Join Worship 🎶 · Join Meeting 💼 · Watch Live · Give · Prayer**
Daily Verse card on home.
Live screen: fullscreen video, floating chat, reaction bar, Lyrics Mode toggle (worship), Notes (business).
Soft vibration on reactions. Optional Amen sound.

---

## 8. Architecture

```
                ┌─── Core Engine ───┐
                │  Auth · A/V · Chat │
                │  Notifications     │
                └─────────┬──────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
      Worship Module           Business Module
      ─────────────            ────────────────
      Lyrics engine            Whiteboard
      Donations                Scheduling
      Prayer requests          Team collab
      Bible integration        File sharing
      Faith reactions          Notes/tasks
```

Mode picker decides which modules mount in a given session.

---

## 9. Design System (locked)

**Colors** (already in `tailwind.config.ts`):
Royal Purple `#5A2D82` · Deep Gold `#D4AF37` · Midnight Blue `#0B1F3A` · Burgundy `#6D1A36` · Praise Orange `#F57C00` · Teal `#2CA6A4` · Cream `#F8F4EC` · Dark BG `#0A0A0A` · Card Dark `#1A1A1A` · Text Light `#F5F5F5`

**Typography (LOCKED — approved):**
- Headings → **Marcellus** (serif) — chosen for the elegant, worshipful feel
- Body → **Rubik** (sans-serif) — clean, highly readable across ages
- Sizes: H1 32 · H2 24 · H3 18 · Body 14–16
- *Note:* Original spec called for Poppins/Inter; team approved Marcellus/Rubik instead.

**Buttons:**
- Primary: gradient `#5A2D82 → #D4AF37`, radius 12px, soft gold-tint glow shadow
- Secondary: transparent bg, 1px gold border, gold text

**Components:** cards 16px radius · soft shadows · outline+filled icons · 8px spacing grid

**Dark mode:** required everywhere (toggle missing). Premium/spiritual feel — black/navy bg, gold highlights, purple accents.

**Micro-interactions:** button glow on hover/click · floating-up reaction animation · smooth fade transitions · mobile haptic on reactions.

**Avoid:** cold corporate look · pale gray washes · sterile white-only UI.

---

## 10. Roadmap (priority order)

### Phase 1 — Worship MVP (the differentiator)
1. ✅ Lyrics Display Mode (overlay + host composer + LiveKit-synced verses) — *song library/admin upload still pending*
2. ✅ Faith reactions (🙏 Amen, ❤️ Love, 🔥 Fire, 👏 Praise, 🙌 Hallelujah, ✝️ Bless) with floating-up animation
3. ✅ Music Mode audio publish settings (stereo, `musicHighQualityStereo` preset, DTX/RED off, DSP off)
4. ✅ Prayer Request button + modal + DB model + API (POST/GET/PATCH) + public/private routing — *host queue page pending*
5. ✅ In-session "Give Offering" / "Sow a Seed" button (presets + custom amount → routes to /donate)
6. ✅ Worship copy pass ("Start Worship", "Join Worship", "Schedule Service", "Sow a Seed")
7. ❌ ~~Typography swap → Poppins + Inter~~ — **DROPPED**: Marcellus + Rubik approved by team
8. ✅ "Start Worship" gradient/glow primary button on dashboard hero
9. Lyrics song library — admin uploads songs, host picks from list (deferred)
10. ✅ Prayer Requests host queue page at `/dashboard/prayer-requests`

### Phase 2 — Roles, Recording, Analytics, Workspaces
11. ⏳ Role system (Admin / Host / Co-host / Member / Guest) + permission middleware — *in progress: room-level host check shipped via `/api/v1/room-role`; full membership table pending*
12. Host moderation in-call (mute, remove, promote co-host, block)
13. Guest (no-account) join flow
14. Recording: LiveKit Egress → Cloudinary/S3 → recordings library page works end-to-end
15. Admin dashboard widgets (Chart.js): attendance, donations summary, live sessions count, total members, upcoming events
16. Notification bell + in-app notification system
17. WhatsApp invite channel
18. **Workspace model — foundation:** `Workspace` + `WorkspaceMember` Mongoose models; `workspaceId` on Room/PrayerRequest/Donation; backfill migration giving every existing user a default Worship workspace
19. **Welcome Screen** after signup — three-card mode picker (Worship / Business / Community); writes mode + creates first workspace
20. **Workspace switcher** in top bar (Slack/Notion-style); changes scope of sidebar, members, meetings, recordings, analytics, branding
21. **"+ New Workspace"** flow — name, slug, mode, optional logo & accent color
22. Per-workspace branding (logo, primary/accent color overrides)
23. Per-workspace member invites (link / email / WhatsApp) + role assignment

### Phase 3 — Business Mode + Hybrid (✅ shipped)
16. ✅ Mode picker on session create (Worship / Business / Hybrid) — `room.mode` field; create-room derives default from workspace mode; LiveKitMeeting hides worship-only buttons in business sessions
17. ✅ Whiteboard integration — Excalidraw iframe overlay with deterministic per-meeting room URL; open/close synced via LiveKit data channel
18. ✅ Notes panel — shared timestamped log per meeting (host can pin/delete; author can delete own); real-time sync via `note:new` data-channel ping
19. ✅ Calendar integration — Google/Outlook/Yahoo deep links + RFC 5545 `.ics` download with 15-min reminder; zero OAuth
20. ✅ File sharing in chat — paperclip → Cloudinary upload (25 MB cap); image previews + file cards; mode-agnostic
21. ✅ Team activity feed — `/api/v1/activity` aggregator + `/dashboard/activity` timeline (sessions, recordings, notes, prayers, donations, files); workspace-scoped
22. ✅ Business notifications — `note.added`, `file.shared` fan-out via `notify()`; `/api/v1/notifications/check-upcoming` cron-friendly endpoint for "starts in N mins" reminders (idempotent via `room.reminderSent`)

### Phase 4 — Pricing, Payments, Polish (✅ shipped, except PayPal)
23. ✅ Restructured plans: Church track (Free / Starter / Growth / Ministry Pro) + Enterprise; legacy `'plus'` kept as Growth alias
24. ✅ Per-tier server enforcement via `lib/planLimits.js` — daily meeting cap, end-time clamp, recording gate (`canStartMeeting`, `canRecord`); 402 with upgrade message
25. ⏸ ~~PayPal integration~~ — **deferred** (user will revisit later)
26. ✅ Recurring donations — Authorize.Net ARB (`POST /api/v1/donate/recurring` create, `DELETE` cancel); donate page toggle + frequency picker
27. ✅ Donation reports — `/api/v1/donations` aggregator + `/dashboard/donations` page (KPIs, 90-day trend, recurring list with cancel, top donors, recent transactions)
28. ✅ Dark-mode toggle — `ThemeProvider` + sun/moon button in navbar, no-flash inline script, light-mode CSS overrides preserving gold/purple accents
29. ✅ Tailwind keyframes — `light-ray`, `soft-glow`, `fade-in`, `fade-in-up` utilities added
30. ✅ Bible integration — `/api/v1/bible/verse` proxy (bible-api.com) + in-call BiblePanel with translation picker + host "Share with everyone" data-channel sync
31. ✅ "Call to Altar" — model + start/end/respond endpoints; full-screen overlay with rotating light rays for everyone; host sees live responder list with notes
32. ✅ Breakout rooms — host opens 2–12 child rooms (deterministic ids, shadow rooms upserted); pickers shown to all; "Return to main service" banner inside child rooms
33. ✅ Daily Verse — `/api/v1/bible/daily-verse` curated 60-passage rotation by day-of-year; dashboard card with translation picker + share, gated to non-business workspaces

### Phase 5 — Mobile + Scale
34. PWA shell → React Native / Flutter app
35. Push notifications ("Pastor is live", "Service starting", "New prayer")
36. Mobile lyrics mode + haptic reactions
37. Live "Watch Service" public viewer page (no-join)
38. Member activity / live engagement highlights
39. Accessibility audit (large fonts, contrast, simple nav for older users)

### Tech debt (ongoing)
- Remove Stream Video SDK + Jitsi + mediasoup — consolidate to LiveKit
- Replace legacy Marcellus/Rubik usage across components
- Fix `dark.1-4` token mapping in tailwind config (currently all `#F5F5F5`)

---

## 11. Final Direction

> This is not just a meeting app.
> It must feel like **entering a live worship environment** — and just as easily, a sharp business meeting.
> One platform. Two audiences. Three modes. Built for emotional loyalty *and* recurring revenue.
