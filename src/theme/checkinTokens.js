export const DISPLAY = "'Bricolage Grotesque', 'Figtree', system-ui, sans-serif";
export const BODY = "'Figtree', system-ui, sans-serif";

export function getTokens(isDark) {
  return {
    accent: "#1976d2",
    ink: isDark ? "#f1f0f8" : "#1c1b2e",
    mute: isDark ? "#9a98b0" : "#6c6a80",
    line: isDark ? "#2a2a38" : "#e3e1ec",
    fieldBg: isDark ? "#1d1d29" : "#f8f7fb",
    cardBg: isDark ? "#16161f" : "#ffffff",
    pageBg: isDark ? "#0d0d14" : "#f3f2f7",
  };
}

export const inputSx = (t) => ({
  "& .MuiOutlinedInput-root": {
    height: 44,
    borderRadius: "12px",
    bgcolor: t.cardBg,
    fontFamily: BODY,
    color: t.ink,
    "& fieldset": {
      borderColor: t.line,
      borderWidth: 1.5,
    },
    "&:hover fieldset": {
      borderColor: t.accent,
    },
    "&.Mui-focused fieldset": {
      borderColor: t.accent,
      borderWidth: 1.5,
    },
  },
  "& .MuiInputBase-input": {
    fontFamily: BODY,
    color: t.ink,
  },
  "& .MuiInputLabel-root": {
    fontFamily: BODY,
  },
  "& .MuiSelect-select": {
    fontFamily: BODY,
    color: t.ink,
  },
});

export const outlinedBtnSx = (t) => ({
  height: 44,
  borderRadius: "12px",
  textTransform: "none",
  fontWeight: 600,
  fontFamily: BODY,
  color: t.ink,
  borderColor: t.line,
  borderWidth: 1.5,
  bgcolor: t.cardBg,
  "&:hover": {
    borderColor: t.accent,
    bgcolor: t.cardBg,
  },
  "&:focus-visible": {
    outline: `3px solid ${t.accent}55`,
    outlineOffset: 1,
  },
});

export const primaryBtnSx = (t) => ({
  height: 44,
  borderRadius: "12px",
  textTransform: "none",
  fontWeight: 600,
  fontFamily: BODY,
  bgcolor: t.accent,
  color: "#fff",
  boxShadow: "none",
  "&:hover": {
    bgcolor: t.accent,
    boxShadow: "none",
  },
  "&:focus-visible": {
    outline: `3px solid ${t.accent}55`,
    outlineOffset: 1,
  },
});

export const dangerBtnSx = (t) => ({
  ...primaryBtnSx(t),
  bgcolor: "#d32f2f",
  "&:hover": {
    bgcolor: "#b71c1c",
    boxShadow: "none",
  },
});
