
/**
 * Sidebar entries.
 *
 * `audience` controls visibility per workspace mode:
 *   - 'all'      → always shown
 *   - 'worship'  → only in worship + hybrid + community workspaces
 *   - 'business' → only in business + hybrid + community workspaces
 *
 * `worshipLabel` / `communityLabel` overrides are optional — if absent,
 * `sidebarLabelFor` falls back to `label`. Currently all entries share a
 * single neutral label across modes.
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
  /** Plan boolean flag required to access this link (e.g. 'mediaLibrary'). When set
   *  and the user's plan doesn't have it, the link renders locked → /plans. */
  planFeature?: 'mediaLibrary' | 'canRecord' | 'analytics' | 'donations' | 'customBranding';
}

export const sidebarLinks: SidebarLink[] = [
  { Icon: 4, route: '/dashboard', label: 'Dashboard', audience: 'all' },
  { Icon: 1, route: '/dashboard/create-meeting', label: 'Start Session', audience: 'all', resource: 'meetings', action: 'manage' },
  { Icon: 2, route: '/dashboard/upcoming', label: 'Upcoming Events', audience: 'all', resource: 'meetings' },
  { Icon: 5, route: '/dashboard/members', label: 'Team', audience: 'all', resource: 'members' },
  { Icon: 3, route: '/dashboard/recordings', label: 'Recordings', audience: 'all', resource: 'recordings', planFeature: 'canRecord' },
  { Icon: 8, route: '/dashboard/prayer-requests', label: 'Requests', audience: 'worship', resource: 'prayerRequests' },
  { Icon: 10, route: '/dashboard/songs', label: 'Media Library', audience: 'worship', resource: 'songs', planFeature: 'mediaLibrary' },
  { Icon: 11, route: '/dashboard/daily-verses', label: 'Daily Feed', audience: 'worship', resource: 'dailyVerses' },
  { Icon: 6, route: '/dashboard/donations', label: 'Contributions', audience: 'worship', resource: 'donations' },
  { Icon: 9, route: '/dashboard/activity', label: 'Activity Center', audience: 'all', resource: 'activity', planFeature: 'analytics' },
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
  /** Annual price (used when shown alongside monthly). */
  yearlyPrice?: number;
  /** Short audience descriptor displayed under the price. */
  bestFor?: string;
  /** Override the primary CTA label on pricing cards. */
  ctaText?: string;
  /** Hide from /plans and homepage pricing grid (kept in planslist for DB-key back-compat). */
  hidden?: boolean;
  popular?: boolean;
  features: string[];
  /** Per-meeting duration cap, in minutes. */
  min: number;
  saving: number;
  /** Per-meeting participant cap (server-enforced). */
  participantCap: number;
  /** Daily meeting count cap (server-enforced). 0 = unlimited. */
  meetingsPerDay: number;
  /** Max workspaces a user may own (server-enforced). 0 = unlimited. */
  maxWorkspaces: number;
  /** Cumulative storage cap in MB for uploads (server-enforced). 0 = unlimited. */
  storageMB: number;
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
  /** Media library (songs / shared media) — Pro+. */
  mediaLibrary?: boolean;
  /** Invite teammates into the workspace — Pro+. Free workspaces stay solo. */
  memberManagement?: boolean;
  /** Customize the role-permission matrix — Business+. */
  customRoles?: boolean;
  /** Allow more than one admin per workspace — Business+. */
  multipleAdmins?: boolean;
  /** Audience this tier is sold to — drives display grouping on /plans. */
  audience: 'standard' | 'business' | 'enterprise';
}

/**
 * Tier IDs (DB-stable strings, used in `subscriptionModel.subscription` enum).
 * Legacy: 'free' | 'starter' | 'plus' still resolve via aliases below for
 * backward compat with existing subscriptions.
 */
