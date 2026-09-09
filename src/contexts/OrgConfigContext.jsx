import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { DEFAULT_HIERARCHY } from "../utils/hierarchy";

const OrgConfigContext = createContext(null);

const DEFAULT_CONFIG = {
  org_id: null,
  org_name: "",
  is_setup: false,
  recurring_event_type: "Cells",
  hierarchy: DEFAULT_HIERARCHY.map((h) => ({ ...h })),
  roles: [],
  top_leaders: { male: null, female: null },
  allows_create_event: true,
  allows_create_event_type: true,
};

function normalizeHierarchy(h) {
  if (!Array.isArray(h) || h.length === 0) {
    return DEFAULT_HIERARCHY.map((x) => ({ ...x }));
  }
  return h
    .map((lv) => ({
      key: lv.key || lv.field || "leader" + (lv.level ?? ""),
      field: lv.key || lv.field || "leader" + (lv.level ?? ""),
      label: lv.label || lv.key || lv.field || "Level " + (lv.level ?? ""),
      level: Number.isFinite(lv.level) ? lv.level : (lv.level ?? 0),
    }))
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
}

export const OrgConfigProvider = ({ children }) => {
  const [orgConfig, setOrgConfig] = useState(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [orgError, setOrgError] = useState(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const reload = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    setConfigLoaded(false);
    setOrgError(null);
    if (!token) {
      setOrgConfig(DEFAULT_CONFIG);
      setConfigLoaded(true);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/org-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrgConfig({
          ...DEFAULT_CONFIG,
          ...data,
          hierarchy: normalizeHierarchy(data.hierarchy),
        });
      } else if (res.status === 404) {
        setOrgConfig(DEFAULT_CONFIG);
      } else {
        setOrgError(`Failed to load org config (${res.status})`);
        setOrgConfig(DEFAULT_CONFIG);
      }
    } catch (err) {
      setOrgError(err.message || "Failed to load org config");
      setOrgConfig(DEFAULT_CONFIG);
    } finally {
      setConfigLoaded(true);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveOrgConfig = useCallback(
    async (patch) => {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${BACKEND_URL}/org-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        let detail = `Save failed (${res.status})`;
        try {
          const body = await res.json();
          if (body.detail) detail = Array.isArray(body.detail) ? body.detail.join("; ") : body.detail;
        } catch {
          /* ignore */
        }
        const err = new Error(detail);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      setOrgConfig({
        ...DEFAULT_CONFIG,
        ...data,
        hierarchy: normalizeHierarchy(data.hierarchy),
      });
      return data;
    },
    [BACKEND_URL],
  );

  const getHierarchyLabel = (level) =>
    orgConfig?.hierarchy?.find((h) => h.level === level)?.label || `Level ${level}`;
  const getHierarchyField = (level) =>
    orgConfig?.hierarchy?.find((h) => h.level === level)?.field || `leader${level}`;
  const getAllHierarchyLevels = () => orgConfig?.hierarchy || DEFAULT_CONFIG.hierarchy;
  const isSetup = useMemo(() => {
    if (typeof orgConfig?.is_setup === "boolean") return orgConfig.is_setup;
    return Array.isArray(orgConfig?.hierarchy) && orgConfig.hierarchy.length > 0;
  }, [orgConfig]);
  const isRecurringType = (eventTypeName) => {
    if (!eventTypeName) return false;
    const recurringType = orgConfig?.recurring_event_type || "Cells";
    return (
      eventTypeName === "all" ||
      eventTypeName.toLowerCase() === recurringType.toLowerCase() ||
      eventTypeName.toLowerCase() === "cells"
    );
  };
  const canCreateEventType = orgConfig?.allows_create_event_type !== false;
  const canCreateEvent = orgConfig?.allows_create_event !== false;

  return (
    <OrgConfigContext.Provider
      value={{
        orgConfig,
        configLoaded,
        orgError,
        reload,
        saveOrgConfig,
        getHierarchyLabel,
        getHierarchyField,
        getAllHierarchyLevels,
        isRecurringType,
        canCreateEventType,
        canCreateEvent,
        recurringEventType: orgConfig?.recurring_event_type || "Cells",
        topLeaders: orgConfig?.top_leaders || { male: null, female: null },
        orgName: orgConfig?.org_name || "",
        isSetup,
      }}
    >
      {children}
    </OrgConfigContext.Provider>
  );
};

export const useOrgConfig = () => {
  const ctx = useContext(OrgConfigContext);
  if (!ctx) throw new Error("useOrgConfig must be inside OrgConfigProvider");
  return ctx;
};