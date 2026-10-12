import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { getCatalog, getHistory, getHistoryItem } from "../api/reportingApi";
import { getReportTitle } from "../features/reporting/constants";
import ReportEnvelopeView from "../features/reporting/components/ReportEnvelopeView";
import ReportErrorState from "../features/reporting/components/ReportStates";
import { normalizeRole } from "../utils/roleNormalizer";

export default function ReportHistory() {
  const { authFetch, user } = useContext(AuthContext);
  const isSuper = Boolean(user?.is_supreme_admin) || normalizeRole(user?.role) === "superadmin";
  const [organization, setOrganization] = useState(user?.Organization || user?.organization || "");
  const [catalog, setCatalog] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const params = useMemo(() => (isSuper ? { organization } : {}), [isSuper, organization]);

  const loadHistory = useCallback(async () => {
    if (isSuper && !organization.trim()) {
      setLoading(false);
      setError({ status: 422, code: "http_422", message: "Enter an organization to view its saved reports." });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRuns(await getHistory(authFetch, params));
      setSelected(null);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [authFetch, isSuper, organization, params]);

  useEffect(() => {
    let active = true;
    getCatalog(authFetch)
      .then((result) => { if (active) setCatalog(result); })
      .catch(() => {});
    return () => { active = false; };
  }, [authFetch]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const openRun = async (run) => {
    setLoading(true);
    setError(null);
    try {
      setSelected(await getHistoryItem(authFetch, run.id, params));
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1440, mx: "auto" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2} sx={{ mb: 2.5 }}>
        <Box><Typography variant="h4" component="h1" fontWeight={800}>Report History</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Saved report snapshots for the selected organization.</Typography></Box>
        <Button component={RouterLink} to="/reports" variant="outlined">Browse reports</Button>
      </Stack>
      {isSuper && <Stack direction="row" spacing={1} sx={{ mb: 2 }}><TextField size="small" label="Organization" value={organization} onChange={(event) => setOrganization(event.target.value)} /><Button variant="contained" onClick={loadHistory}>Load</Button></Stack>}
      {loading && <LinearProgress sx={{ mb: 1.5 }} />}
      {error && <ReportErrorState error={error} onRetry={loadHistory} />}
      {!error && !loading && runs.length === 0 && <Alert severity="info">No saved reports for this organization.</Alert>}
      {runs.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 1, overflow: "hidden" }}>
          <Table size="small"><TableHead><TableRow>{["Report", "Created", "Period", ""].map((label) => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>{runs.map((run) => <TableRow key={run.id} hover>
              <TableCell>{getReportTitle(catalog, run.report_type)}</TableCell>
              <TableCell>{run.created_at ? new Date(run.created_at).toLocaleString() : "—"}</TableCell>
              <TableCell>{run.payload?.meta?.period?.label || run.params?.period || "—"}</TableCell>
              <TableCell align="right"><Button size="small" onClick={() => openRun(run)}>Open</Button></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </Paper>
      )}
      {selected?.payload && <Box sx={{ mt: 3 }}><Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>{selected.payload.meta?.title || selected.report_type}</Typography><ReportEnvelopeView envelope={selected.payload} /></Box>}
    </Box>
  );
}
