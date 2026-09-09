import { useEffect, useState, useMemo, useContext, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, useTheme, MenuItem,
  Box, Alert, Collapse, CircularProgress,
} from "@mui/material";
import { Groups as LeaderIcon } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../contexts/AuthContext";
import { useCapabilities } from "../utils/capabilities";
import { DEFAULT_HIERARCHY } from "../utils/hierarchy";

const LEGACY_LEADER_KEYS = ["leader1", "leader12", "leader144"];

const leaderFormKey = (lv) =>
  LEGACY_LEADER_KEYS.includes(lv.key) ? lv.key : "__h_" + lv.key;

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const CACHE_DURATION = 30 * 60 * 1000;

const initialFormState = {
  name: "", surname: "", dob: "", address: "", email: "",
  number: "", gender: "", invitedBy: "", invitedById: "",
  leader1: "", leader1Id: "",
  leader12: "", leader12Id: "",
  leader144: "", leader144Id: "",
  stage: "Win",
};

const uniformInputSx = {
  "& .MuiOutlinedInput-root": { height: "50px", borderRadius: "15px" },
  "& .MuiOutlinedInput-input": { fontSize: "0.95rem", padding: "10px 10px" },
  "& .MuiInputLabel-root": { fontSize: "0.95rem" },
  "& .MuiSelect-select": { fontSize: "0.95rem", padding: "10px 10px" },
};

// ── Module-level store — lives outside React, never causes re-renders ─────────
const peopleStore = {
  list: [],
  ready: false,
  loading: false,
  ts: 0,
};

const mapPerson = (raw) => {
  const name    = (raw.Name    || raw.name    || "").toString().trim();
  const surname = (raw.Surname || raw.surname || "").toString().trim();
  const fullName = `${name} ${surname}`.trim();
  const email   = (raw.Email   || raw.email   || "").toString().trim();
  const phone   = (raw.Number  || raw.phone   || raw.Phone || "").toString().trim();

  let leader1   = raw["Leader @1"]   || raw["leader @1"]   || raw.leader1   || raw["Leader at 1"]   || "";
  let leader12  = raw["Leader @12"]  || raw["leader @12"]  || raw.leader12  || raw["Leader at 12"]  || "";
  let leader144 = raw["Leader @144"] || raw["leader @144"] || raw.leader144 || raw["Leader at 144"] || "";

  if ((!leader1 || !leader12) && Array.isArray(raw.leaders)) {
    for (const l of raw.leaders) {
      const n = l.name || "";
      if (l.level === 1   && !leader1)   leader1   = n;
      if (l.level === 12  && !leader12)  leader12  = n;
      if (l.level === 144 && !leader144) leader144 = n;
    }
  }

  return {
    _id: (raw._id || raw.id || "").toString(),
    name, surname, email, phone, fullName,
    fullNameLower: fullName.toLowerCase(),
    searchText: `${fullName} ${email} ${phone}`.toLowerCase(),
    leader1, leader12, leader144,
    leader1Id: raw.leader1Id || raw["Leader @1 Id"] || "",
    leader12Id: raw.leader12Id || raw["Leader @12 Id"] || "",
    leader144Id: raw.leader144Id || raw["Leader @144 Id"] || "",
    // Generic leader map for any org hierarchy (object or legacy array/fields)
    leader_values: extractLeaderValues(raw),
  };
};

function extractLeaderValues(raw) {
  const out = {};
  if (raw?.leaders && typeof raw.leaders === "object" && !Array.isArray(raw.leaders)) {
    for (const [k, v] of Object.entries(raw.leaders)) {
      if (v) out[k] = String(v);
    }
  }
  if (Array.isArray(raw?.leaders)) {
    for (const l of raw.leaders) {
      if (l?.level != null && l?.name) out["leader" + l.level] = String(l.name);
    }
  }
  for (const [k, v] of Object.entries(raw || {})) {
    if (k.startsWith("leader")) {
      const num = k.replace(/\D/g, "");
      if (num && v) out[k] = String(v);
    }
  }
  for (const k of ["Leader @1", "Leader @12", "Leader @144", "Leader @1728"]) {
    if (raw?.[k]) out["leader" + k.match(/\d+/)?.[0] || ""] = String(raw[k]);
  }
  return out;
}

