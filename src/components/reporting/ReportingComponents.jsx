import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { ChevronRight, DeleteOutline, Description, Email, Event, GridView, InsertDriveFile, PictureAsPdf, Save, Schedule, TrendingUp, TrendingFlat, TrendingDown } from '@mui/icons-material';

export function ReportingBreadcrumbs({ segments = [] }) {
  const theme = useTheme();

  return (
    <Breadcrumbs
      separator={<ChevronRight sx={{ fontSize: 14, color: theme.palette.text.secondary }} />}
      sx={{ mb: 2, '& .MuiBreadcrumbs-ol': { alignItems: 'center', flexWrap: 'wrap' } }}
    >
      <Link
        component={RouterLink}
        to="/reporting/dashboard"
        underline="hover"
        sx={{ color: theme.palette.text.secondary, fontSize: 13, fontWeight: 500 }}
      >
        Reporting
      </Link>

      {segments.map((segment, idx) => {
        const isCurrent = idx === segments.length - 1;

        if (segment.to) {
          return (
            <Link
              key={`${segment.label}-${idx}`}
              component={RouterLink}
              to={segment.to}
              underline="hover"
              sx={{
                color: isCurrent ? theme.palette.text.primary : theme.palette.text.secondary,
                fontSize: 13,
                fontWeight: isCurrent ? 700 : 500,
              }}
            >
              {segment.label}
            </Link>
          );
        }

        return (
          <Typography
            key={`${segment.label}-${idx}`}
            sx={{
              color: isCurrent ? theme.palette.text.primary : theme.palette.text.secondary,
              fontSize: 13,
              fontWeight: isCurrent ? 700 : 500,
            }}
          >
            {segment.label}
          </Typography>
        );
      })}
    </Breadcrumbs>
  );
}

export function PeriodGranularityControl({ granularity = 'monthly', period = '2026-08', onGranularityChange, onPeriodChange, periodLabel = 'Period' }) {
  const theme = useTheme();

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ display: 'flex', border: `1px solid ${theme.palette.divider}`, borderRadius: 999, p: 0.35, bgcolor: 'rgba(255,255,255,0.02)' }}>
        {['weekly', 'monthly', 'custom'].map((item) => {
          const active = granularity === item;
          return (
            <Button
              key={item}
              variant={active ? 'contained' : 'text'}
              onClick={() => onGranularityChange?.(item)}
              sx={{
                minWidth: 72,
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: active ? '#0080EF' : 'transparent',
                color: active ? '#fff' : theme.palette.text.secondary,
                '&:hover': { backgroundColor: active ? '#006AD6' : 'rgba(255,255,255,0.04)' },
              }}
            >
              {item === 'weekly' ? 'Weekly' : item === 'monthly' ? 'Monthly' : 'Custom'}
            </Button>
          );
        })}
      </Box>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <Select
          value={period}
          onChange={(event) => onPeriodChange?.(event.target.value)}
          displayEmpty
          sx={{
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.02)',
            color: theme.palette.text.primary,
            '.MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
            '& .MuiSelect-select': { py: 1.2 },
          }}
        >
          <MenuItem value="2026-08">{periodLabel}: Aug 2026</MenuItem>
          <MenuItem value="2026-09">{periodLabel}: Sep 2026</MenuItem>
          <MenuItem value="2026-10">{periodLabel}: Oct 2026</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}

