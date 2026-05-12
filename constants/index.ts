
/**
 * Sidebar entries.
 *
 * `audience` controls visibility per workspace mode:
 *   - 'all'      → always shown
 *   - 'worship'  → only in worship + hybrid + community workspaces
 *   - 'business' → only in business + hybrid + community workspaces
 *
 * Community = worship + business: a community workspace sees every link
 * (worship-audience and business-audience) and gets its own blended copy
 * ("Start Gathering" etc).
 *
 * Label resolution per workspace mode (see `sidebarLabelFor`):
 *   - community         → `communityLabel` ?? `worshipLabel` ?? `label`
 *   - worship / hybrid  → `worshipLabel` ?? `label`
 *   - business          → `label` (neutral copy: "Start Meeting")
 */
export type SidebarAudience = 'all' | 'worship' | 'business';

export interface SidebarLink {
  Icon: number;
  route: string;
  label: string;
  /** Used in worship + hybrid workspaces (and as community fallback). */
  worshipLabel?: string;
  /** Used in community workspaces — blended "gathering" wording. */
  communityLabel?: string;
  audience: SidebarAudience;
  /** Resource key in the role-permission matrix this link maps to. */
  resource?: string;
  /** Action required to see this link (defaults to 'view'). */
  action?: 'view' | 'manage';
}

export const sidebarLinks: SidebarLink[] = [
  { Icon: 4, route: '/dashboard', label: 'Dashboard', audience: 'all' },
  { Icon: 1, route: '/dashboard/create-meeting', label: 'Start Meeting', worshipLabel: 'Start Worship', communityLabel: 'Start Gathering', audience: 'all', resource: 'meetings', action: 'manage' },
  { Icon: 2, route: '/dashboard/upcoming', label: 'Upcoming Meetings', worshipLabel: 'Upcoming Worship', communityLabel: 'Upcoming Gatherings', audience: 'all', resource: 'meetings' },
  { Icon: 5, route: '/dashboard/members', label: 'Members', audience: 'all', resource: 'members' },
  { Icon: 3, route: '/dashboard/recordings', label: 'Recordings', audience: 'all', resource: 'recordings' },
  { Icon: 8, route: '/dashboard/prayer-requests', label: 'Prayer Requests', audience: 'worship', resource: 'prayerRequests' },
  { Icon: 10, route: '/dashboard/songs', label: 'Song Library', audience: 'worship', resource: 'songs' },
  { Icon: 11, route: '/dashboard/daily-verses', label: 'Daily Verses', audience: 'worship', resource: 'dailyVerses' },
  { Icon: 6, route: '/dashboard/donations', label: 'Donations', audience: 'worship', resource: 'donations' },
  { Icon: 9, route: '/dashboard/activity', label: 'Activity', audience: 'all', resource: 'activity' },
  { Icon: 7, route: '/dashboard/settings', label: 'Settings', audience: 'all', resource: 'settings' },
];

/** Returns true if a sidebar entry should appear for the given workspace mode. */
export function isSidebarLinkVisible(audience: SidebarAudience, mode?: string | null): boolean {
  if (audience === 'all') return true;
  const m = mode || 'worship';
  if (audience === 'worship') return m === 'worship' || m === 'hybrid' || m === 'community';
  if (audience === 'business') return m === 'business' || m === 'hybrid' || m === 'community';
  return true;
}

/** Resolve the label to show for a sidebar entry given the workspace mode. */
export function sidebarLabelFor(link: SidebarLink, mode?: string | null): string {
  const m = mode || 'worship';
  if (m === 'community') return link.communityLabel || link.worshipLabel || link.label;
  if (m === 'worship' || m === 'hybrid') return link.worshipLabel || link.label;
  return link.label;
}

export const avatarImages = [
  '/images/avatar-1.jpeg',
  '/images/avatar-2.jpeg',
  '/images/avatar-3.png',
  '/images/avatar-4.png',
  '/images/avatar-5.png',
];


export interface Plan {
  title: string;
  price: number;
  popular?: boolean;
  features: string[];
  /** Per-meeting duration cap, in minutes. */
  min: number;
  saving: number;
  /** Per-meeting participant cap (server-enforced). */
  participantCap: number;
  /** Daily meeting count cap (server-enforced). 0 = unlimited. */
  meetingsPerDay: number;
  /** May start a recording. */
  canRecord: boolean;
  /** Recording quality label (display-only for now). */
  recordingQuality: 'none' | 'sd' | 'hd' | 'fhd';
  /** May see analytics charts. */
  analytics: boolean;
  /** Donations module enabled (in-session Give + dashboard reports). */
  donations: boolean;
  /** Multi-host (more than one cohost at a time). */
  multiHost: boolean;
  /** Custom branding (logo + accent color overrides). */
  customBranding: boolean;
  /** Singalong watermark/branding shown to participants. */
  brandedFooter: boolean;
  /** Audience this tier is sold to — drives display grouping on /plans. */
  audience: 'church' | 'business' | 'enterprise';
}

