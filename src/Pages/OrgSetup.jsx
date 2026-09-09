import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useOrgConfig } from "../contexts/OrgConfigContext";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoAwesome as AutoAwesomeIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Church as ChurchIcon,
  GroupWork as GroupWorkIcon,
  Check as CheckIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { DEFAULT_HIERARCHY } from "../utils/hierarchy";
import { DEFAULT_ROLES } from "../utils/capabilities";
import RolesManager from "../components/RolesManager";

const STEPS = ["Organisation", "Hierarchy", "Top Leaders", "Roles & Permissions", "Done"];

function normalizeKey(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_");
}

export default function OrgSetup() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { orgConfig, configLoaded, saveOrgConfig, reload } = useOrgConfig();

  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgNameError, setOrgNameError] = useState("");
  const [levels, setLevels] = useState(() =>
    DEFAULT_HIERARCHY.map((h) => ({ key: h.key, label: h.label, level: h.level })),
  );
  const [topMale, setTopMale] = useState("");
  const [topFemale, setTopFemale] = useState("");
  const [recurringType, setRecurringType] = useState("Cells");
  const [roles, setRoles] = useState(() =>
    DEFAULT_ROLES.map((r) => ({ ...r, capabilities: [...r.capabilities] })),
  );
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!configLoaded) return;
    const existing = Array.isArray(orgConfig?.hierarchy) && orgConfig.hierarchy.length > 0;
    if (existing) {
      setLevels(
        orgConfig.hierarchy.map((h) => ({
          key: h.key || "",
          label: h.label || "",
          level: h.level,
        })),
      );
    }
    setOrgName(orgConfig?.org_name || "");
    setTopMale(orgConfig?.top_leaders?.male || "");
    setTopFemale(orgConfig?.top_leaders?.female || "");
    setRecurringType(orgConfig?.recurring_event_type || "Cells");
    setRoles(
      Array.isArray(orgConfig?.roles) && orgConfig.roles.length
        ? orgConfig.roles
        : DEFAULT_ROLES.map((r) => ({ ...r, capabilities: [...r.capabilities] })),
    );
  }, [configLoaded, orgConfig]);

  const updateLevel = (index, field, value) => {
    setLevels((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "label" && (!next[index].key || next[index].level === (index + 1))) {
        next[index].key = normalizeKey(value.startsWith("Leader @") ? value.slice("Leader @".length) : value);
      }
      return next;
    });
  };

  const addLevel = () => {
    setLevels((prev) => {
      const maxLevel = prev.reduce((m, lv) => Math.max(m, Number(lv.level) || 0), 0);
      return [...prev, { key: "", label: "", level: maxLevel ? maxLevel * 12 : 12 }];
    });
  };

  const removeLevel = (index) => {
    setLevels((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const validateStep0 = () => {
    if (!orgName.trim()) {
      setOrgNameError("Organisation name is required");
      return false;
    }
    setOrgNameError("");
    return true;
  };

  const validateStep1 = () => {
    const keys = new Set();
    const labels = new Set();
    const levelsSeen = new Set();
    for (const lv of levels) {
      if (!lv.label.trim()) {
        toast.error("Every hierarchy level needs a label");
        return false;
      }
      if (!lv.key.trim()) {
        toast.error("Every hierarchy level needs a key (lowercase, underscores)");
        return false;
      }
      if (!/^[a-z][a-z0-9_]*$/.test(lv.key.trim())) {
        toast.error(`Key "${lv.key}" must be lowercase letters, numbers, underscores (no spaces)`);
        return false;
      }
      if (keys.has(lv.key.trim()) || labels.has(lv.label.trim().toLowerCase()) || levelsSeen.has(Number(lv.level))) {
        toast.error("Keys, labels, and levels must each be unique");
        return false;
      }
      keys.add(lv.key.trim());
      labels.add(lv.label.trim().toLowerCase());
      levelsSeen.add(Number(lv.level));
    }
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateStep0()) return;
    if (activeStep === 1 && !validateStep1()) return;
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        org_name: orgName.trim(),
        hierarchy: levels.map((lv) => ({
          key: lv.key.trim(),
          label: lv.label.trim(),
          level: Number(lv.level) || 0,
        })),
        roles: roles.map((r) => ({
          key: r.key.trim(),
          label: r.label.trim(),
          capabilities: Array.isArray(r.capabilities) ? r.capabilities : [],
        })),
        recurring_event_type: recurringType.trim() || "Cells",
        top_leaders: {
          male: topMale.trim() || null,
          female: topFemale.trim() || null,
        },
        is_setup: true,
      };
      await saveOrgConfig(payload);
      setSaved(true);
      toast.success("Organisation setup saved successfully!");
      await reload();
    } catch (err) {
      setSaveError(err.message || "Failed to save organisation setup");
      toast.error(err.message || "Failed to save organisation setup");
    } finally {
      setSaving(false);
    }
  }, [orgName, levels, roles, recurringType, topMale, topFemale, saveOrgConfig, reload]);

  if (!configLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (saved) {
    return (
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 4, maxWidth: 900, margin: "0 auto" }}>
        <Paper sx={{ p: { xs: 3, sm: 5 }, textAlign: "center", borderRadius: 3 }}>
          <AutoAwesomeIcon sx={{ fontSize: 64, color: "primary.main", mb: 2 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>
            You're all set up!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            <strong>{orgName}</strong>'s hierarchy is ready. Next, import your people and assign them
            to their leaders.
          </Typography>
          <Grid container spacing={2} justifyContent="center">
            <Grid item>
              <Button
                variant="contained"
                size="large"
                startIcon={<GroupWorkIcon />}
                onClick={() => navigate("/people")}
              >
                Go to People & Import
              </Button>
            </Grid>
            <Grid item>
              <Button variant="outlined" size="large" onClick={() => navigate("/")}>
                Back to Home
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, py: 4, maxWidth: 1000, margin: "0 auto" }}>
      <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <ChurchIcon color="primary" />
            <Typography variant="h5" fontWeight={700}>
              Set up your organisation
            </Typography>
          </Box>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Define how your church's leadership works. Every church configures this their own way —
            it only affects your organisation.
          </Typography>

          <Stepper activeStep={activeStep} alternativeLabel={!isXs} sx={{ mb: 4 }}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Organisation name
              </Typography>
              <TextField
                fullWidth
                label="Organisation / Church name"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (e.target.value.trim()) setOrgNameError("");
                }}
                error={!!orgNameError}
                helperText={orgNameError || "This shows everywhere as your church's name."}
                variant="outlined"
              />
              <Box mt={3}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Recurring gathering type
                </Typography>
                <TextField
                  fullWidth
                  label="e.g. Cells, Small Groups, Home Groups"
                  value={recurringType}
                  onChange={(e) => setRecurringType(e.target.value)}
                  helperText="What recurring events (like G12 cells) are called in your church."
                />
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Leadership levels
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Start from your top-most leader as level 1 and work down. Each person sits one level
                below the leader who brought them in. Add as many levels as you need (they grow with
                your church).
              </Typography>
              {levels.map((lv, index) => (
                <Grid
                  container
                  spacing={1}
                  key={`${index}-${lv.level}`}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Grid item xs={12} sm={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Level #"
                      type="number"
                      value={lv.level}
                      onChange={(e) => updateLevel(index, "level", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Label"
                      placeholder="e.g. Evangelist"
                      value={lv.label}
                      onChange={(e) => updateLevel(index, "label", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Key (system field)"
                      placeholder="e.g. evangelist"
                      value={lv.key}
                      onChange={(e) => updateLevel(index, "key", normalizeKey(e.target.value))}
                      helperText="Lowercase, underscores only — never shown raw to members."
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      fullWidth
                      color="error"
                      variant="outlined"
                      size="small"
                      disabled={levels.length <= 1}
                      onClick={() => removeLevel(index)}
                    >
                      <DeleteIcon />
                    </Button>
                  </Grid>
                </Grid>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={addLevel}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Add level
              </Button>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Top leaders (optional)
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                The people at your church's very top — e.g. your <em>pastors</em>. These are used for
                reports. Leave blank if none.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Top leader (male)"
                    value={topMale}
                    onChange={(e) => setTopMale(e.target.value)}
                    placeholder="e.g. Emeka Obi"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Top leader (female)"
                    value={topFemale}
                    onChange={(e) => setTopFemale(e.target.value)}
                    placeholder="e.g. Chidinma Obi"
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {activeStep === 3 && (
            <Box>
              <RolesManager value={roles} onChange={setRoles} />
            </Box>
          )}

          {activeStep === 4 && (
            <Box>
              {saveError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {saveError}
                </Alert>
              )}
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Tip:</strong> You'll import your people next so they can be assigned to the
                leaders you defined.
              </Alert>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Review
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Organisation: <strong>{orgName || "—"}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recurring gathering: <strong>{recurringType || "Cells"}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Top leaders: <strong>{topMale || topFemale ? [topMale, topFemale].filter(Boolean).join(" & ") : "None"}</strong>
                </Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              {levels.map((lv, i) => (
                <Box key={`${i}-${lv.level}`} display="flex" justifyContent="space-between" sx={{ py: 0.5 }}>
                  <Typography variant="body2">
                    {i === 0 ? "Top" : `Level ${i + 1}`}
                    <Box component="span" color="text.secondary" sx={{ ml: 1 }}>
                      ({lv.level})
                    </Box>
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {lv.label || "—"}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || saving}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
            {activeStep < STEPS.length - 1 ? (
              <Button
                onClick={handleNext}
                variant="contained"
                endIcon={<ArrowForwardIcon />}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Setup"}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}