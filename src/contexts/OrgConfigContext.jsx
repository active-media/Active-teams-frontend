import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
const OrgConfigContext = createContext(null);

const DEFAULT_CONFIG = {
  org_id: null,  
  org_name: "",
  recurring_event_type: "Cells",
  hierarchy: [
    { level: 1, field: "leader1",   label: "Leader @1"   },
    { level: 2, field: "leader12",  label: "Leader @12"  },
    { level: 3, field: "leader144", label: "Leader @144" }
  ],
  top_leaders: { male: "Gavin Enslin", female: "Vicky Enslin" },
  allows_create_event: true,
  allows_create_event_type: true,
};

export const OrgConfigProvider = ({ children }) => {
  const [orgConfig, setOrgConfig] = useState(DEFAULT_CONFIG);  
  const [configLoaded, setConfigLoaded] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const { authFetch, loading, user } = useContext(AuthContext);

  useEffect(() => {
    if (loading) return;

    const load = async () => {
      setConfigLoaded(false);
      setOrgConfig(DEFAULT_CONFIG);
      try {
        if (!user) {
          setConfigLoaded(true);
          return;
        }
        const res = await authFetch(`${BACKEND_URL}/org-config`);
        if (res.ok) {
          const data = await res.json();
          setOrgConfig(data);
          console.log("Loaded org config:", data.org_name);
        }
      } catch (err) {
        console.warn("Using default org config:", err.message);
        setOrgConfig(DEFAULT_CONFIG);
      } finally {
        setConfigLoaded(true);
      }
    };
    load();
  }, [authFetch, BACKEND_URL, loading, user]);

  const getHierarchyLabel = (level) => {
    const found = orgConfig?.hierarchy?.find(h => h.level === level);
    return found?.label || `Level ${level}`;
  };
  const getHierarchyField = (level) => {
    const found = orgConfig?.hierarchy?.find(h => h.level === level);
    return found?.field || `leader${level}`;
  };
  const getAllHierarchyLevels = () => orgConfig?.hierarchy || DEFAULT_CONFIG.hierarchy;
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
    <OrgConfigContext.Provider value={{
      orgConfig,
      configLoaded,
      getHierarchyLabel,
      getHierarchyField,
      getAllHierarchyLevels,
      isRecurringType,
      canCreateEventType,
      canCreateEvent,
      recurringEventType: orgConfig?.recurring_event_type || "Cells",
    }}>
      {children}
    </OrgConfigContext.Provider>
  );
};

export const useOrgConfig = () => {
  const ctx = useContext(OrgConfigContext);
  if (!ctx) throw new Error("useOrgConfig must be inside OrgConfigProvider");
  return ctx;
};