/**
 * Tier IDs (DB-stable strings, used in `subscriptionModel.subscription` enum).
 * Legacy: 'free' | 'starter' | 'plus' still resolve via aliases below for
 * backward compat with existing subscriptions.
 */
export const planslist: Record<string, Plan> = {
  // ---- Church track ----
  "free": {
    title: "Free",
    price: 0,
    min: 40,
    saving: 0,
    participantCap: 50,
    meetingsPerDay: 20,
    canRecord: false,
    recordingQuality: 'none',
    analytics: false,
    donations: true,
    multiHost: false,
    customBranding: false,
    brandedFooter: true,
    audience: 'church',
    features: [
      "Up to 50 participants",
      "40-minute meetings",
      "Basic worship features (lyrics, prayer, reactions)",
      "Donations enabled",
      "Singalong branding",
    ],
  },
  "starter": {
    title: "Starter",
    price: 12,
    min: 240, // 4 hours per meeting (effectively unlimited for a service)
    saving: 2,
    popular: true,
    participantCap: 100,
    meetingsPerDay: 0,
    canRecord: true,
    recordingQuality: 'sd',
    analytics: false,
    donations: true,
    multiHost: false,
    customBranding: false,
    brandedFooter: true,
    audience: 'church',
    features: [
      "Up to 100 participants",
      "Unlimited meeting time",
      "Basic recording",
      "Custom church name",
      "Donations enabled",
    ],
  },
  "growth": {
    title: "Growth",
    price: 30,
    min: 240,
    saving: 6,
    participantCap: 300,
    meetingsPerDay: 0,
    canRecord: true,
    recordingQuality: 'hd',
    analytics: true,
    donations: true,
    multiHost: true,
    customBranding: true,
    brandedFooter: false,
    audience: 'church',
    features: [
      "Up to 300 participants",
      "HD recording",
      "Donations + analytics dashboard",
      "Custom branding (logo + colors)",
      "Multi-host support",
    ],
  },
  "ministry_pro": {
    title: "Ministry Pro",
    price: 80,
    min: 480, // 8h
    saving: 16,
    participantCap: 1000,
    meetingsPerDay: 0,
    canRecord: true,
    recordingQuality: 'fhd',
    analytics: true,
    donations: true,
    multiHost: true,
    customBranding: true,
    brandedFooter: false,
    audience: 'church',
    features: [
      "Up to 1,000 participants",
      "Full HD streaming + recording",
      "Multi-host control",
      "Priority support",
      "API integrations",
    ],
  },

  // ---- Enterprise (custom) ----
  "enterprise": {
    title: "Enterprise",
    price: 0, // contact sales — display "Custom"
    min: 480,
    saving: 0,
    participantCap: 10000,
    meetingsPerDay: 0,
    canRecord: true,
    recordingQuality: 'fhd',
    analytics: true,
    donations: true,
    multiHost: true,
    customBranding: true,
    brandedFooter: false,
    audience: 'enterprise',
    features: [
      "10,000+ participants",
      "Full HD streaming + recording",
      "SSO / SAML",
      "Dedicated infrastructure",
      "Custom contracts & SLAs",
      "White-label option",
    ],
  },

  // ---- Legacy alias kept for backward compatibility ----
  // Old subscriptions saved 'plus' before the rename; treat as Growth.
  "plus": {
    title: "Growth (legacy)",
    price: 30,
    min: 240,
    saving: 6,
    participantCap: 300,
    meetingsPerDay: 0,
    canRecord: true,
    recordingQuality: 'hd',
    analytics: true,
    donations: true,
    multiHost: true,
    customBranding: true,
    brandedFooter: false,
    audience: 'church',
    features: [
      "Up to 300 participants",
      "HD recording",
      "Donations + analytics dashboard",
      "Custom branding",
    ],
  },
};

/** Resolve the canonical plan record for any saved subscription string. */
export function getPlan(subscription?: string | null): Plan {
  if (subscription && planslist[subscription]) return planslist[subscription];
  return planslist['free'];
}


