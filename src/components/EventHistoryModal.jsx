import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  Stack,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

const TAB_LABELS = ['Attendees', 'New People', 'Consolidations'];

const buildDisplayName = (item = {}) => {
  const first = item.name || item.person_name || '';
  const last = item.surname || item.person_surname || '';
  const combined = `${first} ${last}`.trim();
  return combined || item.full_name || item.fullName || item.email || item.person_email || 'Unknown';
};

const buildSearchText = (item = {}) => {
  const fields = [
    item.name || item.person_name || '',
    item.surname || item.person_surname || '',
    item.email || item.person_email || '',
    item.phone || item.person_phone || '',
    item.leader1 || '',
    item.leader12 || '',
    item.leader144 || '',
    item.assigned_to || '',
    item.decision_type || item.consolidation_type || '',
    item.status || '',
    item.gender || '',
    item.invitedBy || item.invited_by || '',
  ];
  return fields.join(' ').toLowerCase();
};

const EventHistoryModal = React.memo(({ open, onClose, event, type, data = [], isLoading = false }) => {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setPage(0);
      setActiveTab(0);
    }
  }, [open]);

  const normalizedData = useMemo(() => {
    if (!data || typeof data !== 'object') return { attendees: [], new_people: [], consolidations: [] };

    const isLegacyShape = Array.isArray(data);
    if (isLegacyShape) {
      return { attendees: data, new_people: [], consolidations: [] };
    }

    return {
      attendees: Array.isArray(data.attendees) ? data.attendees : Array.isArray(data.present_attendees) ? data.present_attendees : [],
      new_people: Array.isArray(data.new_people) ? data.new_people : Array.isArray(data.newPeople) ? data.newPeople : [],
      consolidations: Array.isArray(data.consolidations) ? data.consolidations : Array.isArray(data.consolidatedData) ? data.consolidatedData : [],
    };
  }, [data]);

  const tabData = useMemo(() => {
    switch (activeTab) {
      case 1:
        return normalizedData.new_people;
      case 2:
        return normalizedData.consolidations;
      default:
        return normalizedData.attendees;
    }
  }, [activeTab, normalizedData]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(tabData)) return [];
    if (!searchTerm.trim()) return tabData;
    const term = searchTerm.toLowerCase().trim();
    return tabData.filter((item) => buildSearchText(item).includes(term));
  }, [tabData, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const eventName = event?.eventName || event?.event_name || 'Event';

  const downloadExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast?.info?.('No data to export') || alert('No data to export');
      return;
    }

    const headers =
      activeTab === 1
        ? ['Name', 'Surname', 'Email', 'Phone', 'Gender', 'Invited By', 'Leader @1', 'Leader @12', 'Leader @144']
        : activeTab === 2
          ? ['Name', 'Surname', 'Email', 'Phone', 'Decision Type', 'Assigned To', 'Status', 'Leader @1', 'Leader @12', 'Leader @144']
          : ['Name', 'Surname', 'Email', 'Phone', 'Leader @1', 'Leader @12', 'Leader @144'];

    const rows = filteredData.map((item) => {
      if (activeTab === 1) {
        return [
          item.name || '',
          item.surname || '',
          item.email || '',
          item.phone || '',
          item.gender || '',
          item.invitedBy || item.invited_by || '',
          item.leader1 || '',
          item.leader12 || '',
          item.leader144 || '',
        ];
      }

      if (activeTab === 2) {
        return [
          item.person_name || item.name || '',
          item.person_surname || item.surname || '',
          item.person_email || item.email || '',
          item.person_phone || item.phone || '',
          item.decision_type || item.consolidation_type || '',
          item.assigned_to || item.assignedTo || '',
          item.status || '',
          item.leader1 || '',
          item.leader12 || '',
          item.leader144 || '',
        ];
      }

      return [
        item.name || '',
        item.surname || '',
        item.email || '',
        item.phone || '',
        item.leader1 || '',
        item.leader12 || '',
        item.leader144 || '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const range = XLSX.utils.decode_range(ws['!ref']);
    ws['!cols'] = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      let maxWidth = 12;
      for (let r = range.s.r; r <= range.e.r; r += 1) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell?.v) continue;
        const len = String(cell.v).length;
        if (len > maxWidth) maxWidth = len;
      }
      ws['!cols'][c] = { wch: maxWidth + 2 };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, TAB_LABELS[activeTab].replace(/\s+/g, '_'));
    const fileName = `${eventName.replace(/[^a-z0-9]/gi, '_')}_${TAB_LABELS[activeTab].replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      const bytes = new Uint8Array(wbout.length);
      for (let i = 0; i < wbout.length; i += 1) bytes[i] = wbout.charCodeAt(i) & 0xff;

      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filteredData.length} records`);
    } catch (err) {
      console.error('Excel export failed:', err);
      toast.error('Failed to create Excel file');
    }
  };

  const renderMobileCard = (item, index) => (
    <Card key={item?._id || item?.id || index} variant="outlined" sx={{ mb: 1, boxShadow: 1 }}>
      <CardContent sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {index + 1}. {buildDisplayName(item)}
        </Typography>

        <Stack spacing={0.5} mt={1}>
          {(item.email || item.person_email) && (
            <Typography variant="body2" color="text.secondary">✉️ {item.email || item.person_email || '—'}</Typography>
          )}
          {(item.phone || item.person_phone) && (
            <Typography variant="body2" color="text.secondary">📞 {item.phone || item.person_phone || '—'}</Typography>
          )}

          {(item.leader1 || item.leader12 || item.leader144) && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                {item.leader1 && <Chip label={`@1: ${item.leader1}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />}
                {item.leader12 && <Chip label={`@12: ${item.leader12}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />}
                {item.leader144 && <Chip label={`@144: ${item.leader144}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />}
              </Stack>
            </>
          )}

          {activeTab === 2 && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                {item.decision_type && <Chip label={item.decision_type} size="small" color="secondary" sx={{ fontSize: '0.6rem', height: 18 }} />}
                {item.assigned_to && <Chip label={`Assigned: ${item.assigned_to}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 18 }} />}
                {item.status && <Chip label={item.status} size="small" color={item.status === 'completed' ? 'success' : 'default'} sx={{ fontSize: '0.6rem', height: 18 }} />}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );

  const renderDesktopRow = (item, index) => (
    <TableRow hover key={item?._id || item?.id || index}>
      <TableCell>{index + 1}</TableCell>
      <TableCell>
        <Typography variant="body2">{buildDisplayName(item)}</Typography>
      </TableCell>
      <TableCell>{item.email || item.person_email || '—'}</TableCell>
      <TableCell>{item.phone || item.person_phone || '—'}</TableCell>
      <TableCell>{item.leader1 || '—'}</TableCell>
      <TableCell>{item.leader12 || '—'}</TableCell>
      <TableCell>{item.leader144 || '—'}</TableCell>
      {activeTab === 2 && (
        <>
          <TableCell>{item.decision_type || item.consolidation_type || '—'}</TableCell>
          <TableCell>{item.assigned_to || item.assignedTo || 'Not assigned'}</TableCell>
          <TableCell>
            <Chip
              label={item.status || 'Active'}
              size="small"
              color={item.status === 'completed' ? 'success' : 'default'}
            />
          </TableCell>
        </>
      )}
    </TableRow>
  );

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      TransitionProps={{ timeout: 300, mountOnEnter: true, unmountOnExit: true }}
      PaperProps={{
        sx: {
          maxHeight: '90vh',
          transition: 'all 0.3s ease',
          ...(isSmDown && {
            margin: 2,
            maxHeight: '85vh',
            width: 'calc(100% - 32px)',
          }),
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>
        <Typography variant="h6" component="span">
          {eventName} Event Stats
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {TAB_LABELS[activeTab]} · {filteredData.length} shown
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ maxHeight: isSmDown ? 420 : 540, overflowY: 'auto', p: isSmDown ? 1 : 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => {
            setActiveTab(value);
            setPage(0);
          }}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
        >
          {TAB_LABELS.map((label, index) => {
            const count = index === 0 ? normalizedData.attendees.length : index === 1 ? normalizedData.new_people.length : normalizedData.consolidations.length;
            return <Tab key={label} label={`${label} (${count})`} />;
          })}
        </Tabs>

        <TextField
          size="small"
          placeholder="Search this tab..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          fullWidth
          sx={{ mb: 2, boxShadow: 1 }}
        />

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : filteredData.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
            {searchTerm ? 'No matching data found in this tab' : 'No data available for this tab'}
          </Typography>
        ) : (
          <>
            {isSmDown ? (
              <Box>
                {paginatedData.map((item, idx) => renderMobileCard(item, page * rowsPerPage + idx))}
              </Box>
            ) : (
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Leader @1</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Leader @12</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Leader @144</TableCell>
                    {activeTab === 2 && (
                      <>
                        <TableCell sx={{ fontWeight: 600 }}>Decision Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedData.map((item, idx) => renderDesktopRow(item, page * rowsPerPage + idx))}
                </TableBody>
              </Table>
            )}

            <Box mt={1}>
              <TablePagination
                component="div"
                count={filteredData.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[25, 50, 100]}
              />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: isSmDown ? 1 : 2 }}>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadExcel} size={isSmDown ? 'small' : 'medium'} disabled={filteredData.length === 0 || isLoading}>
          Download XLSX
        </Button>
        <Button onClick={onClose} variant="contained" size={isSmDown ? 'small' : 'medium'}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
});

EventHistoryModal.displayName = 'EventHistoryModal';

export default EventHistoryModal;