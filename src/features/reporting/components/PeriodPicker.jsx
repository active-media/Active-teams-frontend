import { FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { PERIOD_OPTIONS } from "../constants";

export default function PeriodPicker({ value, onChange, resolvedLabel }) {
  const isCustom = Boolean(value.start_date && value.end_date);
  const selected = value.isCustom || isCustom ? "custom" : value.period?.length === 7 ? "month" : value.period || "thisMonth";

  const handleToken = (token) => {
    if (token === "custom") onChange({ isCustom: true, start_date: value.start_date || "", end_date: value.end_date || "" });
    else if (token === "month") onChange({ isCustom: false, period: new Date().toISOString().slice(0, 7) });
    else onChange({ isCustom: false, period: token });
  };

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
      <FormControl size="small" sx={{ minWidth: 190 }}>
        <InputLabel id="report-period-label">Period</InputLabel>
        <Select labelId="report-period-label" label="Period" value={selected} onChange={(event) => handleToken(event.target.value)}>
          {PERIOD_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </Select>
      </FormControl>
      {selected === "month" && (
        <TextField
          size="small"
          type="month"
          label="Month"
          value={value.period || ""}
          onChange={(event) => onChange({ isCustom: false, period: event.target.value })}
          InputLabelProps={{ shrink: true }}
        />
      )}
      {selected === "custom" && (
        <Stack direction="row" spacing={1}>
          <TextField size="small" type="date" label="Start date" value={value.start_date || ""} onChange={(event) => onChange({ ...value, isCustom: true, start_date: event.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="End date" value={value.end_date || ""} onChange={(event) => onChange({ ...value, isCustom: true, end_date: event.target.value })} InputLabelProps={{ shrink: true }} />
        </Stack>
      )}
      {resolvedLabel && <Typography variant="body2" color="text.secondary">{resolvedLabel}</Typography>}
    </Stack>
  );
}