export const planslist: Record<string, Plan> = {
  // DB key 'free' → displayed as "Starter (Free)".
  "free": {
    title: "Starter",
    price: 0,
    bestFor: "Individuals & small groups",
    ctaText: "Get Started Free",
    min: 40,
    saving: 0,
    participantCap: 25,
    meetingsPerDay: 20,
    maxWorkspaces: 1,
    storageMB: 5 * 1024,
    canRecord: false,
    recordingQuality: 'none',
    analytics: false,
    donations: true,
    multiHost: false,
    customBranding: false,
    brandedFooter: true,
    mediaLibrary: false,
    memberManagement: false,
    customRoles: false,
    multipleAdmins: false,
    audience: 'standard',
    features: [
      "Up to 25 participants",
      "40-minute meetings",
      "5 GB storage",
      "Basic community features",
      "1 workspace",
      "Chat & announcements",
      "Mobile access",
    ],
  },
  // DB key 'starter' → displayed as "Professional".
  "starter": {
    title: "Professional",
    price: 12,
    yearlyPrice: 99,
    bestFor: "Small teams, creators, communities",
    ctaText: "Start Professional",
    popular: true,
    min: 240,
    saving: 2,
    participantCap: 100,
    meetingsPerDay: 0,
    maxWorkspaces: 1,
    storageMB: 50 * 1024,
    canRecord: true,
    recordingQuality: 'sd',
    analytics: true,
    donations: true,
    multiHost: false,
    customBranding: true,
    brandedFooter: true,
    mediaLibrary: true,
    memberManagement: true,
    customRoles: false,
    multipleAdmins: false,
    audience: 'standard',
    features: [
      "Everything in Starter, plus:",
      "Up to 100 participants",
      "Unlimited meeting duration",
      "Recording access",
      "Media library",
      "Event scheduling",
      "Member management",
      "Shared notes",
      "Basic analytics",
      "Custom branding",
    ],
  },
  // DB key 'growth' → displayed as "Business".
  "growth": {
    title: "Business",
    price: 29,
    yearlyPrice: 290,
    bestFor: "Growing organizations & businesses",
    ctaText: "Upgrade to Business",
    min: 240,
    saving: 6,
    participantCap: 300,
    meetingsPerDay: 0,
    maxWorkspaces: 1,
    storageMB: 250 * 1024,
    canRecord: true,
    recordingQuality: 'hd',
    analytics: true,
    donations: true,
    multiHost: true,
    customBranding: true,
    brandedFooter: false,
    mediaLibrary: true,
    memberManagement: true,
    customRoles: true,
    multipleAdmins: true,
    audience: 'standard',
    features: [
      "Everything in Professional, plus:",
      "Up to 300 participants",
      "Team roles & permissions",
      "Task management",
      "Advanced analytics",
      "Calendar integrations",
      "File sharing",
      "Priority support",
      "Automation tools",
      "Multiple admins",
    ],
  },
  // Legacy 1000-seat tier; preserved for back-compat but no longer displayed.
  "ministry_pro": {
    title: "Pro (legacy)",
    price: 80,
    hidden: true,
    min: 480,
    saving: 16,
    participantCap: 1000,
    meetingsPerDay: 0,
    maxWorkspaces: 1,
    storageMB: 500 * 1024,
    canRecord: true,
    recordingQuality: 'fhd',
    analytics: true,
    donations: true,
    multiHost: true,
    customBranding: true,
    brandedFooter: false,
    mediaLibrary: true,
    memberManagement: true,
    customRoles: true,
    multipleAdmins: true,
    audience: 'standard',
    features: [
      "Up to 1,000 participants",
      "Full HD streaming + recording",
      "Multi-host control",
      "Priority support",
      "API integrations",
    ],
  },

  "enterprise": {
    title: "Enterprise",
    price: 99,
    bestFor: "Large organizations & networks",
    ctaText: "Contact Sales",
    min: 480,
    saving: 0,
    participantCap: 10000,
    meetingsPerDay: 0,
    maxWorkspaces: 0,
    storageMB: 0,
    canRecord: true,
    recordingQuality: 'fhd',
    analytics: true,
    donations: true,
    multiHost: true,
    customBranding: true,
    brandedFooter: false,
    mediaLibrary: true,
    memberManagement: true,
    customRoles: true,
    multipleAdmins: true,
    audience: 'enterprise',
    features: [
      "Everything in Business, plus:",
      "Unlimited participants",
      "Multiple workspaces",
      "White-label branding",
      "API access",
      "Advanced security",
      "Dedicated support",
      "Custom integrations",
      "SSO login",
      "Enterprise analytics",
    ],
  },

  // Legacy alias: old subscriptions saved 'plus' before the rename — treat as Business.
  "plus": {
    title: "Business (legacy)",
    price: 29,
    hidden: true,
    min: 240,
    saving: 6,
    participantCap: 300,
    meetingsPerDay: 0,
    maxWorkspaces: 1,
    storageMB: 250 * 1024,
    canRecord: true,
    recordingQuality: 'hd',
    analytics: true,
    donations: true,
    multiHost: true,
    customBranding: true,
    brandedFooter: false,
    mediaLibrary: true,
    memberManagement: true,
    customRoles: true,
    multipleAdmins: true,
    audience: 'standard',
    features: [
      "Up to 300 participants",
      "HD recording",
      "Contributions + analytics dashboard",
      "Custom branding",
    ],
  },
};

/** Resolve the canonical plan record for any saved subscription string. */
export function getPlan(subscription?: string | null): Plan {
  if (subscription && planslist[subscription]) return planslist[subscription];
  return planslist['free'];
}


