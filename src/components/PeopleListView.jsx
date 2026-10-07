import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Avatar,
  TablePagination,
  useMediaQuery,
  useTheme,
  Collapse
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

const PeopleListView = ({ people, onEdit, onDelete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [expandedRow, setExpandedRow] = useState(null);

  const handleMenuClick = (e, person) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setSelectedPerson(person);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPerson(null);
  };

  const handleEdit = () => {
    if (selectedPerson) {
      onEdit(selectedPerson);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedPerson) {
      onDelete(selectedPerson._id);
    }
    handleMenuClose();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (personId) => {
    if (isMobile) {
      setExpandedRow(expandedRow === personId ? null : personId);
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || "?";
  };

  const getAvatarColor = (name) => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3'];
    return colors[(name?.length || 0) % 6];
  };

  const formatDate = (date) => {
    return date ? new Date(date).toLocaleDateString() : "-";
  };

  const getStageColor = (stage) => {
    switch (stage) {
      case 'Win': return 'success';
      case 'Consolidate': return 'info';
      case 'Disciple': return 'warning';
      case 'Send': return 'error';
      default: return 'default';
    }
  };

  const paginatedPeople = people.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Mobile view
  if (isMobile) {
    return (
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
          {paginatedPeople.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No people found
              </Typography>
            </Box>
          ) : (
            paginatedPeople.map((person) => (
              <Box key={person._id}>
                <Box
                  onClick={() => handleRowClick(person._id)}
                  sx={{
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          fontSize: 14,
                          backgroundColor: getAvatarColor(person.name + " " + person.surname)
                        }}
                      >
                        {getInitials(person.name + " " + person.surname)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={500} noWrap>
                          {person.name} {person.surname}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                          <Chip
                            label={person.Stage}
                            size="small"
                            color={getStageColor(person.Stage)}
                            sx={{ height: 20, fontSize: 10 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {person.gender}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton size="small" onClick={(e) => handleMenuClick(e, person)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small">
                        {expandedRow === person._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                <Collapse in={expandedRow === person._id} timeout="auto" unmountOnExit>
                  <Box sx={{ 
                    px: 2, 
                    pb: 2, 
                    pt: 1, 
                    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
                  }}>
                    {/* Contact Info */}
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Contact
                      </Typography>
                      {person.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <EmailIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
                          <Typography variant="body2">{person.email}</Typography>
                        </Box>
                      )}
                      {person.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
                          <Typography variant="body2">{person.phone}</Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Location */}
                    {person.location && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Location
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
                          <Typography variant="body2">{person.location}</Typography>
                        </Box>
                      </Box>
                    )}

                    {/* Leaders */}
                    {(person.leaders.leader1 || person.leaders.leader12 || person.leaders.leader144 || person.leaders.leader1728) && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Leaders
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {person.leaders.leader1 && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <GroupIcon sx={{ fontSize: 14 }} />
                              @1: {person.leaders.leader1}
                            </Typography>
                          )}
                          {person.leaders.leader12 && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <GroupIcon sx={{ fontSize: 14 }} />
                              @12: {person.leaders.leader12}
                            </Typography>
                          )}
                          {person.leaders.leader144 && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <GroupIcon sx={{ fontSize: 14 }} />
                              @144: {person.leaders.leader144}
                            </Typography>
                          )}
                          {person.leaders.leader1728 && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <GroupIcon sx={{ fontSize: 14 }} />
                              @1728: {person.leaders.leader1728}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Additional Info */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      pt: 1, 
                      borderTop: '1px solid', 
                      borderColor: 'divider' 
                    }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">DOB</Typography>
                        <Typography variant="body2">{formatDate(person.dob)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Updated</Typography>
                        <Typography variant="body2">{formatDate(person.lastUpdated)}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            ))
          )}
        </Box>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100,250]}
          component="div"
          count={people.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </Paper>
    );
  }

  // Desktop view - Compact table without horizontal scroll
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Location</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '18%' }}>Leaders</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Stage</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '8%' }}>Gender</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '6%' }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedPeople.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No people found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedPeople.map((person) => (
                <TableRow
                  key={person._id}
                  hover
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: 12,
                          backgroundColor: getAvatarColor(person.name + " " + person.surname)
                        }}
                      >
                        {getInitials(person.name + " " + person.surname)}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>
                          {person.name} {person.surname}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(person.dob)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {person.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />
                          <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>{person.email}</Typography>
                        </Box>
                      )}
                      {person.phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />
                          <Typography variant="caption">{person.phone}</Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {person.location && (
                      <Typography variant="caption" noWrap sx={{ maxWidth: 180, display: 'block' }}>
                        {person.location}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                      {person.leaders.leader1 && (
                        <Typography variant="caption" noWrap>
                          @1: {person.leaders.leader1}
                        </Typography>
                      )}
                      {person.leaders.leader12 && (
                        <Typography variant="caption" noWrap>
                          @12: {person.leaders.leader12}
                        </Typography>
                      )}
                      {person.leaders.leader144 && (
                        <Typography variant="caption" noWrap>
                          @144: {person.leaders.leader144}
                        </Typography>
                      )}
                      {person.leaders.leader1728 && (
                        <Typography variant="caption" noWrap>
                          @1728: {person.leaders.leader1728}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={person.Stage}
                      size="small"
                      color={getStageColor(person.Stage)}
                      sx={{ fontWeight: 500, fontSize: 10, height: 22 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{person.gender}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, person)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100,250]}
        component="div"
        count={people.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default PeopleListView;