// Synchronous in-memory search — instant, no debounce needed
const searchPeople = (term) => {
  if (!term || term.length < 1) return [];
  const t = term.toLowerCase().trim();
  const results = [];
  for (const p of peopleStore.list) {
    if (p.searchText.includes(t)) {
      results.push(p);
      if (results.length >= 40) break;
    }
  }
  return results;
};

const capitaliseWords = (str) =>
  str.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "")).join(" ");

const digitsOnly = (str) => str.replace(/[^\d+]/g, "");

const useDebounce = (value, delay) => {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return dv;
};

function extractLeaders(person) {
  if (!person) return { leader1: "", leader12: "", leader144: "" };
  if (Array.isArray(person.leaders) && person.leaders.length) {
    let l1 = "", l12 = "", l144 = "";
    for (const l of person.leaders) {
      if (l.level === 1   && !l1)   l1   = l.name || "";
      if (l.level === 12  && !l12)  l12  = l.name || "";
      if (l.level === 144 && !l144) l144 = l.name || "";
    }
    if (l1 || l12 || l144) return { leader1: l1, leader12: l12, leader144: l144 };
  }
  return {
    leader1:   person["Leader @1"]   || person.leader1   || "",
    leader12:  person["Leader @12"]  || person.leader12  || "",
    leader144: person["Leader @144"] || person.leader144 || "",
  };
}

function normalizeLeaderChain({ leader1, leader12, leader144 }) {
  const normalized = [leader1, leader12, leader144]
    .filter(Boolean)
    .map((name) => name.trim())
    .filter((name, index, arr) => arr.indexOf(name) === index);

  return {
    leader1: normalized[0] || "",
    leader12: normalized[1] || "",
    leader144: normalized[2] || "",
  };
}

