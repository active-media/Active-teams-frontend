import { useEffect, useState, useCallback, useMemo, useContext, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, useTheme, MenuItem, Autocomplete,
  Box, Alert, Collapse
} from "@mui/material";
import { Groups as LeaderIcon } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContext } from "../contexts/AuthContext";

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

const initialFormState = {
  name: "", surname: "", dob: "", address: "", email: "",
  number: "", gender: "", invitedBy: "", leader1: "", leader12: "",
  leader144: "", stage: "Win",
};

const uniformInputSx = {
  "& .MuiOutlinedInput-root": { height: "50px", borderRadius: "15px" },
  "& .MuiOutlinedInput-input": { fontSize: "0.95rem", padding: "10px 10px" },
  "& .MuiInputLabel-root": { fontSize: "0.95rem" },
  "& .MuiSelect-select": { fontSize: "0.95rem", padding: "10px 10px" },
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
      if (l.level === 1 && !l1) l1 = l.name || "";
      if (l.level === 12 && !l12) l12 = l.name || "";
      if (l.level === 144 && !l144) l144 = l.name || "";
    }
    if (l1 || l12 || l144) return { leader1: l1, leader12: l12, leader144: l144 };
  }

  return {
    leader1: person["Leader @1"] || person.leader1 || "",
    leader12: person["Leader @12"] || person.leader12 || "",
    leader144: person["Leader @144"] || person.leader144 || "",
  };
}