export function KpiCard({ icon, value, label, caption, badgeText, tone = 'blue' }) {
  const theme = useTheme();
  const toneMap = {
    green: { bg: 'rgba(46, 204, 113, 0.12)', color: '#2ECC71' },
    teal: { bg: 'rgba(6, 182, 212, 0.12)', color: '#5EEAD4' },
    blue: { bg: 'rgba(0, 128, 239, 0.12)', color: '#60A5FA' },
    amber: { bg: 'rgba(251, 191, 36, 0.12)', color: '#FBBF24' },
  };

  const activeTone = toneMap[tone] || toneMap.blue;

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        minHeight: 170,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ borderRadius: 2, p: 1, backgroundColor: activeTone.bg, color: activeTone.color, display: 'flex', alignItems: 'center' }}>
          {icon}
        </Box>
        <Chip
          label={badgeText || 'Live'}
          size="small"
          sx={{
            backgroundColor: 'rgba(46, 204, 113, 0.12)',
            color: '#2ECC71',
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 11,
            height: 24,
          }}
        />
      </Stack>

      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1, mt: 2, color: theme.palette.text.primary }}>
          {value}
        </Typography>
        <Typography sx={{ mt: 1, color: theme.palette.text.primary, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ mt: 0.5, color: theme.palette.text.secondary, fontSize: 13 }}>{caption}</Typography>
      </Box>
    </Paper>
  );
}

export function KpiCardGrid({ items = [] }) {
  return (
    <Grid container spacing={2}>
      {items.map((item, index) => (
        <Grid item xs={12} sm={6} md={3} key={`${item.label}-${index}`}>
          <KpiCard {...item} />
        </Grid>
      ))}
    </Grid>
  );
}

