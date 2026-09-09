import React, { useContext, useMemo } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useOrgConfig } from "../contexts/OrgConfigContext";
import { normalizeRole } from "./roleNormalizer";

export const CAPABILITY_LIST = [
  { key: "admin", label: "Admin" },
  { key: "manage_org", label: "Manage organisation" },
  { key: "view_people", label: "View people" },
  { key: "manage_people", label: "Manage people" },
  { key: "reassign_people", label: "Reassign people" },
  { key: "create_events", label: "Create events" },
  { key: "close_events", label: "Close events" },
  { key: "view_stats", label: "View stats" },
  { key: "checkin", label: "Check-in" },
];

const ALL_CAPABILITIES = CAPABILITY_LIST.map((c) => c.key);

export const DEFAULT_ROLES = [
  { key: "admin", label: "Admin", capabilities: ["admin", "manage_org", "view_people", "manage_people", "reassign_people", "create_events", "close_events", "view_stats", "checkin"] },
  { key: "leader", label: "Leader", capabilities: ["view_people", "manage_people", "create_events", "close_events", "view_stats", "checkin"] },
  { key: "user", label: "Member", capabilities: ["checkin"] },
];

const LEGACY_ROLE_CAPS = {
  admin: ALL_CAPABILITIES,
  supreme_admin: ALL_CAPABILITIES,
  manager: ["admin", "manage_org", "view_people", "manage_people", "reassign_people", "create_events", "close_events", "view_stats", "checkin"],
  adminleader: ["admin", "manage_org", "view_people", "manage_people", "reassign_people", "create_events", "close_events", "view_stats", "checkin"],
  leader: ["view_people", "manage_people", "create_events", "close_events", "view_stats", "checkin"],
  leaderat1: ["view_people", "manage_people", "create_events", "close_events", "view_stats", "checkin"],
  leaderat12: ["view_people", "manage_people", "create_events", "close_events", "view_stats", "checkin"],
  leader12: ["view_people", "manage_people", "create_events", "close_events", "view_stats", "checkin"],
  pastor: ["view_people", "manage_people", "create_events", "close_events", "view_stats", "checkin"],
  evangelist: ["view_people", "manage_people", "create_events", "close_events", "view_stats", "checkin"],
  secretary: ["view_people", "manage_people", "create_events", "view_stats", "checkin"],
  registrant: ["checkin"],
  user: ["checkin"],
};

export function resolveCapabilities(orgConfig, roleKey) {
  const raw = Array.isArray(orgConfig?.roles) ? orgConfig.roles : [];
  const normalizedRole = normalizeRole(roleKey);
  const match = raw.find((r) => normalizeRole(r?.key) === normalizedRole);
  if (match && Array.isArray(match.capabilities)) {
    return Array.from(new Set(match.capabilities));
  }
  return LEGACY_ROLE_CAPS[normalizedRole] || ["view_people", "checkin"];
}

export function roleHasCapability(orgConfig, roleKey, capability) {
  return resolveCapabilities(orgConfig, roleKey).includes(capability);
}

export function useCapabilities() {
  const { user } = useContext(AuthContext);
  const { orgConfig } = useOrgConfig();

  const capabilities = useMemo(
    () => resolveCapabilities(orgConfig, user?.role),
    [orgConfig, user?.role],
  );

  const can = React.useCallback(
    (capability) => capabilities.includes("admin") || capabilities.includes(capability),
    [capabilities],
  );

  return { capabilities, can, userRole: user?.role, orgConfig };
}