export default function AddPersonDialog({
  open, onClose, onSave, formData, setFormData,
  isEdit = false, personId = null,
  editingPersonObject = null,
}) {
  const theme = useTheme();
  const { authFetch, user } = useContext(AuthContext);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchInputs, setSearchInputs] = useState({ invitedBy: "", leader1: "", leader12: "", leader144: "" });
  const [showLeaderFields, setShowLeaderFields] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [leaderFieldsEdited, setLeaderFieldsEdited] = useState(false);

  const debouncedAddressInput = useDebounce(searchInputs.address || "", 500);

  const [allPeople, setAllPeople] = useState([]);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    const mapPerson = (raw) => {
      const name = (raw.Name || raw.name || "").toString().trim();
      const surname = (raw.Surname || raw.surname || "").toString().trim();
      return {
        _id: (raw._id || raw.id || "").toString(),
        name,
        surname,
        email: (raw.Email || raw.email || "").toString().trim(),
        phone: (raw.Number || raw.phone || raw.Phone || "").toString().trim(),
        fullName: `${name} ${surname}`.trim(),
        fullNameLower: `${name} ${surname}`.toLowerCase().trim(),
        leader1: raw["Leader @1"] || raw.leader1 || "",
        leader12: raw["Leader @12"] || raw.leader12 || "",
        leader144: raw["Leader @144"] || raw.leader144 || "",
      };
    };

    const now = Date.now();
    const CACHE_DURATION = 30 * 60 * 1000;
    if (
      window.globalPeopleCache?.length > 0 &&
      window.globalCacheTimestamp &&
      now - window.globalCacheTimestamp < CACHE_DURATION
    ) {
      setAllPeople(window.globalPeopleCache.map(p => ({
        ...p,
        fullNameLower: p.fullNameLower || `${p.name || ""} ${p.surname || ""}`.toLowerCase().trim(),
        leader1: p.leader1 || "",
        leader12: p.leader12 || "",
        leader144: p.leader144 || "",
      })));
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    (async () => {
      try {
        const res = await authFetch(`${BASE_URL}/cache/people`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const rawPeople = data?.cached_data || [];
        if (rawPeople.length > 0) {
          const mapped = rawPeople.map(mapPerson);
          window.globalPeopleCache = mapped;
          window.globalCacheTimestamp = Date.now();
          setAllPeople(mapped);
        }
      } catch (err) {
        console.error("AddPersonDialog: failed to load people", err);
      } finally {
        isFetchingRef.current = false;
      }
    })();
  }, [open]);

  const peopleOptions = useMemo(() => {
    const source = allPeople.length > 0
      ? allPeople
      : (window.globalPeopleCache?.length > 0 ? window.globalPeopleCache : []);

    return source.map((p) => ({
      label: p.fullName || `${p.name || ""} ${p.surname || ""}`.trim(),
      person: p,
      fullNameLower: p.fullNameLower || `${p.name || ""} ${p.surname || ""}`.toLowerCase(),
      searchText: `${p.fullNameLower || ""} ${p.email || ""} ${p.phone || ""}`,
    }));
  }, [allPeople]);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      setErrors({});
      setSearchInputs({ invitedBy: "", leader1: "", leader12: "", leader144: "" });
      setShowLeaderFields(false);
      setOriginalFormData(null);
      setLeaderFieldsEdited(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isEdit) return;

    const src = editingPersonObject || null;
    if (!src) return;

    const leaders = extractLeaders(src);

    const initData = {
      name: src.name || src.Name || "",
      surname: src.surname || src.Surname || "",
      dob: (src.dob || src.birthday || src.Birthday || "").replace(/\//g, "-"),
      address: src.location || src.address || src.homeAddress || src.Address || "",
      email: src.email || src.Email || "",
      number: src.number || src.phone || src.Number || src.Phone || "",
      gender: src.gender || src.Gender || "",
      invitedBy: src.invitedBy || src.InvitedBy || "",
      leader1: leaders.leader1,
      leader12: leaders.leader12,
      leader144: leaders.leader144,
      stage: src.stage || src.Stage || "Win",
    };

    setFormData(initData);
    setOriginalFormData(initData);
    setShowLeaderFields(true);
  }, [open, isEdit, editingPersonObject]);

  useEffect(() => {
    if (!debouncedAddressInput || debouncedAddressInput.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    if (!GEOAPIFY_API_KEY) return;
    const controller = new AbortController();
    (async () => {
      setIsLoadingAddress(true);
      try {
        const res = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(debouncedAddressInput)}&apiKey=${GEOAPIFY_API_KEY}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAddressSuggestions(
          data.features?.map((f) => ({ label: f.properties.formatted, address: f.properties.formatted })) || []
        );
      } catch { /* noop */ }
      finally { setIsLoadingAddress(false); }
    })();
    return () => controller.abort();
  }, [debouncedAddressInput]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: "" }));
  };
  const handleNameChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: capitaliseWords(value) }));
    setErrors((p) => ({ ...p, [name]: "" }));
  };
  const handleNumberChange = (e) => {
    setFormData((p) => ({ ...p, number: digitsOnly(e.target.value) }));
    setErrors((p) => ({ ...p, number: "" }));
  };

  // Sets invitedBy only — leader fields are filled manually by the user
  const handleInvitedByChange = useCallback((value) => {
    if (!value) {
      setFormData((p) => ({ ...p, invitedBy: "" }));
      return;
    }
    const label = typeof value === "string" ? value : value.label;
    setFormData((p) => ({ ...p, invitedBy: label }));
  }, []);

  const filterOptions = useCallback((options, { inputValue }) => {
    if (!inputValue?.trim()) return options.slice(0, 30);
    const term = inputValue.toLowerCase().trim();
    return options
      .filter((o) => o.searchText.includes(term))
      .slice(0, 50);
  }, []);

  const hasChanges = useMemo(() => {
    if (!isEdit || !originalFormData) return true;
    return Object.keys(originalFormData).some((k) => (formData[k] || "") !== (originalFormData[k] || ""));
  }, [isEdit, formData, originalFormData]);

  const validate = () => {
    const required = ["name", "surname", "dob", "address", "email", "number", "gender", "leader1"];
    const errs = {};
    required.forEach((f) => { if (!formData[f]?.trim()) errs[f] = "This field is required"; });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const isFormValid = () =>
    ["name", "surname", "dob", "address", "email", "number", "gender", "leader1"].every(
      (f) => formData[f]?.toString().trim() !== ""
    );

  const handleSaveClick = async () => {
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        invitedBy: formData.invitedBy || "",
        name: formData.name,
        surname: formData.surname,
        gender: formData.gender,
        email: formData.email,
        number: formData.number,
        phone: formData.number,
        dob: formData.dob ? formData.dob.replace(/-/g, "/") : "",
        address: formData.address,
        leaders: [formData.leader1 || "", formData.leader12 || "", formData.leader144 || "", ""],
        leader1: formData.leader1 || "",
        leader12: formData.leader12 || "",
        leader144: formData.leader144 || "",
        stage: formData.stage || "Win",
      };

      let response;
      if (isEdit && personId) {
        response = await authFetch(`${BASE_URL}/people/${personId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          const normalizedData = {
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
            fullName: `${payload.name} ${payload.surname}`.trim(),
          };
          onSave({ ...normalizedData, __updatedNewPerson: true });
        } else {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Update failed (${response.status})`);
        }
      } else {
        response = await authFetch(`${BASE_URL}/people`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          const data = await response.json();
          const created = data.person || data;
          const backendLeaders = {
            leader1: created["Leader @1"] || created.leader1 || "",
            leader12: created["Leader @12"] || created.leader12 || "",
            leader144: created["Leader @144"] || created.leader144 || "",
          };
          onSave({ ...data, person: { ...created, ...backendLeaders } });
        } else {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || `Save failed (${response.status})`);
        }
      }

      if (!isEdit) setFormData(initialFormState);
      onClose();
    } catch (err) {
      toast.error(`Error: ${err.message || "An error occurred"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    if (!isEdit) setFormData(initialFormState);
    onClose();
  };

  const renderTextField = (name, label, options = {}) => {
    const { select, selectOptions, type } = options;
    const currentValue = formData[name] || "";
    let onChange = handleInputChange;
    if (name === "name" || name === "surname") onChange = handleNameChange;
    if (name === "number") onChange = handleNumberChange;

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

  const renderAutocomplete = (name, label, isInvite = false, disabled = false) => {
    const currentValue = formData[name] || "";
    const isLeaderField = name.startsWith("leader");
    const currentRole = String(user?.role || "").toLowerCase();
    const allowedRoles = ["leaderat12", "leader", "admin", "manager"];
    const canEditLeaders = allowedRoles.includes(currentRole);
    const fieldDisabled = disabled || (isLeaderField && !canEditLeaders);
    return (
      <Autocomplete
        freeSolo
        disabled={fieldDisabled || isSubmitting}
        options={peopleOptions}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.label)}
        filterOptions={filterOptions}
        value={
          peopleOptions.find((o) => o.label === currentValue) ||
          (currentValue ? { label: currentValue } : null)
        }
        onChange={(_, newValue) => {
          if (isInvite) {
            handleInvitedByChange(newValue);
          } else {
            const val = newValue ? (typeof newValue === "string" ? newValue : newValue.label) : "";
            setFormData((p) => ({ ...p, [name]: val }));
            if (isLeaderField) setLeaderFieldsEdited(true);
          }
        }}
        onInputChange={(_, newInput, reason) => {
          if (reason === "input") {
            setFormData((p) => ({ ...p, [name]: newInput }));
            if (isLeaderField) setLeaderFieldsEdited(true);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params} label={label} error={!!errors[name]}
            helperText={errors[name]} margin="normal" fullWidth sx={uniformInputSx}
          />
        )}
        noOptionsText="No matches found"
        blurOnSelect clearOnBlur handleHomeEndKeys
      />
    );
  };

  return (
    <Dialog
      open={open} onClose={handleClose} maxWidth="md" fullWidth
      disableEscapeKeyDown={isSubmitting}
      PaperProps={{ sx: { borderRadius: 3, m: 2, maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="div">
          {isEdit ? "Update Person" : "Add New Person"}
        </Typography>
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
          {renderAutocomplete("invitedBy", "Invited By", true, false)}

          {/* Address autocomplete */}
          <Autocomplete
            freeSolo
            options={addressSuggestions}
            getOptionLabel={(o) => (typeof o === "string" ? o : o.label || o.address || "")}
            value={formData.address}
            onChange={(_, newValue) => {
              const address = typeof newValue === "string" ? newValue : newValue?.address || newValue?.label || "";
              setFormData((p) => ({ ...p, address }));
              setErrors((p) => ({ ...p, address: "" }));
            }}
            onInputChange={(_, newInput) => {
              setSearchInputs((p) => ({ ...p, address: newInput }));
              setFormData((p) => ({ ...p, address: newInput }));
              setErrors((p) => ({ ...p, address: "" }));
            }}
            loading={isLoadingAddress}
            loadingText="Searching addresses…"
            noOptionsText={
              (searchInputs.address || "").length < 3 ? "Type at least 3 characters" : "No addresses found"
            }
            renderInput={(params) => (
              <TextField
                {...params} label="Home Address *" error={!!errors.address}
                helperText={errors.address} margin="normal" fullWidth sx={uniformInputSx}
              />
            )}
            disabled={isSubmitting}
            blurOnSelect clearOnBlur={false}
          />

          {renderTextField("email", "Email Address *", { type: "email", required: true })}
          {renderTextField("number", "Phone Number *", { required: true })}
          {renderTextField("gender", "Gender *", {
            select: true, selectOptions: ["Male", "Female"], required: true,
          })}

          {/* Leader @1 — always visible, required */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 0.5 }}>
              Leadership
            </Typography>
            {renderAutocomplete("leader1", "Leader @1 *", false, false)}
          </Box>

          {/* Leader @12 and @144 — collapsible */}
          <Collapse in={showLeaderFields}>
            <Box>
              {renderAutocomplete("leader12", "Leader @12", false, false)}
              {renderAutocomplete("leader144", "Leader @144", false, false)}
            </Box>
          </Collapse>

          {/* Toggle button for @12 and @144 */}
          <Box sx={{ mt: 1, textAlign: "center" }}>
            <Button
              onClick={() => setShowLeaderFields((v) => !v)}
              startIcon={<LeaderIcon />}
              variant="outlined"
              color="primary"
              size="small"
            >
              {showLeaderFields ? "Hide Additional Leaders" : "Add Additional Leaders"}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
          Cancel
        </Button>
        <LoadingButton
          onClick={handleSaveClick}
          variant="contained" color="primary"
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