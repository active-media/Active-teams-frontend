import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  useTheme,
  Button,
  Box,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import CreateEvents from './CreateEvents';
import EventTypesModal from './EventTypesModal';

const CreateEventModal = ({ open, onClose, user }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // State for event type selection
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [selectedEventTypeObj, setSelectedEventTypeObj] = useState(null);
  const [eventTypeModalOpen, setEventTypeModalOpen] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Fetch event types when modal opens
  useEffect(() => {
    if (open) {
      fetchEventTypes();
    }
  }, [open]);

  const fetchEventTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/event-types`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched event types:', data);
        setEventTypes(data || []);
      }
    } catch (error) {
      console.error('Error fetching event types:', error);
    }
  };

  const handleEventTypeSelect = (eventType) => {
    console.log('Event type selected:', eventType);
    setSelectedEventType(eventType.name || eventType);
    setSelectedEventTypeObj(eventType);
    setShowEventForm(true);
  };

  const handleCreateNewEventType = () => {
    setEventTypeModalOpen(true);
  };

  const handleEventTypeModalClose = () => {
    setEventTypeModalOpen(false);
  };

  const handleEventTypeSubmit = async (eventTypeData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/event-types`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventTypeData),
      });

      if (response.ok) {
        const newEventType = await response.json();
        console.log('New event type created:', newEventType);
        await fetchEventTypes();
        
        setSelectedEventTypeObj(newEventType);
        setSelectedEventType(newEventType.name);
        
        setShowEventForm(true);
        setEventTypeModalOpen(false);
        return newEventType;
      }
    } catch (error) {
      console.error('Error creating event type:', error);
      throw error;
    }
  };

  const handleModalClose = () => {
    setSelectedEventType(null);
    setSelectedEventTypeObj(null);
    setShowEventForm(false);
    onClose();
  };

  const handleEventCreateSuccess = () => {
    handleModalClose();
  };

  return (
    <>
  
      <Dialog 
        open={open} 
        onClose={handleModalClose} 
        maxWidth="md" 
        fullWidth 
        scroll="body"
        PaperProps={{
          sx: {
            bgcolor: isDarkMode ? '#2d2d2d' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
            color: isDarkMode ? '#ffffff' : '#000000',
            borderBottom: isDarkMode ? '1px solid #444' : '1px solid #e0e0e0',
            fontWeight: 600,
            fontSize: '1.25rem',
          }}
        > 
          Create Event
          <IconButton
            aria-label="close"
            onClick={handleModalClose}
            sx={{ 
              position: 'absolute', 
              right: 8, 
              top: 8,
              color: isDarkMode ? '#ffffff' : '#000000',
              '&:hover': {
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent
          sx={{
            bgcolor: isDarkMode ? '#2d2d2d' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000',
            pt: 3,
          }}
        >
          {!showEventForm ? (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Select Event Type
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {eventTypes.map((eventType) => (
                  <Button
                    key={eventType._id}
                    variant="outlined"
                    onClick={() => handleEventTypeSelect(eventType)}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderColor: isDarkMode ? theme.palette.divider : 'rgba(0,0,0,0.23)',
                      color: theme.palette.text.primary,
                      '&:hover': {
                        borderColor: theme.palette.primary.main,
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      }
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="subtitle1" fontWeight="600">
                        {eventType.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {eventType.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        {eventType.isTicketed && (
                          <Typography variant="caption" sx={{ 
                            bgcolor: 'warning.main', 
                            color: 'white', 
                            px: 1, 
                            py: 0.25, 
                            borderRadius: 1 
                          }}>
                            Ticketed
                          </Typography>
                        )}
                        {eventType.isGlobal && (
                          <Typography variant="caption" sx={{ 
                            bgcolor: 'info.main', 
                            color: 'white', 
                            px: 1, 
                            py: 0.25, 
                            borderRadius: 1 
                          }}>
                            Global
                          </Typography>
                        )}
                        {eventType.hasPersonSteps && (
                          <Typography variant="caption" sx={{ 
                            bgcolor: 'secondary.main', 
                            color: 'white', 
                            px: 1, 
                            py: 0.25, 
                            borderRadius: 1 
                          }}>
                            Training
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Button>
                ))}
                
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNewEventType}
                  sx={{ mt: 2 }}
                >
                  Create New Event Type
                </Button>
              </Box>
            </Box>
          ) : (
            <CreateEvents 
              user={user} 
              isModal={true} 
              onClose={handleEventCreateSuccess}
              eventTypes={eventTypes}
              selectedEventType={selectedEventType}
              selectedEventTypeObj={selectedEventTypeObj}
            />
          )}
        </DialogContent>
      </Dialog>

      <EventTypesModal
        open={eventTypeModalOpen}
        onClose={handleEventTypeModalClose}
        onSubmit={handleEventTypeSubmit}
        setSelectedEventTypeObj={setSelectedEventTypeObj}
        selectedEventType={null}
      />
    </>
  );
};

export default CreateEventModal;