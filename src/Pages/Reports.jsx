import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Card, Chip, LinearProgress, Stack, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import SaveIcon from "@mui/icons-material/Save";
import { AuthContext } from "../contexts/AuthContext";
import { exportReport, generateReport, getCatalog, getReport } from "../api/reportingApi";
import { ALL_CAMPUSES, DEFAULT_PERIOD, REPORT_EXPORT_FORMATS } from "../features/reporting/constants";
import CampusSelect from "../features/reporting/components/CampusSelect";
import KpiGrid from "../features/reporting/components/KpiGrid";
import PeriodPicker from "../features/reporting/components/PeriodPicker";
import ReportEnvelopeView from "../features/reporting/components/ReportEnvelopeView";
import { ComingSoonState, ReportErrorState } from "../features/reporting/components/ReportStates";
import { normalizeRole } from "../utils/roleNormalizer";

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { authFetch, user } = useContext(AuthContext);
  const { reportType } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState([]);
  const [envelope, setEnvelope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState("");
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(user?.Organization || user?.organization || "");
  const [periodValue, setPeriodValue] = useState(() => ({
    period: searchParams.get("period") || DEFAULT_PERIOD,
    start_date: searchParams.get("start_date") || "",
    end_date: searchParams.get("end_date") || "",
    isCustom: searchParams.get("custom") === "true",
  }));
  const [campus, setCampus] = useState(() => searchParams.get("campus") || ALL_CAMPUSES);
  const isSuper = Boolean(user?.is_supreme_admin) || normalizeRole(user?.role) === "superadmin";
  const params = useMemo(() => ({
    ...(periodValue.isCustom && periodValue.start_date && periodValue.end_date
      ? { start_date: periodValue.start_date, end_date: periodValue.end_date }
      : { period: periodValue.period }),
    campus,
  }), [periodValue, campus]);

  // Mirror the selection into the URL so drill-down links (and the dashboard's links) keep it.
  useEffect(() => {
    const next = new URLSearchParams();
    if (periodValue.isCustom) {
      next.set("custom", "true");
      if (periodValue.start_date) next.set("start_date", periodValue.start_date);
      if (periodValue.end_date) next.set("end_date", periodValue.end_date);
    } else if (periodValue.period) {
      next.set("period", periodValue.period);
    }
    if (campus && campus !== ALL_CAMPUSES) next.set("campus", campus);
    setSearchParams(next, { replace: true });
  }, [periodValue, campus, setSearchParams]);

  useEffect(() => {
    let active = true;
    getCatalog(authFetch)
      .then((result) => { if (active) setCatalog(result); })
      .catch((requestError) => { if (active) setError(requestError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authFetch]);

  useEffect(() => {
    if (!reportType) return undefined;
    const selected = catalog.find((item) => item.report_type === reportType);
    if (selected && !selected.implemented) {
      setError({ status: 501, code: "not_implemented", reportType, message: `The ${reportType} report is not implemented.` });
      setLoading(false);
      return undefined;
    }
  if (periodValue.isCustom && (!periodValue.start_date || !periodValue.end_date)) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    getReport(authFetch, reportType, params)
      .then((result) => { if (active) setEnvelope(result); })
      .catch((requestError) => { if (active) setError(requestError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authFetch, catalog, params, periodValue, reportType]);

  const runExport = async (format) => {
    setExporting(format);
    setError(null);
    try {
      const result = await exportReport(authFetch, reportType, format, params);
      saveBlob(result.blob, result.filename);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setExporting("");
    }
  };

  const handleGenerate = async () => {
    if (isSuper && !organization.trim()) {
      setError({ status: 422, code: "http_422", message: "Enter an organization to save report history." });
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await generateReport(authFetch, reportType, { ...params, ...(isSuper ? { organization: organization.trim() } : {}) });
      navigate("/reporting/history");
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const selectedReport = catalog.find((item) => item.report_type === reportType);
  const campuses = envelope?.series?.find((series) => series.key === "campus_comparison")?.points?.map((point) => point.x).filter(Boolean) || [];

  if (!reportType) {
    return (
      <Box sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1440, mx: "auto" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box><Typography variant="h4" component="h1" fontWeight={800}>Reports</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Choose a report to view its current envelope.</Typography></Box>
          <Button href="/reporting/history" variant="outlined">Report history</Button>
        </Stack>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && <ReportErrorState error={error} />}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", lg: "repeat(3,minmax(0,1fr))" }, gap: 1.5 }}>
          {catalog.map((item) => (
            <Card key={item.report_type} variant="outlined" sx={{ p: 2.25, borderRadius: 1, display: "flex", flexDirection: "column", minHeight: 174 }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography component="h2" fontWeight={700}>{item.title}</Typography>
                {!item.implemented && <Chip size="small" label="Coming soon" variant="outlined" />}
              </Stack>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 1, flexGrow: 1 }}>{item.description}</Typography>
              <Button sx={{ mt: 2, alignSelf: "flex-start" }} disabled={!item.implemented} onClick={() => navigate(`/reports/${item.report_type}?period=${DEFAULT_PERIOD}`)}>
                {item.implemented ? "Open report" : "Coming soon"}
              </Button>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1440, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/reports")} sx={{ mb: 0.75 }}>All reports</Button>
          <Typography variant="h4" component="h1" fontWeight={800}>{selectedReport?.title || reportType.replaceAll("_", " ")}</Typography>
          {envelope?.meta?.period?.label && <Typography variant="body2" color="text.secondary">{envelope.meta.period.label}</Typography>}
        </Box>
        {selectedReport?.implemented && (
          <Stack direction="row" spacing={1}>
            {REPORT_EXPORT_FORMATS.map((format) => <Button key={format} variant="outlined" startIcon={<DownloadIcon />} disabled={Boolean(exporting)} onClick={() => runExport(format)}>{exporting === format ? "Preparing…" : format.toUpperCase()}</Button>)}
            <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleGenerate}>{saving ? "Saving…" : "Generate and save"}</Button>
          </Stack>
        )}
      </Stack>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} sx={{ mb: 2 }}>
        <PeriodPicker value={periodValue} onChange={(next) => setPeriodValue((previous) => ({ ...previous, ...next }))} resolvedLabel={envelope?.meta?.period?.label} />
        {selectedReport?.params?.some((param) => param.name === "campus") && <CampusSelect value={campus} options={campuses} onChange={setCampus} />}
      </Stack>
      {isSuper && selectedReport?.implemented && <TextField size="small" label="Organization for saved history" value={organization} onChange={(event) => setOrganization(event.target.value)} sx={{ mb: 2, minWidth: 320 }} />}
      {loading && <LinearProgress sx={{ mb: 1.5 }} />}
      {error?.status === 501 && error?.code === "not_implemented" ? <ComingSoonState message={error.message} /> : error && <ReportErrorState error={error} onRetry={() => setError(null)} />}
      {envelope && <ReportEnvelopeView envelope={envelope} />}
      {!envelope && !loading && !error && <Alert severity="info">Choose a valid report from the catalog.</Alert>}
    </Box>
  );
}