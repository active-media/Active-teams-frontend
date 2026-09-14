import React from "react";
import { ArrowBack, Download, PictureAsPdf } from "@mui/icons-material";
import { Box, Button, Card, Divider, Grid, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { colors, PageFrame, panelSx, REPORT_TYPES, ReportDataTable, SectionTitle } from "../components/ReportingComponents";

const stats = [
	["Total Attendance", "51", "people counted"], ["Active Cells", "5", "51 cell attendance"],
	["Life Class", "—", "not in this report"], ["School of Leaders", "—", "not in this report"],
	["Plan 40", "—", "not in this report"], ["Service Target", "—", "target 1,600"],
	["Twelve Tasks", "4/12", "+33.3% complete"], ["Staff / Interns / Youth", "4/3/5", "people tracked"],
];
const ministryRows = ["Life Class", "School of Leaders", "Plan 40", "School Cell"].map((name, index) => ({ name, registered: [32, 21, 18, 51][index], attended: [28, 18, 15, 45][index], completed: [24, 15, 12, 40][index], attendance: `${[87, 86, 83, 88][index]}%`, completion: `${[75, 71, 67, 78][index]}%` }));
const columns = [{ key: "name", label: "MINISTRY" }, { key: "registered", label: "REGISTERED", numeric: true }, { key: "attended", label: "ATTENDED", numeric: true }, { key: "completed", label: "COMPLETED", numeric: true }, { key: "attendance", label: "ATTENDANCE RATE", numeric: true }, { key: "completion", label: "COMPLETION RATE", numeric: true }];

function ReportDetail({ report }) {
	const navigate = useNavigate();
	return <PageFrame segments={[{ label: "Reporting", to: "/reporting/reports" }, { label: report.name }]}>
		<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={1} flexWrap="wrap"><Button startIcon={<ArrowBack />} onClick={() => navigate("/reporting/reports")} sx={{ color: colors.text }}>Back to Reports</Button><Stack direction="row" spacing={1}><Button variant="outlined" startIcon={<PictureAsPdf />} sx={{ color: colors.text, borderColor: colors.border }}>PDF</Button><Button variant="outlined" startIcon={<Download />} sx={{ color: colors.text, borderColor: colors.border }}>CSV</Button></Stack></Stack>
		<Card sx={{ ...panelSx, p: { xs: 2, md: 4 } }}><Typography sx={{ color: colors.teal, letterSpacing: 2, fontSize: 11, fontWeight: 800 }}>ACTIVE TEAMS V2</Typography><Typography sx={{ fontSize: { xs: 28, md: 38 }, fontWeight: 800, mt: 1 }}>{report.name}</Typography><Typography sx={{ color: colors.muted, fontSize: 13 }}>9/1/2026 - 9/3/2026 · Generated Sep 03, 2026 · PDF</Typography><Divider sx={{ borderColor: colors.border, my: 3 }} /><SectionTitle title="SUMMARY" /><Grid container spacing={1.5} mb={4}>{stats.map(([label, value, caption]) => <Grid item xs={6} md={3} key={label}><Box sx={{ border: `1px solid ${colors.border}`, borderRadius: 1.5, p: 1.5, minHeight: 105 }}><Typography sx={{ fontSize: 25, fontWeight: 800 }}>{value}</Typography><Typography sx={{ fontWeight: 700, fontSize: 13 }}>{label}</Typography><Typography sx={{ color: colors.muted, fontSize: 11 }}>{caption}</Typography></Box></Grid>)}</Grid><SectionTitle title="MINISTRY PERFORMANCE" /><ReportDataTable columns={columns} rows={ministryRows} /></Card>
	</PageFrame>;
}

export default function Reports() {
	const { reportId } = useParams();
	const navigate = useNavigate();
	const report = REPORT_TYPES.find((item) => item.id === reportId);
	if (report) return <ReportDetail report={report} />;
	return <PageFrame segments={[{ label: "Reporting" }, { label: "Reports" }]}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mb={3}><Box><Typography sx={{ fontSize: 32, fontWeight: 800 }}>Reports</Typography><Typography sx={{ color: colors.muted }}>Generate current ministry reports on demand.</Typography></Box></Stack><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>{REPORT_TYPES.map((item) => <Card key={item.id} sx={{ ...panelSx, p: 2.5 }}><Typography sx={{ fontWeight: 800, fontSize: 18 }}>{item.name}</Typography><Typography sx={{ color: colors.muted, fontSize: 13, minHeight: 42, mt: .5 }}>{item.description}</Typography><Button variant="contained" onClick={() => navigate(`/reporting/reports/${item.id}`)} sx={{ mt: 2, bgcolor: colors.blue }}>Generate</Button></Card>)}</Box><Typography sx={{ color: colors.muted, fontSize: 12, mt: 3 }}>Report types are currently local until the backend exposes `GET /reports/types`.</Typography></PageFrame>;
}
