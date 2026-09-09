import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Grid,
  Stack,
  Typography,
  MenuItem,
  InputAdornment,
  IconButton,
  Autocomplete,
  useTheme
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Close
} from '@mui/icons-material';
import { useOrgConfig } from '../contexts/OrgConfigContext';
import { getLevelsWithLabels, getLeaderValue } from '../utils/hierarchy';

const NewUserModal = ({ 
  open, 
  onClose, 
  onUserCreated,
  loading = false 
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const { orgConfig } = useOrgConfig();
  const levels = getLevelsWithLabels(orgConfig);
  
  const [newUser, setNewUser] = useState({
    name: '',
    surname: '',
    email: '',
    password: '',
    phone_number: '',
    date_of_birth: '',
    address: '',
    gender: '',
    invitedBy: '',
    leaders: {},
    stage: 'Win',
    role: 'user'
  });
  
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [peopleList, setPeopleList] = useState([]);

  useEffect(() => {
    if (open) {
      const getAttendeesFromLocalStorage = () => {
        try {
          const storedAttendees = localStorage.getItem('attendees');
          if (storedAttendees) {
            const attendees = JSON.parse(storedAttendees);
            return Array.isArray(attendees) ? attendees : [];
          }
        } catch (error) {
          console.error('Error reading attendees from localStorage:', error);
        }
        return [];
      };

      const attendees = getAttendeesFromLocalStorage();
      setPeopleList(attendees);
      
      setNewUser({
        name: '',
        surname: '',
        email: '',
        password: '',
        phone_number: '',
        date_of_birth: '',
        address: '',
        gender: '',
        invitedBy: '',
        leaders: {},
        stage: 'Win',
        role: 'user'
      });
      setConfirmPassword('');
      setFormErrors({});
    }
  }, [open]);

  const validateForm = () => {
    const errors = {};
    
    if (!newUser.name?.trim()) errors.name = 'Name is required';
    if (!newUser.surname?.trim()) errors.surname = 'Surname is required';
    if (!newUser.email?.trim()) errors.email = 'Email is required';
    if (!newUser.password?.trim()) errors.password = 'Password is required';
    if (newUser.password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!newUser.phone_number?.trim()) errors.phone_number = 'Phone number is required';
    if (!newUser.date_of_birth?.trim()) errors.date_of_birth = 'Date of birth is required';
    if (!newUser.address?.trim()) errors.address = 'Home address is required';
    if (!newUser.gender?.trim()) errors.gender = 'Gender is required';
    if (!newUser.invitedBy?.trim()) errors.invitedBy = 'Invited by is required';
    if (!newUser.role?.trim()) errors.role = 'Role is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInvitedByChange = (value) => {
    if (!value) {
      setNewUser(prev => ({
        ...prev,
        invitedBy: '',
        leaders: {},
      }));
      setFormErrors(prev => ({ ...prev, invitedBy: '' }));
      return;
    }

    const label = typeof value === "string" ? value : value.label;
    const person = peopleList.find(
      p => `${p.Name || ""} ${p.Surname || ""}`.trim() === label.trim()
    );

    const leaders = {};
    for (const lv of levels) {
      const name = getLeaderValue(person, lv.key);
      if (name) leaders[lv.key] = name;
    }

    setNewUser(prev => ({
      ...prev,
      invitedBy: label,
      leaders,
    }));
    setFormErrors(prev => ({ ...prev, invitedBy: '' }));
  };

  const handleCreateUser = () => {
    if (!validateForm()) {
      return;
    }
    onUserCreated(newUser);
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const peopleOptions = peopleList.map(person => ({
    label: `${person.Name || ""} ${person.Surname || ""}`.trim(),
    person
  }));

  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '25px',
      bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#fafafa',
      '&:hover': { 
        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'white' 
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm" 
      fullWidth
      PaperProps={{ 
        sx: { 
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          bgcolor: theme.palette.background.paper
        } 
      }}
    >
      <DialogContent sx={{ p: { xs: 3, sm: 4, md: 5 }, position: 'relative' }}>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: 'grey.400',
            '&:hover': {
              color: theme.palette.text.primary
            }
          }}
        >
          <Close />
        </IconButton>

        <Typography 
          variant="h6" 
          fontWeight="bold" 
          sx={{ 
            mb: { xs: 3, sm: 4 }, 
            mt: 1, 
            color: theme.palette.text.primary 
          }}
        >
          CREATE NEW USER
        </Typography>
        
        <Stack spacing={{ xs: 2, sm: 2.5 }}>
          <TextField
            label="Name"
            value={newUser.name}
            onChange={(e) => { 
              setNewUser({...newUser, name: e.target.value}); 
              setFormErrors({...formErrors, name: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.name}
            helperText={formErrors.name}
            disabled={loading}
            sx={inputStyles}
          />

          <TextField
            label="Surname"
            value={newUser.surname}
            onChange={(e) => { 
              setNewUser({...newUser, surname: e.target.value}); 
              setFormErrors({...formErrors, surname: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.surname}
            helperText={formErrors.surname}
            disabled={loading}
            sx={inputStyles}
          />

          <TextField
            label="Date of Birth"
            type="date"
            value={newUser.date_of_birth}
            onChange={(e) => { 
              setNewUser({...newUser, date_of_birth: e.target.value}); 
              setFormErrors({...formErrors, date_of_birth: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.date_of_birth}
            helperText={formErrors.date_of_birth}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
            sx={inputStyles}
          />

          <TextField
            label="Home Address"
            value={newUser.address}
            onChange={(e) => { 
              setNewUser({...newUser, address: e.target.value}); 
              setFormErrors({...formErrors, address: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.address}
            helperText={formErrors.address}
            disabled={loading}
            sx={inputStyles}
          />

          <TextField
            label="Phone Number"
            value={newUser.phone_number}
            onChange={(e) => { 
              setNewUser({...newUser, phone_number: e.target.value}); 
              setFormErrors({...formErrors, phone_number: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.phone_number}
            helperText={formErrors.phone_number}
            disabled={loading}
            sx={inputStyles}
          />

          <TextField
            label="Gender"
            select
            value={newUser.gender}
            onChange={(e) => { 
              setNewUser({...newUser, gender: e.target.value}); 
              setFormErrors({...formErrors, gender: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.gender}
            helperText={formErrors.gender}
            disabled={loading}
            sx={inputStyles}
          >
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
          </TextField>

          <Autocomplete
            freeSolo
            disabled={loading}
            options={peopleOptions}
            getOptionLabel={(option) => typeof option === "string" ? option : option.label}
            value={peopleOptions.find(option => option.label === newUser.invitedBy) || null}
            onChange={(e, newValue) => handleInvitedByChange(newValue)}
            onInputChange={(e, newInputValue, reason) => {
              if (reason === "input") {
                setNewUser(prev => ({ ...prev, invitedBy: newInputValue }));
                setFormErrors(prev => ({ ...prev, invitedBy: '' }));
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Invited By"
                size="small"
                error={!!formErrors.invitedBy}
                helperText={formErrors.invitedBy}
                sx={inputStyles}
              />
            )}
          />

          <TextField
            label="Email Address"
            type="email"
            placeholder="example@gmail.com"
            value={newUser.email}
            onChange={(e) => { 
              setNewUser({...newUser, email: e.target.value}); 
              setFormErrors({...formErrors, email: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.email}
            helperText={formErrors.email}
            disabled={loading}
            sx={inputStyles}
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={newUser.password}
            onChange={(e) => { 
              setNewUser({...newUser, password: e.target.value}); 
              setFormErrors({...formErrors, password: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.password}
            helperText={formErrors.password}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={inputStyles}
          />

          <TextField
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => { 
              setConfirmPassword(e.target.value); 
              setFormErrors({...formErrors, confirmPassword: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.confirmPassword}
            helperText={formErrors.confirmPassword}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={inputStyles}
          />

          <TextField
            label="Role"
            select
            value={newUser.role}
            onChange={(e) => { 
              setNewUser({...newUser, role: e.target.value}); 
              setFormErrors({...formErrors, role: ''}); 
            }}
            fullWidth
            size="small"
            error={!!formErrors.role}
            helperText={formErrors.role}
            disabled={loading}
            sx={inputStyles}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="leader">Leader</MenuItem>
            <MenuItem value="registrant">Registrant</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>

          <Button 
            variant="contained" 
            onClick={handleCreateUser}
            disabled={loading}
            fullWidth
            sx={{ 
              mt: { xs: 2, sm: 3 },
              py: { xs: 1.25, sm: 1.5 },
              bgcolor: '#000',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              borderRadius: '25px',
              '&:hover': {
                bgcolor: '#222',
              },
              '&:disabled': {
                bgcolor: isDark ? '#555' : '#ccc',
                color: isDark ? '#888' : '#999'
              }
            }}
          >
            {loading ? 'Creating User...' : 'Create User'}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default NewUserModal;