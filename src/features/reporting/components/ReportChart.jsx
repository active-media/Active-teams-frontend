import { Bar, Line } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip } from "chart.js";
import { Box, Paper, Typography, useTheme } from "@mui/material";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

/** @param {{series: {key:string,title:string,type:'line'|'bar',points:Array<{x:string|number|null,y:number|null,group?:string|null}>}}} props */
export default function ReportChart({ series }) {
  const theme = useTheme();
  const groups = [...new Set(series.points.map((point) => point.group).filter(Boolean))];
  const labels = [...new Set(series.points.map((point) => point.x ?? "—"))];
  const palette = [theme.palette.primary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.info.main];
  const datasets = groups.length
    ? groups.map((group, index) => ({
      label: group,
      data: labels.map((label) => series.points.find((point) => point.group === group && (point.x ?? "—") === label)?.y ?? null),
      borderColor: palette[index % palette.length],
      backgroundColor: palette[index % palette.length],
      tension: 0.3,
      spanGaps: false,
    }))
    : [{
      label: series.title,
      data: series.points.map((point) => point.y),
      borderColor: palette[0],
      backgroundColor: `${palette[0]}33`,
      tension: 0.3,
      fill: series.type === "line",
      spanGaps: false,
    }];
  const data = { labels, datasets };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: groups.length > 0, position: "bottom" } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, minWidth: 0 }}>
      <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{series.title}</Typography>
      {series.points.length === 0 ? <Typography variant="body2" color="text.secondary">No series points for this period.</Typography> : (
        <Box sx={{ height: 260 }}>{series.type === "bar" ? <Bar data={data} options={options} /> : <Line data={data} options={options} />}</Box>
      )}
    </Paper>
  );
}