import { Autocomplete, TextField } from "@mui/material";
import { ALL_CAMPUSES } from "../constants";

export default function CampusSelect({ value = ALL_CAMPUSES, options = [], onChange }) {
  const campuses = options.filter((campus) => campus?.campus_id != null && campus.label);
  const selected = campuses.find((campus) => String(campus.campus_id) === String(value)) || null;
  return <Autocomplete
    options={campuses}
    value={selected}
    getOptionLabel={(campus) => campus?.label || ""}
    isOptionEqualToValue={(option, selectedOption) => String(option.campus_id) === String(selectedOption.campus_id)}
    onChange={(_event, nextValue) => onChange(nextValue?.campus_id ?? ALL_CAMPUSES)}
    sx={{ minWidth: 220 }}
    renderInput={(params) => <TextField {...params} label="Campus" size="small" placeholder="All campuses" />}
  />;
}