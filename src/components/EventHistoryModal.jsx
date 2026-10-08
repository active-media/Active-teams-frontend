import React, { useState, useMemo, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Box, Typography,
    Table, TableBody, TableCell, TableHead, TableRow,
    TablePagination, Chip, useMediaQuery, useTheme,
    Card, CardContent, Stack, Divider, Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

const EventHistoryModal = React.memo(({
    open,
    onClose,
    event,
    type,
    data = []
}) => {
    const theme = useTheme();
    const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);


    useEffect(() => {
        if (open) {
            setSearchTerm('');
            setPage(0);
        }
    }, [open]);

    const filteredData = useMemo(() => {
        if (!Array.isArray(data)) return [];
        if (!searchTerm.trim()) return data;

        const term = searchTerm.toLowerCase().trim();
        return data.filter(item => {
            if (!item) return false;


            const searchString = [
                item.name || '',
                item.surname || '',
                item.person_name || '',
                item.person_surname || '',
                item.email || '',
                item.person_email || '',
                item.phone || '',
                item.person_phone || '',
                item.leader1 || '',
                item.leader12 || '',
                item.leader144 || '',
                item.assigned_to || '',
                item.decision_type || '',
                item.consolidation_type || ''
            ].join(' ').toLowerCase();

            return searchString.includes(term);
        });
    }, [data, searchTerm]);

    const paginatedData = useMemo(() => {
        return filteredData.slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage
        );
    }, [filteredData, page, rowsPerPage]);

    const getModalTitle = () => {
        if (!event) return 'Event Details';

        const eventName = event.eventName || 'Event';
        const count = filteredData.length;

        switch (type) {
            case 'attendance': return `Attendance for ${eventName} (${count})`;
            case 'newPeople': return `New People for ${eventName} (${count})`;
            case 'consolidated': return `Consolidated for ${eventName} (${count})`;
            default: return `Details for ${eventName}`;
        }
    };

    const handleClose = () => {
        onClose();
    };

    const downloadExcel = () => {
        if (!filteredData || filteredData.length === 0) {
            toast?.info?.("No data to export") || alert("No data to export");
            return;
        }

        let headers = [];
        let dataRows = [];

        if (type === 'attendance') {
            headers = [
            'Name', 'Surname', 'Email', 'Phone',
            'Leader @1', 'Leader @12', 'Leader @144', 'CheckIn_Time'
            ];
            dataRows = filteredData.map(item => [
            item.name || '',
            item.surname || '',
            item.email || '',
            item.phone || '',
            item.leader1 || '',
            item.leader12 || '',
            item.leader144 || '',
            item.time || ''
            ]);
        } 
        else if (type === 'newPeople') {
            headers = [
            'Name', 'Surname', 'Email', 'Phone', 'Gender', 
            'InvitedBy', 'Leader @1', 'Leader @12', 'Leader @144'
            ];
            dataRows = filteredData.map(item => [
            item.name || '',
            item.surname || '',
            item.email || '',
            item.phone || '',
            item.gender || '',
            item.invitedBy || '',
            item.leader1 || '',
            item.leader12 || '',
            item.leader144 || ''
            ]);
        } 
        else {  // consolidated / default
            headers = [
            'Name', 'Surname', 'Email', 'Phone',
            'Leader @1', 'Leader @12', 'Leader @144',
            'Decision_Type', 'Assigned_To', 'Status'
            ];
            dataRows = filteredData.map(item => [
            item.name || item.person_name || '',
            item.surname || item.person_surname || '',
            item.email || item.person_email || '',
            item.phone || item.person_phone || '',
            item.leader1 || '',
            item.leader12 || '',
            item.leader144 || '',
            item.decision_type || item.consolidation_type || '',
            item.assigned_to || '',
            item.status || ''
            ]);
        }

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet([
            headers,           // header row
            ...dataRows        // data rows
        ]);

        // Optional: auto-size columns
        const range = XLSX.utils.decode_range(ws['!ref']);
        ws['!cols'] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            let maxw = 10;
            for (let R = range.s.r; R <= range.e.r; ++R) {
            const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
            if (!cell?.v) continue;
            const len = String(cell.v).length;
            if (len > maxw) maxw = len;
            }
            ws['!cols'][C] = { wch: maxw + 3 };
        }

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, type === 'attendance' ? "Present" :
                                            type === 'newPeople' ? "New People" :
                                            "Consolidated");

        // Filename
        const eventName = (event?.eventName || 'Event').replace(/[^a-z0-9]/gi, '_');
        const today = new Date().toISOString().split('T')[0];
        const filename = `${type}_${eventName}_${today}.xlsx`;

        // Trigger download (reliable browser method)
        try {
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

            function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
            }

            const blob = new Blob([s2ab(wbout)], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast?.success?.(`Downloaded ${filteredData.length} records`);
        } catch (err) {
            console.error("Excel export failed:", err);
            toast?.error?.("Failed to create Excel file");
        }
    };

    if (!open) return null;


    const MobileCard = ({ item, index }) => (
        <Card variant="outlined" sx={{ mb: 1, boxShadow: 1 }}>
            <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                    {index}. {item.name || item.person_name} {item.surname || item.person_surname}
                </Typography>

                <Stack spacing={0.5} mt={1}>
                    {item.email && (
                        <Typography variant="body2" color="text.secondary">
                            ✉️ {item.email || item.person_email}
                        </Typography>
                    )}
                    {item.phone && (
                        <Typography variant="body2" color="text.secondary">
                            📞 {item.phone || item.person_phone}
                        </Typography>
                    )}

                    {(item.leader1 || item.leader12 || item.leader144) && (
                        <>
                            <Divider sx={{ my: 0.5 }} />
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                {item.leader1 && (
                                    <Chip label={`@1: ${item.leader1}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                )}
                                {item.leader12 && (
                                    <Chip label={`@12: ${item.leader12}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                )}
                                {item.leader144 && (
                                    <Chip label={`@144: ${item.leader144}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                                )}
                            </Stack>
                        </>
                    )}

                    {type === 'consolidated' && (
                        <>
                            <Divider sx={{ my: 0.5 }} />
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                                <Chip
                                    label={item.decision_type || item.consolidation_type || 'Commitment'}
                                    size="small"
                                    color={(item.decision_type || item.consolidation_type) === 'Recommitment' ? 'primary' : 'secondary'}
                                    sx={{ fontSize: '0.6rem', height: 18 }}
                                />
                                {item.assigned_to && (
                                    <Chip
                                        label={`Assigned: ${item.assigned_to}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.6rem', height: 18 }}
                                    />
                                )}
                            </Stack>
                        </>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );


    const DesktopRow = ({ item, index }) => (
        <TableRow hover>
            <TableCell>{index}</TableCell>
            <TableCell>
                <Typography variant="body2">
                    {item.name || item.person_name} {item.surname || item.person_surname}
                </Typography>
            </TableCell>
            <TableCell>{item.email || item.person_email || "—"}</TableCell>
            <TableCell>{item.phone || item.person_phone || "—"}</TableCell>
            <TableCell>{item.leader1 || "—"}</TableCell>
            <TableCell>{item.leader12 || "—"}</TableCell>
            <TableCell>{item.leader144 || "—"}</TableCell>
            {type === 'consolidated' && (
                <>
                    <TableCell>
                        <Chip
                            label={item.decision_type || item.consolidation_type || 'Commitment'}
                            size="small"
                            color={(item.decision_type || item.consolidation_type) === 'Recommitment' ? 'primary' : 'secondary'}
                            variant="filled"
                        />
                    </TableCell>
                    <TableCell>{item.assigned_to || item.assignedTo || "Not assigned"}</TableCell>
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

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="xl"
            TransitionProps={{
                timeout: 300,
                mountOnEnter: true,
                unmountOnExit: true
            }}
            PaperProps={{
                sx: {
                    maxHeight: '90vh',
                    transition: 'all 0.3s ease',
                    ...(isSmDown && {
                        margin: 2,
                        maxHeight: '85vh',
                        width: 'calc(100% - 32px)',
                    })
                }
            }}
        >
            <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>
                {getModalTitle()}
                <Typography variant="body2" color="text.secondary">
                    Total: {data.length} {filteredData.length !== data.length && `(Filtered: ${filteredData.length})`}
                </Typography>
            </DialogTitle>

            <DialogContent dividers sx={{
                maxHeight: isSmDown ? 400 : 500,
                overflowY: "auto",
                p: isSmDown ? 1 : 2
            }}>
                <TextField
                    size="small"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(0);
                    }}
                    fullWidth
                    sx={{ mb: 2, boxShadow: 1 }}
                />

                {filteredData.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                        {searchTerm ? 'No matching data found' : 'No data available'}
                    </Typography>
                ) : (
                    <>
                        {isSmDown ? (
                            <Box>
                                {paginatedData.map((item, idx) => (
                                    <MobileCard
                                        key={item._id || item.id || idx}
                                        item={item}
                                        index={page * rowsPerPage + idx + 1}
                                    />
                                ))}
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
                                        {type === 'consolidated' && (
                                            <>
                                                <TableCell sx={{ fontWeight: 600 }}>Decision Type</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Assigned To</TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {paginatedData.map((item, idx) => (
                                        <DesktopRow
                                            key={item._id || item.id || idx}
                                            item={item}
                                            index={page * rowsPerPage + idx + 1}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        <Box mt={1}>
                            <TablePagination
                                component="div"
                                count={filteredData.length}
                                page={page}
                                onPageChange={(e, newPage) => setPage(newPage)}
                                rowsPerPage={rowsPerPage}
                                onRowsPerPageChange={(e) => {
                                    setRowsPerPage(parseInt(e.target.value, 10));
                                    setPage(0);
                                }}
                                rowsPerPageOptions={[25, 50, 100]}
                            />
                        </Box>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ p: isSmDown ? 1 : 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={downloadExcel}
                    size={isSmDown ? "small" : "medium"}
                    disabled={filteredData.length === 0}
                >
                    Download XSLX
                </Button>
                <Button
                    onClick={handleClose}
                    variant="contained"
                    size={isSmDown ? "small" : "medium"}
                >
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
});


EventHistoryModal.displayName = 'EventHistoryModal';

export default EventHistoryModal;