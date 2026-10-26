# Active Teams UI Enhancement Plan

## Purpose

This document outlines small, low-risk improvements that can make the Active Teams site look and feel more polished without requiring a major redesign.

The focus is on:

- Visual consistency
- Navigation clarity
- Better mobile usability
- Improved loading and empty states
- Accessibility
- A clearer home page
- More consistent event and attendance interfaces

---

## 1. Create a Shared Visual Theme

### Current issue

The application currently uses a mixture of:

- Material UI theme values
- Inline styles
- CSS modules
- Hard-coded colors
- Repeated border radii
- Different shadows and spacing values

Examples include:

- `#000`
- `#333`
- `#FFA500`
- `#28a745`
- `borderRadius: 16`
- `borderRadius: "12px"`

This makes individual pages feel visually disconnected.

### Recommended change

Add shared theme values in `src/App.jsx`.

```js
const theme = useMemo(
  () =>
    createTheme({
      palette: {
        mode,
        primary: {
          main: mode === "dark" ? "#90caf9" : "#1565c0",
        },
        background: {
          default: mode === "dark" ? "#121212" : "#f5f7fa",
          paper: mode === "dark" ? "#1e1e1e" : "#ffffff",
        },
      },
      shape: {
        borderRadius: 10,
      },
      typography: {
        fontFamily: "'DM Sans', sans-serif",
      },
      components: {
        MuiButton: {
          defaultProps: {
            disableElevation: true,
          },
        },
        MuiCard: {
          defaultProps: {
            elevation: 0,
          },
        },
      },
    }),
  [mode]
);