export function ReportStatGrid({ items = [] }) {
  return (
    <Grid container spacing={1.5} sx={{ mb: 3 }}>
      {items.map((item, idx) => (
        <Grid item xs={12} sm={6} md={3} key={`${item.label}-${idx}`}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: '#171A1F',
              border: '1px solid rgba(255,255,255,0.08)',
              height: '100%',
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 28, color: '#F5F7FA', lineHeight: 1.2 }}>
              {item.value ?? '—'}
            </Typography>
            <Typography sx={{ mt: 1, color: '#B7BEC9', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.6 }}>
              {item.label}
            </Typography>
            {item.caption && (
              <Typography sx={{ mt: 0.5, color: '#8A8F98', fontSize: 12 }}>
                {item.caption}
              </Typography>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

export function ReportDataTable({ columns = [], rows = [], onRowClick, highlightedTotal = false }) {
  return (
    <TableContainer component={Paper} sx={{ backgroundColor: '#171A1F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || 'left'}
                sx={{
                  color: '#8A8F98',
                  fontSize: 12,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  fontWeight: 700,
                  py: 1.5,
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={row.id || `${index}-${row.name || 'row'}`}
              hover={!!onRowClick}
              sx={{ cursor: onRowClick ? 'pointer' : 'default', backgroundColor: highlightedTotal && row.isTotal ? 'rgba(255,255,255,0.03)' : 'transparent' }}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, colIndex) => {
                const cellValue = row[column.key];
                const rendered = column.render ? column.render(cellValue, row, index) : cellValue ?? '—';
                return (
                  <TableCell
                    key={`${column.key}-${colIndex}`}
                    align={column.align || 'left'}
                    sx={{
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      color: row.isTotal ? '#F5F7FA' : '#E8EDF5',
                      fontWeight: row.isTotal ? 800 : 500,
                      py: 1.25,
                    }}
                  >
                    {rendered}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function ScheduleRow({ schedule, onToggle, onDelete }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: '#171A1F',
        borderRadius: 2,
        px: 2,
        py: 1.5,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, backgroundColor: 'rgba(0,128,239,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
          <Description fontSize="small" />
        </Box>
        <Box>
          <Typography sx={{ color: '#F5F7FA', fontWeight: 700 }}>{schedule.name}</Typography>
          <Typography sx={{ color: '#8A8F98', fontSize: 12 }}>{schedule.frequency} · {schedule.day} at {schedule.time} · {schedule.format} · to {schedule.email}</Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <Switch checked={schedule.enabled} onChange={() => onToggle(schedule.id)} color="primary" />
        <IconButton onClick={() => onDelete(schedule.id)} sx={{ color: '#F87171' }}>
          <DeleteOutline />
        </IconButton>
      </Stack>
    </Box>
  );
}

export function NewScheduleModal({ open, onClose, onSubmit }) {
  const [form, setForm] = React.useState({
    reportType: 'Overall Church Performance',
    frequency: 'daily',
    day: 'Monday',
    time: '08:00',
    format: 'CSV',
    email: 'www.tegrayan@gmail.com',
  });

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = () => {
    onSubmit?.({
      id: `schedule-${Date.now()}`,
      name: form.reportType,
      frequency: form.frequency,
      day: form.day,
      time: form.time,
      format: form.format,
      email: form.email,
      enabled: true,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ color: '#F5F7FA', backgroundColor: '#121417' }}>New schedule</DialogTitle>
      <DialogContent dividers sx={{ backgroundColor: '#121417', color: '#F5F7FA' }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="report-type-label" sx={{ color: '#B7BEC9' }}>Report type</InputLabel>
            <Select
              labelId="report-type-label"
              value={form.reportType}
              label="Report type"
              onChange={(event) => handleChange('reportType', event.target.value)}
              sx={{ color: '#F5F7FA' }}
            >
              <MenuItem value="Overall Church Performance">Overall Church Performance</MenuItem>
              <MenuItem value="Twelve Tasks">Twelve Tasks</MenuItem>
              <MenuItem value="Cells Graph">Cells Graph</MenuItem>
              <MenuItem value="Life Class">Life Class</MenuItem>
              <MenuItem value="School of Leaders">School of Leaders</MenuItem>
              <MenuItem value="Plan 40">Plan 40</MenuItem>
              <MenuItem value="Service Target">Service Target</MenuItem>
            </Select>
          </FormControl>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="frequency-label" sx={{ color: '#B7BEC9' }}>Frequency</InputLabel>
              <Select
                labelId="frequency-label"
                value={form.frequency}
                label="Frequency"
                onChange={(event) => handleChange('frequency', event.target.value)}
                sx={{ color: '#F5F7FA' }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="day-label" sx={{ color: '#B7BEC9' }}>Day</InputLabel>
              <Select
                labelId="day-label"
                value={form.day}
                label="Day"
                onChange={(event) => handleChange('day', event.target.value)}
                sx={{ color: '#F5F7FA' }}
              >
                <MenuItem value="Monday">Monday</MenuItem>
                <MenuItem value="Tuesday">Tuesday</MenuItem>
                <MenuItem value="Wednesday">Wednesday</MenuItem>
                <MenuItem value="Thursday">Thursday</MenuItem>
                <MenuItem value="Friday">Friday</MenuItem>
                <MenuItem value="Saturday">Saturday</MenuItem>
                <MenuItem value="Sunday">Sunday</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Time"
              value={form.time}
              onChange={(event) => handleChange('time', event.target.value)}
              InputLabelProps={{ style: { color: '#B7BEC9' } }}
              InputProps={{ style: { color: '#F5F7FA' } }}
            />

            <FormControl fullWidth>
              <InputLabel id="format-label" sx={{ color: '#B7BEC9' }}>Export format</InputLabel>
              <Select
                labelId="format-label"
                value={form.format}
                label="Export format"
                onChange={(event) => handleChange('format', event.target.value)}
                sx={{ color: '#F5F7FA' }}
              >
                <MenuItem value="PDF">PDF</MenuItem>
                <MenuItem value="CSV">CSV</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <TextField
            fullWidth
            label="Recipient email(s)"
            value={form.email}
            onChange={(event) => handleChange('email', event.target.value)}
            InputLabelProps={{ style: { color: '#B7BEC9' } }}
            InputProps={{ style: { color: '#F5F7FA' } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ backgroundColor: '#121417', px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: '#DEE3EA' }}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" startIcon={<Save />} sx={{ backgroundColor: '#0080EF' }}>
          Save Schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ReportingDashboardShell({ breadcrumbSegments, title, subtitle, controls, children }) {
  const theme = useTheme();

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      <ReportingBreadcrumbs segments={breadcrumbSegments} />

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.2 }}>{title}</Typography>
          <Typography sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>{subtitle}</Typography>
        </Box>

        {controls}
      </Stack>

      {children}
    </Box>
  );
}

export function toDownloadStub(fileName, contentLabel) {
  const blob = new Blob([`Stub export: ${contentLabel}\nTODO: replace with backend file generation endpoint.`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
