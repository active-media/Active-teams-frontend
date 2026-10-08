import React from 'react';
import {
  Box,
  Paper,
  Button,
  Typography,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Skeleton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import EmojiPeopleIcon from '@mui/icons-material/EmojiPeople';
import UndoIcon from '@mui/icons-material/Undo';

const EventHistory = React.memo(function EventHistory({
  onViewDetails,
  onViewNewPeople,
  onViewConverts,
  onUnsaveEvent,
  events = [],
  isLoading = false,
  onRefresh,
  searchTerm = '',
}) {
  const theme = useTheme();
  const isXs  = useMediaQuery('(max-width:480px)'); 
  const isSm  = useMediaQuery(theme.breakpoints.down('sm'));
  const isMd  = useMediaQuery(theme.breakpoints.down('md'));

  const canUnsaveEvent = React.useCallback((row) => {
    if (!row) return false;
    const HOURS = 48;
    try {
      const now = Date.now();
      const candidates = [row.closed_at, row.closedAt, row.date, row.updated_at].filter(Boolean);
      for (const c of candidates) {
        const t = new Date(c).getTime();
        if (!Number.isNaN(t)) {
          const diff = now - t;
          if (diff >= 0 && diff <= HOURS * 60 * 60 * 1000) return true;
        }
      }
      return false;
    } catch { return false; }
  }, []);

  const getAttendanceCount = React.useCallback((row) => {
    if (!row) return 0;
    if (typeof row.total_attendance === 'number') return row.total_attendance;
    if (typeof row.attendance       === 'number') return row.attendance;
    if (Array.isArray(row.attendees))     return row.attendees.length;
    if (Array.isArray(row.attendanceData)) return row.attendanceData.length;
    return 0;
  }, []);

  const getNewPeopleCount = React.useCallback((row) => {
    if (!row) return 0;
    if (typeof row.new_people_count === 'number') return row.new_people_count;
    if (typeof row.newPeople        === 'number') return row.newPeople;
    if (Array.isArray(row.new_people))   return row.new_people.length;
    if (Array.isArray(row.newPeopleData)) return row.newPeopleData.length;
    return 0;
  }, []);

  const getConsolidatedCount = React.useCallback((row) => {
    if (!row) return 0;
    if (typeof row.consolidation_count === 'number') return row.consolidation_count;
    if (typeof row.consolidated        === 'number') return row.consolidated;
    if (Array.isArray(row.consolidations))   return row.consolidations.length;
    if (Array.isArray(row.consolidatedData)) return row.consolidatedData.length;
    return 0;
  }, []);

  const sortAlpha = (arr) =>
    [...arr].sort((a, b) =>
      `${a.name || ''} ${a.surname || ''}`.toLowerCase()
        .localeCompare(`${b.name || ''} ${b.surname || ''}`.toLowerCase()),
    );

  const handleView = React.useCallback((row, type) => {
    if (!row) return;
    if (type === 'attendance'  && onViewDetails)  onViewDetails(row,  sortAlpha(row.attendanceData  || row.attendees     || []));
    if (type === 'newPeople'   && onViewNewPeople) onViewNewPeople(row, sortAlpha(row.newPeopleData  || row.new_people    || []));
    if (type === 'consolidated'&& onViewConverts)  onViewConverts(row,  sortAlpha(row.consolidatedData || row.consolidations || []));
  }, [onViewDetails, onViewNewPeople, onViewConverts]);

  const handleUnsave = React.useCallback((row) => {
    if (!row || !canUnsaveEvent(row)) return;
    if (onUnsaveEvent) onUnsaveEvent(row);
  }, [onUnsaveEvent, canUnsaveEvent]);

  const filtered = React.useMemo(() => {
    if (!Array.isArray(events)) return [];
    if (!searchTerm.trim()) return events;
    const term = searchTerm.toLowerCase().trim();
    return events.filter((e) =>
      e && (
        (e.eventName  && e.eventName.toLowerCase().includes(term))  ||
        (e.date       && e.date.toString().toLowerCase().includes(term)) ||
        (e.status     && e.status.toLowerCase().includes(term))     ||
        (e.closed_by  && e.closed_by.toLowerCase().includes(term))
      ),
    );
  }, [events, searchTerm]);

  const columns = React.useMemo(() => {
    const cols = [];
    cols.push({
      field: 'eventName',
      headerName: 'Event',
      flex: 1,
      minWidth: isXs ? 100 : isSm ? 120 : 200,
      sortable: true,
      valueGetter: (value, row) => {
        if (!row) return '';
        const date = row.date
          ? new Date(row.date).toLocaleDateString('en-ZA', {
              year: isXs ? '2-digit' : 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : 'No date';
        return `${date} — ${row.eventName || 'Unnamed Event'}`;
      },
      sortComparator: (v1, v2, p1, p2) => {
        const t1 = p1.api.getRow(p1.id)?.date ? new Date(p1.api.getRow(p1.id).date).getTime() : 0;
        const t2 = p2.api.getRow(p2.id)?.date ? new Date(p2.api.getRow(p2.id).date).getTime() : 0;
        return t1 - t2;
      },
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={500} noWrap
          sx={{ fontSize: isXs ? '0.67rem' : isSm ? '0.73rem' : '0.85rem', lineHeight: 1.2 }}>
          {params.value}
        </Typography>
      ),
    });

    cols.push({
      field: 'attendanceCount',
      headerName: isXs ? '#' : isSm ? 'Att' : 'Attendance',
      width: isXs ? 34 : isSm ? 42 : 96,
      sortable: true,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (value, row) => getAttendanceCount(row),
      renderCell: (params) => (
        <Typography fontWeight={700}
          color={params.value > 0 ? 'primary.main' : 'text.disabled'}
          sx={{ fontSize: isXs ? '0.7rem' : isSm ? '0.78rem' : '0.9rem' }}>
          {params.value}
        </Typography>
      ),
    });

    if (!isXs) {
      cols.push({
        field: 'newPeopleCount',
        headerName: isSm ? 'New' : 'New People',
        width: isSm ? 42 : 96,
        sortable: true,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (value, row) => getNewPeopleCount(row),
        renderCell: (params) => (
          <Typography fontWeight={700}
            color={params.value > 0 ? 'success.main' : 'text.disabled'}
            sx={{ fontSize: isSm ? '0.78rem' : '0.9rem' }}>
            {params.value}
          </Typography>
        ),
      });
    }

    if (!isSm) {
      cols.push({
        field: 'consolidatedCount',
        headerName: 'Consolidated',
        width: 108,
        sortable: true,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (value, row) => getConsolidatedCount(row),
        renderCell: (params) => (
          <Typography fontWeight={700}
            color={params.value > 0 ? 'secondary.main' : 'text.disabled'}
            sx={{ fontSize: '0.9rem' }}>
            {params.value}
          </Typography>
        ),
      });
    }

    cols.push({
      field: 'viewAttendance',
      headerName: '',
      width: isSm ? 34 : 108,
      sortable: false, filterable: false,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => {
        const count = getAttendanceCount(params.row);
        return isSm
          ? <SmIconBtn onClick={() => handleView(params.row, 'attendance')} disabled={count === 0} color="primary"   icon={<VisibilityIcon />}  title="View Attendance" />
          : <MdViewBtn onClick={() => handleView(params.row, 'attendance')} disabled={count === 0} color="primary"   icon={<VisibilityIcon />} />;
      },
    });

    cols.push({
      field: 'viewNewPeople',
      headerName: '',
      width: isSm ? 34 : 108,
      sortable: false, filterable: false,
      align: 'center', headerAlign: 'center',
      renderCell: (params) => {
        const count = getNewPeopleCount(params.row);
        return isSm
          ? <SmIconBtn onClick={() => handleView(params.row, 'newPeople')} disabled={count === 0} color="success"    icon={<PersonIcon />}       title="View New People" />
          : <MdViewBtn onClick={() => handleView(params.row, 'newPeople')} disabled={count === 0} color="success"    icon={<PersonIcon />} />;
      },
    });

    if (!isXs) {
      cols.push({
        field: 'viewConsolidated',
        headerName: '',
        width: isSm ? 34 : 118,
        sortable: false, filterable: false,
        align: 'center', headerAlign: 'center',
        renderCell: (params) => {
          const count = getConsolidatedCount(params.row);
          return isSm
            ? <SmIconBtn onClick={() => handleView(params.row, 'consolidated')} disabled={count === 0} color="secondary" icon={<EmojiPeopleIcon />}  title="View Consolidated" />
            : <MdViewBtn onClick={() => handleView(params.row, 'consolidated')} disabled={count === 0} color="secondary" icon={<EmojiPeopleIcon />} />;
        },
      });
    }

    if (onUnsaveEvent) {
      cols.push({
        field: 'unsave',
        headerName: '',
        width: isSm ? 34 : 50,
        sortable: false, filterable: false,
        align: 'center', headerAlign: 'center',
        renderCell: (params) => {
          const canUnsave = canUnsaveEvent(params.row);
          return (
            <Tooltip title={canUnsave ? 'Unsave event' : 'Events can only be unsaved within 48 hours'}>
              <span>
                <IconButton size="small" color="warning" disabled={!canUnsave}
                  onClick={() => handleUnsave(params.row)}
                  sx={{ opacity: !canUnsave ? 0.22 : 1, p: isSm ? '3px' : '5px' }}>
                  <UndoIcon sx={{ fontSize: isSm ? '0.9rem' : '1.1rem' }} />
                </IconButton>
              </span>
            </Tooltip>
          );
        },
      });
    }

    return cols;
  }, [
    isXs, isSm,
    getAttendanceCount, getNewPeopleCount, getConsolidatedCount,
    handleView, handleUnsave, canUnsaveEvent, onUnsaveEvent,
  ]);

  const gridHeight    = isSm ? 'calc(100vh - 240px)' : isMd ? 'calc(100vh - 220px)' : 620;
  const gridMinHeight = isSm ? 360 : isMd ? 480 : 560;
  const gridMaxHeight = isSm ? 600 : isMd ? 660 : 700;
  const rowH          = isSm ? 44 : 52;
  const headerH       = isSm ? 40 : 48;

  if (isLoading && filtered.length === 0) {
    return (
      <Paper variant="outlined" sx={{ boxShadow: 3, overflow: 'hidden', width: '100%', height: gridHeight, minHeight: gridMinHeight }}>
        <Box sx={{ p: isSm ? 1 : 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Skeleton variant="rounded" height={headerH} />
          {Array.from({ length: isSm ? 6 : 9 }).map((_, i) => <Skeleton key={i} variant="rounded" height={rowH} />)}
        </Box>
      </Paper>
    );
  }

  if (!filtered || filtered.length === 0) {
    return (
      <Paper variant="outlined" sx={{
        boxShadow: 3, overflow: 'hidden', width: '100%',
        height: gridHeight, minHeight: gridMinHeight,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2, p: 3,
      }}>
        <Typography variant={isSm ? 'subtitle1' : 'h6'} color="text.secondary" textAlign="center">
          {events?.length === 0 ? 'No event history found' : 'No matching events found'}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center"
          sx={{ fontSize: isSm ? '0.78rem' : '0.875rem' }}>
          {events?.length === 0
            ? 'Closed events with attendance data will appear here'
            : 'Try a different search term'}
        </Typography>
        {onRefresh && (
          <Button variant="outlined" size={isSm ? 'small' : 'medium'} onClick={onRefresh} startIcon={<RefreshIcon />}>
            Refresh Events
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{
      boxShadow: 3, overflow: 'hidden', width: '100%',
      height: gridHeight, minHeight: gridMinHeight, maxHeight: gridMaxHeight,
    }}>
      <DataGrid
        rows={filtered}
        columns={columns}
        loading={isLoading}
        disableRowSelectionOnClick
        disableColumnMenu
        getRowId={(row) => row.id || row._id || Math.random().toString(36)}
        rowHeight={rowH}
        columnHeaderHeight={headerH}
        initialState={{
          pagination: { paginationModel: { pageSize: isSm ? 10 : 25 } },
          sorting:    { sortModel: [{ field: 'eventName', sort: 'desc' }] },
        }}
        pageSizeOptions={isSm ? [10, 25] : [10, 25, 50]}
        sx={{
          width: '100%',
          height: '100%',
          border: 'none',
          '& .MuiDataGrid-virtualScroller':       { overflowX: 'hidden !important' },
          '& .MuiDataGrid-columnHeadersInner':     { width: '100% !important' },

          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
            minHeight: `${headerH}px !important`,
            maxHeight: `${headerH}px !important`,
          },
          '& .MuiDataGrid-columnHeader': {
            height: `${headerH}px !important`,
            px: isXs ? '3px' : isSm ? '4px' : '12px',
            '& .MuiDataGrid-iconButtonContainer': { visibility: 'visible', width: 'auto' },
            '& .MuiDataGrid-sortIcon': { opacity: 0.5 },
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 700,
            fontSize: isXs ? '0.62rem' : isSm ? '0.68rem' : '0.8rem',
            color: theme.palette.text.primary,
            whiteSpace: 'nowrap',
          },
          '& .MuiDataGrid-columnSeparator': { display: 'none' },

          '& .MuiDataGrid-row': {
            '&:hover': { backgroundColor: theme.palette.action.hover },
            '&.Mui-selected': { backgroundColor: 'transparent' },
            '&.Mui-selected:hover': { backgroundColor: theme.palette.action.hover },
            width: '100% !important'
          },
          '& .MuiDataGrid-cell': {
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            alignItems: 'center',
            px: isXs ? '2px' : isSm ? '3px' : '12px',
            fontSize: isXs ? '0.67rem' : isSm ? '0.75rem' : '0.875rem',
            outline: 'none !important',
            '&:focus, &:focus-within': { outline: 'none' },
          },
          '& .MuiDataGrid-cell[data-field="eventName"]':         { justifyContent: 'flex-start' },
          '& .MuiDataGrid-cell[data-field="attendanceCount"]':   { justifyContent: 'center' },
          '& .MuiDataGrid-cell[data-field="newPeopleCount"]':    { justifyContent: 'center' },
          '& .MuiDataGrid-cell[data-field="consolidatedCount"]': { justifyContent: 'center' },
          '& .MuiDataGrid-cell[data-field="viewAttendance"]':    { justifyContent: 'center', px: '1px' },
          '& .MuiDataGrid-cell[data-field="viewNewPeople"]':     { justifyContent: 'center', px: '1px' },
          '& .MuiDataGrid-cell[data-field="viewConsolidated"]':  { justifyContent: 'center', px: '1px' },
          '& .MuiDataGrid-cell[data-field="unsave"]':            { justifyContent: 'center', px: '1px' },

          '& .MuiDataGrid-footerContainer': {
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            minHeight: '48px',
          },
          '& .MuiTablePagination-root': { fontSize: isSm ? '0.65rem' : '0.75rem', flexWrap: 'wrap' },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: isSm ? '0.63rem' : '0.75rem',
          },
          '& .MuiDataGrid-row:last-child .MuiDataGrid-cell': { borderBottom: 'none' },
          '& .MuiDataGrid-overlayWrapper': { minHeight: 80 },
        }}
      />
    </Paper>
  );
});

function SmIconBtn({ onClick, disabled, color, icon, title }) {
  return (
    <Tooltip title={disabled ? 'No data' : title}>
      <span>
        <IconButton size="small" color={color} disabled={disabled} onClick={onClick}
          sx={{ opacity: disabled ? 0.25 : 1, p: '3px' }}>
          {React.cloneElement(icon, { sx: { fontSize: '1rem' } })}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function MdViewBtn({ onClick, disabled, color, icon }) {
  return (
    <Tooltip title={disabled ? 'No data' : 'View'}>
      <span>
        <Button size="small" variant="outlined" color={color} startIcon={icon}
          onClick={onClick} disabled={disabled}
          sx={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
            px: 1.1, py: '3px', minWidth: 68, borderRadius: '6px',
            opacity: disabled ? 0.25 : 1,
            '&.Mui-disabled': { borderColor: 'currentColor', color: 'currentColor' },
          }}>
          VIEW
        </Button>
      </span>
    </Tooltip>
  );
}

export default EventHistory;