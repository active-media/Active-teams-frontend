import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { formatTableValue } from "../formatting";

/** @param {{table: {key: string, title: string, columns: Array<{key: string, label: string, format?: string|null}>, rows: Array<Record<string, unknown>>}}} props */
export default function ReportTable({ table }) {
  return (
    <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 1 }}>
      <Typography component="h2" variant="subtitle1" fontWeight={700} sx={{ px: 2, pt: 1.75 }}>{table.title}</Typography>
      {table.rows.length === 0 ? (
        <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>No rows for this period.</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 540 }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow>
              {table.columns.map((column) => <TableCell key={column.key} align={column.format === "number" || column.format === "percent" || column.format === "ratio" ? "right" : "left"} sx={{ fontWeight: 700 }}>{column.label}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>{table.rows.map((row, rowIndex) => (
              <TableRow hover key={String(row.id || row.person_id || `${table.key}-${rowIndex}`)}>
                {table.columns.map((column) => <TableCell key={column.key} align={column.format === "number" || column.format === "percent" || column.format === "ratio" ? "right" : "left"}>
                  {formatTableValue(row[column.key], column.format)}
                </TableCell>)}
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}