/**
 * GreenRoom Stages - Permission System
 *
 * Roles are presets. Owner/Admin can override any individual permission
 * toggle per team member (GitHub-style sparse overrides).
 *
 * Usage:
 *   const perms = resolvePermissions(member.role, member.permissions as PermissionOverrides);
 *   if (!perms["artists.edit"]) return forbidden();
 */

// -- All permission keys ---------------------------------------------------

export const ALL_PERMISSIONS = [
  // Lineup
  "lineup.view",
  "lineup.edit",
  "lineup.publish",

  // Artists
  "artists.view",
  "artists.edit",
  "artists.delete",

  // Crew
  "crew.view",
  "crew.edit",
  "crew.delete",

  // Flights
  "flights.view",
  "flights.edit",

  // Hotels
  "hotels.view",
  "hotels.edit",

  // Ground transport
  "ground.view",
  "ground.edit",

  // Riders
  "riders.view",
  "riders.edit",

  // Contracts
  "contracts.view",
  "contracts.edit",
  "contracts.send",

  // Payments
  "payments.view",
  "payments.edit",

  // Guestlist
  "guestlist.view",
  "guestlist.edit",

  // Documents
  "documents.view",
  "documents.upload",

  // Festival admin
  "festival.settings",
  "festival.create",
  "festival.delete",

  // Workspace admin
  "workspace.settings",
  "workspace.team",
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];
export type PermissionMap = Record<PermissionKey, boolean>;
export type PermissionOverrides = Partial<Record<PermissionKey, boolean>>;

// -- Role labels -----------------------------------------------------------

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

// -- Permission groups (for UI rendering) ---------------------------------

export const PERMISSION_GROUPS: {
  label: string;
  keys: readonly PermissionKey[];
}[] = [
  {
    label: "Lineup",
    keys: ["lineup.view", "lineup.edit", "lineup.publish"],
  },
  {
    label: "Artists",
    keys: ["artists.view", "artists.edit", "artists.delete"],
  },
  {
    label: "Crew",
    keys: ["crew.view", "crew.edit", "crew.delete"],
  },
  {
    label: "Travel",
    keys: [
      "flights.view",
      "flights.edit",
      "hotels.view",
      "hotels.edit",
      "ground.view",
      "ground.edit",
    ],
  },
  {
    label: "Riders",
    keys: ["riders.view", "riders.edit"],
  },
  {
    label: "Contracts",
    keys: ["contracts.view", "contracts.edit", "contracts.send"],
  },
  {
    label: "Payments",
    keys: ["payments.view", "payments.edit"],
  },
  {
    label: "Guestlist",
    keys: ["guestlist.view", "guestlist.edit"],
  },
  {
    label: "Documents",
    keys: ["documents.view", "documents.upload"],
  },
  {
    label: "Festival",
    keys: ["festival.settings", "festival.create", "festival.delete"],
  },
  {
    label: "Workspace",
    keys: ["workspace.settings", "workspace.team"],
  },
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "lineup.view": "View lineup",
  "lineup.edit": "Edit lineup",
  "lineup.publish": "Publish / announce batches",
  "artists.view": "View artists",
  "artists.edit": "Edit artist profiles",
  "artists.delete": "Delete artists",
  "crew.view": "View crew",
  "crew.edit": "Edit crew profiles",
  "crew.delete": "Delete crew",
  "flights.view": "View flights",
  "flights.edit": "Edit flights",
  "hotels.view": "View hotels",
  "hotels.edit": "Edit hotels & room blocks",
  "ground.view": "View ground transport",
  "ground.edit": "Edit pickups",
  "riders.view": "View riders",
  "riders.edit": "Edit / upload riders",
  "contracts.view": "View contracts",
  "contracts.edit": "Edit contracts",
  "contracts.send": "Send contracts",
  "payments.view": "View payments",
  "payments.edit": "Edit payments & mark paid",
  "guestlist.view": "View guestlist",
  "guestlist.edit": "Edit guestlist",
  "documents.view": "View documents",
  "documents.upload": "Upload documents",
  "festival.settings": "Edit festival settings",
  "festival.create": "Create festivals",
  "festival.delete": "Delete festivals",
  "workspace.settings": "Edit workspace settings",
  "workspace.team": "Manage team members",
};

// -- Role default presets -------------------------------------------------

const OWNER_DEFAULTS: PermissionMap = Object.fromEntries(
  ALL_PERMISSIONS.map((k) => [k, true]),
) as PermissionMap;

const ADMIN_DEFAULTS: PermissionMap = {
  ...OWNER_DEFAULTS,
  "festival.delete": false,
};

const MEMBER_DEFAULTS: PermissionMap = {
  "lineup.view": true,
  "lineup.edit": true,
  "lineup.publish": false,
  "artists.view": true,
  "artists.edit": true,
  "artists.delete": false,
  "crew.view": true,
  "crew.edit": true,
  "crew.delete": false,
  "flights.view": true,
  "flights.edit": true,
  "hotels.view": true,
  "hotels.edit": true,
  "ground.view": true,
  "ground.edit": true,
  "riders.view": true,
  "riders.edit": true,
  "contracts.view": true,
  "contracts.edit": true,
  "contracts.send": false,
  "payments.view": false,
  "payments.edit": false,
  "guestlist.view": true,
  "guestlist.edit": true,
  "documents.view": true,
  "documents.upload": true,
  "festival.settings": false,
  "festival.create": false,
  "festival.delete": false,
  "workspace.settings": false,
  "workspace.team": false,
};

const VIEWER_DEFAULTS: PermissionMap = Object.fromEntries(
  ALL_PERMISSIONS.map((k) => [k, k.endsWith(".view")]),
) as PermissionMap;

export const ROLE_DEFAULTS: Record<string, PermissionMap> = {
  owner: OWNER_DEFAULTS,
  admin: ADMIN_DEFAULTS,
  member: MEMBER_DEFAULTS,
  viewer: VIEWER_DEFAULTS,
};

// -- Helpers ---------------------------------------------------------------

/**
 * Merge role defaults with stored sparse overrides -> final resolved map.
 * Falls back to viewer defaults for unknown roles.
 */
export function resolvePermissions(
  role: string | null | undefined,
  overrides: PermissionOverrides = {},
): PermissionMap {
  const defaults = (role ? ROLE_DEFAULTS[role] : null) ?? VIEWER_DEFAULTS;
  return { ...defaults, ...overrides } as PermissionMap;
}

export function can(perms: PermissionMap, key: PermissionKey): boolean {
  return perms[key] === true;
}

export function hasCustomPermissions(
  role: string,
  overrides: PermissionOverrides,
): boolean {
  const defaults = ROLE_DEFAULTS[role] ?? VIEWER_DEFAULTS;
  return Object.entries(overrides).some(
    ([k, v]) => defaults[k as PermissionKey] !== v,
  );
}
