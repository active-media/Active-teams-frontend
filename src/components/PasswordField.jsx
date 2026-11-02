import { useEffect, useState } from "react";
import {
  Box,
  TextField,
  IconButton,
  InputAdornment,
  LinearProgress,
  Typography,
} from "@mui/material";
import { CheckCircle, RadioButtonUnchecked, Visibility, VisibilityOff } from "@mui/icons-material";

export const PASSWORD_RULES = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "One number", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "One symbol (!@#$%)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isPasswordValid = (password = "") =>
  PASSWORD_RULES.every((rule) => rule.test(password));

const getResults = (password = "") =>
  PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) }));

const getStrengthColor = (passed, total) =>
  passed < 3 ? "error" : passed < total ? "warning" : "success";

export function PasswordRequirements({ value = "", visible = true }) {
  if (!visible) return null;

  const results = getResults(value);
  const passed = results.filter((rule) => rule.ok).length;
  const color = getStrengthColor(passed, results.length);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 3,
        bgcolor: "action.hover",
      }}
    >
      <LinearProgress
        variant="determinate"
        value={(passed / results.length) * 100}
        color={color}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: "action.selected",
        }}
      />

      <Box
        sx={{
          mt: 1.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          columnGap: 2,
          rowGap: 0.75,
        }}
      >
        {results.map((rule) => (
          <Box key={rule.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {rule.ok ? (
              <CheckCircle sx={{ color: "success.main", fontSize: 16 }} />
            ) : (
              <RadioButtonUnchecked sx={{ color: "text.disabled", fontSize: 16 }} />
            )}
            <Typography
              variant="caption"
              sx={{
                color: rule.ok ? "success.main" : "text.secondary",
                lineHeight: 1.2,
              }}
            >
              {rule.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function PasswordField({
  value = "",
  onChange,
  label = "Password",
  showRules = false,
  showStrength = false,
  onValidityChange,
  error,
  helperText,
  name,
  disabled,
  autoComplete = "new-password",
  fullWidth = true,
  size,
  sx,
  ...props
}) {
  const [visible, setVisible] = useState(false);

  const valid = isPasswordValid(value);

  useEffect(() => {
    if (onValidityChange) onValidityChange(valid);
  }, [valid, onValidityChange]);

  const results = getResults(value);
  const passed = results.filter((rule) => rule.ok).length;
  const color = getStrengthColor(passed, results.length);

  return (
    <Box>
      <TextField
        label={label}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        helperText={helperText}
        disabled={disabled}
        autoComplete={autoComplete}
        fullWidth={fullWidth}
        size={size}
        sx={sx}
        {...props}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setVisible((v) => !v)}
                  edge="end"
                  tabIndex={-1}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      {showStrength && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={(passed / results.length) * 100}
            color={color}
            sx={{ height: 4, borderRadius: 2, bgcolor: "action.selected" }}
          />
        </Box>
      )}

      {showRules && value.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <PasswordRequirements value={value} />
        </Box>
      )}
    </Box>
  );
}