import { Box, Card, Stack, Typography, useTheme } from "@mui/material";
import { formatReportValue } from "../formatting";

export function KpiCard({ kpi }) {
  const theme = useTheme();
  return (
    <Card variant="outlined" sx={{ p: 2, minHeight: 132, borderRadius: 1, height: "100%" }}>
      <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
      <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>{formatReportValue(kpi.value, kpi.format)}</Typography>
      {(kpi.delta != null || kpi.delta_label || kpi.hint) && (
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
          {kpi.delta != null && <Typography variant="caption" color={kpi.delta >= 0 ? "success.main" : "error.main"}>{formatReportValue(kpi.delta, "percent")}</Typography>}
          {kpi.delta_label && <Typography variant="caption" color="text.secondary">{kpi.delta_label}</Typography>}
          {kpi.hint && <Typography variant="caption" color="text.secondary">{kpi.hint}</Typography>}
        </Stack>
      )}
      <Box sx={{ height: 2, bgcolor: theme.palette.divider, mt: 1.5 }} />
    </Card>
  );
}

export default function KpiGrid({ kpis = [] }) {
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(4,minmax(0,1fr))" }, gap: 1.5 }}>
    {kpis.map((kpi) => <KpiCard key={kpi.key} kpi={kpi} />)}
  </Box>;
}