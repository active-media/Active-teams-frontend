import React, { useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Checkbox,
  FormControlLabel,
  Grid,
  Stack,
  Alert,
  Divider,
  useTheme,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { toast } from "react-toastify";
import { useOrgConfig } from "../contexts/OrgConfigContext";
import { CAPABILITY_LIST, DEFAULT_ROLES } from "../utils/capabilities";

function normalizeKey(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "_");
}

export default function RolesManager({
  value,
  onChange,
  onSave,
  saving = false,
  saveError = "",
  title = "Roles & Permissions",
  subtitle = "Define the roles people can hold in your church and what each role is allowed to do.",
}) {
  const theme = useTheme();
  const { orgConfig } = useOrgConfig();

  const roles = value?.length
    ? value
    : Array.isArray(orgConfig?.roles) && orgConfig.roles.length
      ? orgConfig.roles
      : DEFAULT_ROLES.map((r) => ({ ...r, capabilities: [...r.capabilities] }));

  const updateRole = useCallback(
    (index, patch) => {
      const next = roles.map((r, i) => (i === index ? { ...r, ...patch } : r));
      onChange?.(next);
    },
    [roles, onChange],
  );

  const toggleCapability = useCallback(
    (index, capKey) => {
      updateRole(index, {
        capabilities: roles[index].capabilities.includes(capKey)
          ? roles[index].capabilities.filter((c) => c !== capKey)
          : [...roles[index].capabilities, capKey],
      });
    },
    [roles, updateRole],
  );

  const addRole = () => {
    const next = [...roles, { key: "", label: "", capabilities: ["view_people", "checkin"] }];
    onChange?.(next);
  };

  const removeRole = (index) => {
    if (roles.length <= 1) {
      toast.error("At least one role is required");
      return;
    }
    onChange?.(roles.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!onSave) return;
    const keys = new Set();
    const labels = new Set();
    for (const role of roles) {
      if (!role.key.trim() || !/^[a-z][a-z0-9_]*$/.test(role.key.trim())) {
        toast.error("Every role needs a valid key (lowercase letters, numbers, underscores)");
        return;
      }
      if (!role.label.trim()) {
        toast.error("Every role needs a label");
        return;
      }
      if (keys.has(role.key) || labels.has(role.label.trim().toLowerCase())) {
        toast.error("Role keys and labels must each be unique");
        return;
      }
      keys.add(role.key);
      labels.add(role.label.trim().toLowerCase());
    }
    await onSave(roles);
  };

  const togglableCaps = CAPABILITY_LIST;

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {subtitle}
      </Typography>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      <Stack spacing={2}>
        {roles.map((role, index) => {
          const isProtectedAdmin = role.key.toLowerCase() === "admin";
          return (
            <Paper
              key={`${role.key || "role"}-${index}`}
              variant="outlined"
              sx={{ p: 2, borderRadius: 2 }}
            >
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <TextField
                    label="Role label"
                    size="small"
                    fullWidth
                    value={role.label}
                    onChange={(e) => updateRole(index, { label: e.target.value })}
                  />
                </Grid>
                <Grid item xs={10} sm={5}>
                  <TextField
                    label="Role key"
                    size="small"
                    fullWidth
                    value={role.key}
                    disabled={isProtectedAdmin}
                    helperText="Unique, lowercase, underscores"
                    onChange={(e) => {
                      const key = normalizeKey(e.target.value);
                      updateRole(index, { key });
                    }}
                  />
                </Grid>
                <Grid item xs={2} sm={2}>
                  <IconButton aria-label="Remove role" color="error" onClick={() => removeRole(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Grid>
                <Grid item xs={12}>
                  <Stack
                    direction="row"
                    flexWrap="wrap"
                    gap={0.5}
                    sx={{
                      ml: -0.5,
                      "& .MuiFormControlLabel-root": {
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1.5,
                        px: 1,
                      },
                    }}
                  >
                    {togglableCaps.map((cap) => {
                      const isAdminLocked = isProtectedAdmin && cap.key === "admin";
                      return (
                        <FormControlLabel
                          key={cap.key}
                          control={
                            <Checkbox
                              size="small"
                              checked={(role.capabilities || []).includes(cap.key)}
                              disabled={isAdminLocked}
                              onChange={() => toggleCapability(index, cap.key)}
                            />
                          }
                          label={cap.label}
                          sx={{ mx: 0 }}
                        />
                      );
                    })}
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          );
        })}
      </Stack>

      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={addRole}
        sx={{ mt: 2 }}
      >
        Add role
      </Button>

      {onSave && (
        <Divider sx={{ my: 3 }} />
      )}

      {onSave && (
        <LoadingButton
          variant="contained"
          loading={saving}
          onClick={handleSave}
        >
          Save roles
        </LoadingButton>
      )}
    </Box>
  );
}