// ─── PeopleSearchField ────────────────────────────────────────────────────────
function PeopleSearchField({ label, value, onChange, disabled, error }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [inputVal, setInputVal] = useState(value || "");
  const [results,  setResults]  = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => { setInputVal(value || ""); }, [value]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    onChange(val, null);
    if (val.trim().length >= 1) {
      if (peopleStore.ready) {
        const hits = searchPeople(val);
        setResults(hits);
        setShowDrop(true);
      } else {
        setResults([]);
        setShowDrop(true);
      }
    } else {
      setShowDrop(false);
      setResults([]);
    }
  };

  const handleSelect = (person) => {
    setInputVal(person.fullName);
    setResults([]);
    setShowDrop(false);
    onChange(person.fullName, person);
  };

  const fieldId = `psf-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const border      = error ? "#d32f2f" : (isDark ? "rgba(255,255,255,0.23)" : "rgba(0,0,0,0.23)");
  const hoverBorder = error ? "#d32f2f" : (isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.4)");
  const focusBorder = error ? "#d32f2f" : theme.palette.primary.main;

  let displayBorder = border;
  if (isFocused) displayBorder = focusBorder;
  else if (isHovering && !disabled) displayBorder = hoverBorder;

  return (
    <Box ref={wrapRef} sx={{ position: "relative", mt: "16px", mb: "8px" }}>
      <Box sx={{ position: "relative" }}>
        <input
          id={fieldId}
          type="text" value={inputVal} disabled={disabled}
          autoComplete="off" placeholder={label}
          onChange={handleChange}
          onMouseEnter={() => !disabled && setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onFocus={() => {
            setIsFocused(true);
            if (inputVal.trim().length >= 1 && peopleStore.ready) {
              const hits = searchPeople(inputVal);
              setResults(hits);
              setShowDrop(true);
            } else if (inputVal.trim().length >= 1) {
              setShowDrop(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => { if (e.key === "Escape") setShowDrop(false); }}
          style={{
            width: "100%", height: "50px", padding: "10px 14px",
            fontSize: "0.95rem", borderRadius: "15px",
            border: `1px solid ${displayBorder}`,
            background: "transparent",
            color: theme.palette.text.primary, outline: "none",
            boxSizing: "border-box", fontFamily: "inherit",
            cursor: disabled ? "not-allowed" : "text",
            transition: "border-color 0.2s ease",
          }}
        />
      </Box>

      {error && (
        <Typography sx={{ fontSize: "0.75rem", color: "#d32f2f", mt: "3px", ml: "14px" }}>{error}</Typography>
      )}
      {!peopleStore.ready && (
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mt: "4px", ml: "14px" }}>
          <CircularProgress size={11} />
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
            {peopleStore.loading ? "Loading people data, search will be ready shortly…" : "Preparing search…"}
          </Typography>
        </Box>
      )}

      {showDrop && (
        <Box sx={{
          position: "absolute", top: "100%", left: 0, right: 0, mt: "4px",
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "8px", boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
          zIndex: 9999, maxHeight: "240px", overflowY: "auto",
        }}>
          {results.length > 0 ? results.map((person, idx) => (
            <Box
              key={person._id || `${person.fullName}-${idx}`}
              onMouseDown={() => handleSelect(person)}
              sx={{
                px: 2, py: 1.2, cursor: "pointer",
                borderBottom: `1px solid ${theme.palette.divider}`,
                "&:last-child": { borderBottom: "none" },
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 500, color: "text.primary" }}>
                {person.fullName}
              </Typography>
              {(person.email || person.phone) && (
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                  {[person.email, person.phone].filter(Boolean).join(" · ")}
                </Typography>
              )}
            </Box>
          )) : (
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                {!peopleStore.ready ? "Still loading people…" : "No matches found"}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── AddressSearchField ───────────────────────────────────────────────────────
function AddressSearchField({ value, onChange, error, disabled }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [inputVal,    setInputVal]    = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showDrop,    setShowDrop]    = useState(false);
  const [isHovering,  setIsHovering]  = useState(false);
  const [isFocused,   setIsFocused]   = useState(false);
  const wrapRef   = useRef(null);
  const debounced = useDebounce(inputVal, 300);

  useEffect(() => { setInputVal(value || ""); }, [value]);

  useEffect(() => {
    if (!debounced || debounced.length < 2 || !GEOAPIFY_API_KEY) { setSuggestions([]); return; }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(debounced)}&apiKey=${GEOAPIFY_API_KEY}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => { setSuggestions(d.features?.map((f) => f.properties.formatted).filter(Boolean) || []); if (debounced.length >= 2) setShowDrop(true); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [debounced]);

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const border      = error ? "#d32f2f" : (isDark ? "rgba(255,255,255,0.23)" : "rgba(0,0,0,0.23)");
  const hoverBorder = error ? "#d32f2f" : (isDark ? "rgba(255,255,255,0.4)"  : "rgba(0,0,0,0.4)");
  const focusBorder = error ? "#d32f2f" : theme.palette.primary.main;

  let displayBorder = border;
  if (isFocused) displayBorder = focusBorder;
  else if (isHovering && !disabled) displayBorder = hoverBorder;

  return (
    <Box ref={wrapRef} sx={{ position: "relative", mt: "16px", mb: "8px" }}>
      <Box sx={{ position: "relative" }}>
        <input
          type="text" value={inputVal} disabled={disabled}
          autoComplete="off" placeholder="Home Address *"
          onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); setShowDrop(false); }}
          onMouseEnter={() => !disabled && setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onFocus={() => { setIsFocused(true); if (suggestions.length) setShowDrop(true); }}
          onBlur={() => setIsFocused(false)}
          style={{
            width: "100%", height: "50px", padding: "10px 14px",
            fontSize: "0.95rem", borderRadius: "15px",
            border: `1px solid ${displayBorder}`,
            background: "transparent",
            color: theme.palette.text.primary, outline: "none",
            boxSizing: "border-box", fontFamily: "inherit",
            transition: "border-color 0.2s ease",
          }}
        />
      </Box>
      {error  && <Typography sx={{ fontSize: "0.75rem", color: "#d32f2f", mt: "3px", ml: "14px" }}>{error}</Typography>}
      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mt: "4px", ml: "14px" }}>
          <CircularProgress size={11} />
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>Searching addresses…</Typography>
        </Box>
      )}

      {showDrop && suggestions.length > 0 && (
        <Box sx={{
          position: "absolute", top: "100%", left: 0, right: 0, mt: "4px",
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: "8px", boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
          zIndex: 9999, maxHeight: "220px", overflowY: "auto",
        }}>
          {suggestions.map((addr, idx) => (
            <Box key={idx} onMouseDown={() => { setInputVal(addr); onChange(addr); setShowDrop(false); }}
              sx={{
                px: 2, py: 1.2, cursor: "pointer", fontSize: "0.88rem",
                color: "text.primary",
                borderBottom: `1px solid ${theme.palette.divider}`,
                "&:last-child": { borderBottom: "none" },
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {addr}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────
export default function AddPersonDialog({
  open, onClose, onSave, formData, setFormData,
  isEdit = false, personId = null, editingPersonObject = null,
  hierarchyLevels = [], editLeaderValues = {},
}) {
  const { authFetch } = useContext(AuthContext);
  const { can } = useCapabilities();

  const leaderLevels = useMemo(() => {
    const src = Array.isArray(hierarchyLevels) && hierarchyLevels.length > 0
      ? hierarchyLevels
      : DEFAULT_HIERARCHY;
    return [...src].sort((a, b) => (a.level || 0) - (b.level || 0));
  }, [hierarchyLevels]);

  const firstLevel = leaderLevels[0];

  const resetLeaderFields = (base) => {
    const next = { ...base };
    leaderLevels.forEach((lv) => {
      next[leaderFormKey(lv)] = "";
      next[leaderFormKey(lv) + "Id"] = "";
    });
    return next;
  };

  const [errors,           setErrors]           = useState({});
  const [isSubmitting,     setIsSubmitting]      = useState(false);
  const [showLeaderFields, setShowLeaderFields]  = useState(false);
  const [originalFormData, setOriginalFormData]  = useState(null);
  const [peopleReady,      setPeopleReady]       = useState(peopleStore.ready);

  useEffect(() => {
    if (!open) return;

    if (peopleStore.ready && Date.now() - peopleStore.ts < CACHE_DURATION) {
      setPeopleReady(true);
      return;
    }

    if (peopleStore.loading) return;

    const flatCache = Array.isArray(window.globalPeopleCache) ? window.globalPeopleCache : null;
    const objCache  = window.globalPeopleCache?.data;
    const cacheTs   = window.globalCacheTimestamp || window.globalPeopleCache?.timestamp || 0;

    if (flatCache?.length > 0 && Date.now() - cacheTs < CACHE_DURATION) {
      peopleStore.list  = flatCache.map((p) => p.searchText ? p : mapPerson(p)).filter((p) => p.fullName);
      peopleStore.ready = true;
      peopleStore.ts    = cacheTs;
      setPeopleReady(true);
      return;
    }
    if (objCache?.length > 0 && Date.now() - cacheTs < CACHE_DURATION) {
      peopleStore.list  = objCache.map((p) => p.searchText ? p : mapPerson(p)).filter((p) => p.fullName);
      peopleStore.ready = true;
      peopleStore.ts    = cacheTs;
      setPeopleReady(true);
      return;
    }

    peopleStore.loading = true;
    setPeopleReady(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let didCancel = false;

    (async () => {
      try {
        let rawPeople = [];
        const res = await authFetch(`${BASE_URL}/cache/people`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          rawPeople = data?.cached_data || data?.results || data?.people || [];
        }
        if (rawPeople.length === 0) {
          const res2 = await authFetch(`${BASE_URL}/people?perPage=500`, { signal: controller.signal });
          if (res2.ok) {
            const d2 = await res2.json();
            rawPeople = d2?.results || d2?.people || [];
          }
        }
        if (rawPeople.length > 0) {
          const mapped = rawPeople.map(mapPerson).filter((p) => p.fullName);
          peopleStore.list  = mapped;
          peopleStore.ready = true;
          peopleStore.ts    = Date.now();
          window.globalPeopleCache    = mapped;
          window.globalCacheTimestamp = Date.now();
        } else {
          peopleStore.ready = true;
          peopleStore.ts    = Date.now();
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error("AddPersonDialog: failed to load people", err);
        peopleStore.ready = true;
        peopleStore.ts    = Date.now();
      } finally {
        clearTimeout(timeoutId);
        peopleStore.loading = false;
        if (!didCancel) setPeopleReady(peopleStore.ready);
      }
    })();

    return () => { didCancel = true; controller.abort(); clearTimeout(timeoutId); };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      setErrors({});
      setShowLeaderFields(false);
      setOriginalFormData(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isEdit || !editingPersonObject) return;
    const leaders   = extractLeaders(editingPersonObject);
    const src       = editingPersonObject;
    const leaderInit = {};
    for (const lv of leaderLevels) {
      const key = leaderFormKey(lv);
      const legacyVal =
        lv.key === "leader1" ? leaders.leader1 :
        lv.key === "leader12" ? leaders.leader12 :
        lv.key === "leader144" ? leaders.leader144 : "";
      leaderInit[key] =
        (src.leader_values?.[lv.key] ?? "") ||
        (src.leaders?.[lv.key] ?? "") ||
        (editLeaderValues?.[lv.key] ?? "") || legacyVal;
      leaderInit[key + "Id"] = src[lv.key + "Id"] || "";
    }
    const initData = {
      name:      src.name      || src.Name      || "",
      surname:   src.surname   || src.Surname   || "",
      dob:       (src.dob || src.birthday || src.Birthday || "").replace(/\//g, "-"),
      address:   src.location  || src.address   || src.homeAddress || src.Address || "",
      email:     src.email     || src.Email     || "",
      number:    src.number    || src.phone     || src.Number || src.Phone || "",
      gender:    src.gender    || src.Gender    || "",
      invitedBy: src.invitedBy || src.InvitedBy || "",
      ...leaderInit,
      stage:     src.stage     || src.Stage     || "Win",
    };
    setFormData((prev) => ({ ...prev, ...initData }));
    setOriginalFormData(initData);
    setShowLeaderFields(leaderLevels.length > 1);
  }, [open, isEdit, editingPersonObject, leaderLevels, editLeaderValues]);

  const canEditLeaders = can("manage_people") || can("admin");

  const hasChanges = useMemo(() => {
    if (!isEdit || !originalFormData) return true;
    return Object.keys(originalFormData).some((k) => (formData[k] || "") !== (originalFormData[k] || ""));
  }, [isEdit, formData, originalFormData]);

  const validate = () => {
    const required = ["name", "surname", "dob", "address", "email", "number", "gender", leaderFormKey(firstLevel)];
    const errs = {};
    required.forEach((f) => { if (!formData[f]?.trim()) errs[f] = "This field is required"; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const isFormValid = () =>
    ["name", "surname", "dob", "address", "email", "number", "gender", leaderFormKey(firstLevel)]
      .every((f) => formData[f]?.toString().trim() !== "");

  const handleSaveClick = async () => {
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!isEdit) {
        const norm = (s) => (s || "").toString().trim().toLowerCase();
        const dupFull = `${norm(formData.name)} ${norm(formData.surname)}`.trim();
        const dupEmail = norm(formData.email);
        const dupPhone = digitsOnly(formData.number || "");
        const existingDup = peopleStore.list.find((p) => {
          const pEmail = norm(p.email);
          if (dupEmail && pEmail && dupEmail === pEmail) return true;
          const pFull = p.fullNameLower || `${norm(p.name)} ${norm(p.surname)}`.trim();
          const pPhone = digitsOnly(p.phone || "");
          return dupFull && pFull && dupFull === pFull && dupPhone && pPhone && dupPhone === pPhone;
        });
        if (existingDup) {
          toast.warning(
            `A person with this email or name already exists (${existingDup.fullName || existingDup.email}). Search and select the existing person instead of creating a duplicate.`,
          );
          return;
        }
      }

      const hierarchyLeaders = {};
      for (const lv of leaderLevels) {
        const v = (formData[leaderFormKey(lv)] || "").toString().trim();
        if (v) hierarchyLeaders[lv.key] = v;
      }

      const normalizedLeaders = normalizeLeaderChain({
        leader1: hierarchyLeaders.leader1 || formData.leader1,
        leader12: hierarchyLeaders.leader12 || formData.leader12,
        leader144: hierarchyLeaders.leader144 || formData.leader144,
      });

      const firstLevelId =
        formData[leaderFormKey(firstLevel) + "Id"] || formData.leader1Id || formData.invitedById || "";

      const payload = {
        invitedBy: formData.invitedBy || "",
        invitedById: formData.invitedById || "",
        name: formData.name, surname: formData.surname,
        gender: formData.gender, email: formData.email,
        number: formData.number, phone: formData.number,
        dob: formData.dob ? formData.dob.replace(/-/g, "/") : "",
        address: formData.address,
        // Canonical per-org leader map (new backend / dual-write source)
        hierarchy_leaders: hierarchyLeaders,
        leaders: [
          normalizedLeaders.leader1,
          normalizedLeaders.leader12,
          normalizedLeaders.leader144,
          "",
        ],
        // leaderId is what your backend's create_person endpoint checks first
        leaderId: firstLevelId,
        stage: formData.stage || "Win",
      };

      if (isEdit && personId) {
        const response = await authFetch(`${BASE_URL}/people/${personId}`, { method: "PATCH", body: JSON.stringify(payload) });
        if (response.ok) {
          const data = await response.json();
          onSave({
            _id: personId,
            name: data.person?.Name || payload.name,
            surname: data.person?.Surname || payload.surname,
            email: data.person?.Email || payload.email,
            number: data.person?.Number || payload.number,
            phone: data.person?.Number || payload.number,
            gender: data.person?.Gender || payload.gender,
            address: data.person?.Address || payload.address,
            birthday: data.person?.Birthday || payload.dob,
            invitedBy: data.person?.InvitedBy || payload.invitedBy,
            leader1: data.person?.["Leader @1"] ?? formData.leader1 ?? "",
            leader12: data.person?.["Leader @12"] ?? formData.leader12 ?? "",
            leader144: data.person?.["Leader @144"] ?? formData.leader144 ?? "",
            stage: data.person?.Stage || payload.stage || "Win",
            leaders: hierarchyLeaders,
            fullName: `${payload.name} ${payload.surname}`.trim(),
            __updatedNewPerson: true,
          });
        } else {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Update failed (${response.status})`);
        }
      } else {
        const response = await authFetch(`${BASE_URL}/people`, { method: "POST", body: JSON.stringify(payload) });
        if (response.ok) {
          const data = await response.json();
          const created = data.person || data;
          peopleStore.ready = false;
          onSave({
            ...data,
            person: {
              ...created,
              leaders: hierarchyLeaders,
              leader1:   created["Leader @1"]   || created.leader1   || "",
              leader12:  created["Leader @12"]  || created.leader12  || "",
              leader144: created["Leader @144"] || created.leader144 || "",
            },
          });
        } else {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Save failed (${response.status})`);
        }
      }

      if (!isEdit) setFormData(resetLeaderFields(initialFormState));
      onClose();
    } catch (err) {
      toast.error(`Error: ${err.message || "An error occurred"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    if (!isEdit) setFormData(resetLeaderFields(initialFormState));
    onClose();
  };

  const renderTextField = (name, label, options = {}) => {
    const { select, selectOptions, type } = options;
    const currentValue = formData[name] || "";
    const onChange = (e) => {
      let val = e.target.value;
      if (name === "name" || name === "surname") val = capitaliseWords(val);
      if (name === "number") val = digitsOnly(val);
      setFormData((p) => ({ ...p, [name]: val }));
      setErrors((p) => ({ ...p, [name]: "" }));
    };
    return (
      <TextField
        margin="normal" fullWidth label={label} name={name}
        type={type || "text"} select={select} disabled={isSubmitting}
        value={currentValue} onChange={onChange}
        error={!!errors[name]} helperText={errors[name]}
        InputLabelProps={{ shrink: type === "date" || Boolean(currentValue) }}
        inputProps={name === "number" ? { inputMode: "tel" } : undefined}
        sx={uniformInputSx}
      >
        {select && selectOptions.map((opt) => (
          <MenuItem key={opt} value={opt} sx={{ fontSize: "0.95rem" }}>{opt}</MenuItem>
        ))}
      </TextField>
    );
  };

  return (
    <Dialog
      open={open} onClose={handleClose} maxWidth="md" fullWidth
      disableEscapeKeyDown={isSubmitting}
      PaperProps={{ sx: { borderRadius: 3, m: 2, maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h5" component="div">
            {isEdit ? "Update Person" : "Add New Person"}
          </Typography>
          {!peopleReady && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">Loading people…</Typography>
            </Box>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors({})}>
            Please fill in all required fields
          </Alert>
        )}

        <Box>
          {renderTextField("name", "First Name *", { required: true })}
          {renderTextField("surname", "Last Name *", { required: true })}
          {renderTextField("dob", "Date of Birth *", { type: "date", required: true })}

          <PeopleSearchField
            label="Invited By"
            value={formData.invitedBy}
            onChange={(val, person) => {
              setFormData((p) => {
                const update = { ...p, invitedBy: val };
                if (person) {
                  update.invitedById = person._id || "";

                  const ancestors = leaderLevels
                    .map((lv) => {
                      const name =
                        person.leader_values?.[lv.key] ||
                        person.leaders?.[lv.key] ||
                        person[lv.key] ||
                        "";
                      return name && name.trim()
                        ? { name, id: person[lv.key + "Id"] || "" }
                        : null;
                    })
                    .filter(Boolean);

                  const inviterName = person.fullName?.trim();
                  const inviterId = person._id || "";
                  if (
                    inviterName &&
                    ancestors.length < leaderLevels.length &&
                    ancestors[ancestors.length - 1]?.name !== inviterName
                  ) {
                    ancestors.push({ name: inviterName, id: inviterId });
                  }

                  const seen = new Set();
                  const uniqueAncestors = ancestors.filter((a) => {
                    if (seen.has(a.name)) return false;
                    seen.add(a.name);
                    return true;
                  });

                  leaderLevels.forEach((lv, idx) => {
                    update[leaderFormKey(lv)] = uniqueAncestors[idx]?.name || "";
                    update[leaderFormKey(lv) + "Id"] = uniqueAncestors[idx]?.id || "";
                  });
                } else {
                  update.invitedById = "";
                  leaderLevels.forEach((lv) => {
                    update[leaderFormKey(lv)] = "";
                    update[leaderFormKey(lv) + "Id"] = "";
                  });
                }
                return update;
              });
              const cleared = { invitedBy: "" };
              leaderLevels.forEach((lv) => { cleared[leaderFormKey(lv)] = ""; });
              setErrors((p) => ({ ...p, ...cleared }));
            }}
            disabled={isSubmitting}
            error={errors.invitedBy}
          />

          <AddressSearchField
            value={formData.address}
            onChange={(val) => { setFormData((p) => ({ ...p, address: val })); setErrors((p) => ({ ...p, address: "" })); }}
            error={errors.address}
            disabled={isSubmitting}
          />

          {renderTextField("email", "Email Address *", { type: "email", required: true })}
          {renderTextField("number", "Phone Number *", { required: true })}
          {renderTextField("gender", "Gender *", { select: true, selectOptions: ["Male", "Female"], required: true })}

          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>Leadership</Typography>
            {leaderLevels.length > 0 && (
              <PeopleSearchField
                label={`${leaderLevels[0].label} *`}
                value={formData[leaderFormKey(leaderLevels[0])] || ""}
                onChange={(val, person) => {
                  setFormData((p) => ({
                    ...p,
                    [leaderFormKey(leaderLevels[0])]: val,
                    [leaderFormKey(leaderLevels[0]) + "Id"]: person?._id || "",
                  }));
                  setErrors((p) => ({ ...p, [leaderFormKey(leaderLevels[0])]: "" }));
                }}
                disabled={isSubmitting || !canEditLeaders}
                error={errors[leaderFormKey(leaderLevels[0])]}
                required
              />
            )}
          </Box>

          {leaderLevels.length > 1 && (
            <>
              <Collapse in={showLeaderFields}>
                <Box>
                  {leaderLevels.slice(1).map((lv) => (
                    <PeopleSearchField
                      key={lv.key}
                      label={lv.label}
                      value={formData[leaderFormKey(lv)] || ""}
                      onChange={(val, person) => {
                        setFormData((p) => ({
                          ...p,
                          [leaderFormKey(lv)]: val,
                          [leaderFormKey(lv) + "Id"]: person?._id || "",
                        }));
                        setErrors((p) => ({ ...p, [leaderFormKey(lv)]: "" }));
                      }}
                      disabled={isSubmitting || !canEditLeaders}
                    />
                  ))}
                </Box>
              </Collapse>

              <Box sx={{ mt: 1, textAlign: "center" }}>
                <Button onClick={() => setShowLeaderFields((v) => !v)} startIcon={<LeaderIcon />} variant="outlined" color="primary" size="small">
                  {showLeaderFields ? "Hide Additional Leaders" : "Add Additional Leaders"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>Cancel</Button>
        <LoadingButton
          onClick={handleSaveClick} variant="contained" color="primary"
          loading={isSubmitting}
          disabled={!isFormValid() || (isEdit && !hasChanges)}
          sx={{ minWidth: 100 }}
        >
          {isEdit ? "Update" : "Save"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}