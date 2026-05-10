// Shared role-permission shape, used by:
//   - workspaceModel (default value seed)
//   - role-permissions API route (validation)
//   - members page UI (toggle matrix)
//
// Admin is intentionally NOT in EDITABLE_ROLES — admins always have everything.

export const RESOURCES = [
  { key: 'activity',        label: 'Activity feed' },
  { key: 'meetings',        label: 'Meetings' },
  { key: 'recordings',      label: 'Recordings' },
  { key: 'songs',           label: 'Songs library' },
  { key: 'prayerRequests',  label: 'Prayer requests' },
  { key: 'dailyVerses',     label: 'Daily verses' },
  { key: 'donations',       label: 'Donations' },
  { key: 'members',         label: 'Members' },
  { key: 'settings',        label: 'Workspace settings' },
];

export const ACTIONS = ['view', 'manage'];

export const EDITABLE_ROLES = ['host', 'cohost', 'member', 'guest'];

const RESOURCE_KEYS = RESOURCES.map((r) => r.key);

// Sensible starting matrix: every non-admin role can view everything, but
// only admins can manage. Owners tweak from there.
export function defaultRolePermissions() {
  const out = {};
  for (const role of EDITABLE_ROLES) {
    out[role] = {};
    for (const key of RESOURCE_KEYS) {
      out[role][key] = { view: true, manage: false };
    }
  }
  return out;
}

// Strip anything we don't recognise — keys, roles, non-boolean values — so a
// bad client payload can't pollute the document.
export function sanitizeRolePermissions(input) {
  const safe = defaultRolePermissions();
  if (!input || typeof input !== 'object') return safe;
  for (const role of EDITABLE_ROLES) {
    const raw = input[role];
    if (!raw || typeof raw !== 'object') continue;
    for (const key of RESOURCE_KEYS) {
      const cell = raw[key];
      if (!cell || typeof cell !== 'object') continue;
      safe[role][key] = {
        view: cell.view === true,
        manage: cell.manage === true,
      };
    }
  }
  return safe;
}

// True if the given role can perform the given action on the given resource.
// Admin is always allowed. Unknown role / resource / action → false.
export function canForRole(rolePermissions, role, resource, action) {
  if (!role) return false;
  if (role === 'admin') return true;
  if (!EDITABLE_ROLES.includes(role)) return false;
  if (!ACTIONS.includes(action)) return false;
  const merged = mergeWithDefaults(rolePermissions);
  const cell = merged?.[role]?.[resource];
  if (!cell) return false;
  return cell[action] === true;
}

// Merge a stored value with current defaults so newly-added resources show up
// for older workspaces without forcing a backfill.
export function mergeWithDefaults(stored) {
  const base = defaultRolePermissions();
  if (!stored || typeof stored !== 'object') return base;
  for (const role of EDITABLE_ROLES) {
    if (!stored[role]) continue;
    for (const key of RESOURCE_KEYS) {
      if (stored[role][key]) {
        base[role][key] = {
          view: stored[role][key].view === true,
          manage: stored[role][key].manage === true,
        };
      }
    }
  }
  return base;
}
