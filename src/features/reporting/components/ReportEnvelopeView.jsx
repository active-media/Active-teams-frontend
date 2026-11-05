import { Box, Stack } from "@mui/material";
import KpiGrid from "./KpiGrid";
import ReportChart from "./ReportChart";
import ReportTable from "./ReportTable";

/** @param {{envelope: {meta: object,kpis: Array, tables: Array, series: Array}}} props */
export default function ReportEnvelopeView({ envelope }) {
  return (
    <Stack spacing={2.5}>
      {envelope.kpis?.length > 0 && <KpiGrid kpis={envelope.kpis} />}
      {envelope.series?.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
          {envelope.series.map((series) => <ReportChart key={series.key} series={series} />)}
        </Box>
      )}
      {envelope.tables?.map((table) => <ReportTable key={table.key} table={table} />)}
    </Stack>
  );
}