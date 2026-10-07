import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography,
  Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Grid, Alert,
  Divider, Chip, CircularProgress, Tooltip, Checkbox, FormGroup, Collapse,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Person,
  Event,
  Lock,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

const USER_ROLES = {
  ADMIN: 'admin', LEADER_1: 'leader1', LEADER_12: 'leader12',
  LEADER_144: 'leader144', REGISTRANT: 'registrant', USER: 'user'
};

const EditEventModal = ({ isOpen, onClose, event, token, refreshEvents }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [editScope, setEditScope] = useState('single');
  const [contextFilter,] = useState('all');
  const [isCellEvent, setIsCellEvent] = useState(false);
  const [, setPersonIdentifier] = useState('');
  const [originalPersonIdentifier, setOriginalPersonIdentifier] = useState('');
  const [originalContext, setOriginalContext] = useState({ day: null, location: null, eventName: null });
  const [availableFields, setAvailableFields] = useState([]);
  const [changedFields, setChangedFields] = useState([]);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  const [isActiveToggle, setIsActiveToggle] = useState(true);
  const [deactivationDialogOpen, setDeactivationDialogOpen] = useState(false);
  const [deactivationWeeks, setDeactivationWeeks] = useState(2);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isToggling, setIsToggling] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [loggedInUserRole] = useState(() => {
    try {
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) return JSON.parse(storedProfile).role || "user";
    } catch { return "user"; }
    return "user";
  });

  const isAdmin = loggedInUserRole === USER_ROLES.ADMIN;
  const isLeader1 = loggedInUserRole === USER_ROLES.LEADER_1;
  const isLeader144 = loggedInUserRole === USER_ROLES.LEADER_144;
  const hasEditPermission = isAdmin || isLeader1;

  const fieldMapping = {
    'Leader': ['Leader', 'eventLeader', 'eventLeaderName'],
    'eventLeader': ['eventLeader', 'Leader', 'eventLeaderName'],
    'Email': ['Email', 'eventLeaderEmail', 'email'],
    'Address': ['Address', 'location', 'address'],
    'Day': ['Day', 'recurring_day'],
    'Time': ['Time', 'time'],
    'Event Name': ['Event Name', 'eventName'],
    'status': ['status', 'Status'],
  };

  console.log("User role:", fieldMapping);
  const getFieldPermissions = useCallback((field) => {
    const fl = field.toLowerCase();
    const isWeekId = fl.includes('week') && (fl.includes('identifier') || fl.includes('id'));
    const isOriginalEventId = (fl.includes('original') && fl.includes('event') && fl.includes('id'));
    const isComposedEventId = (fl.includes('composite') || fl.includes('composed')) && fl.includes('id');
    const isEventType = fl.includes('event') && (fl.includes('type') || fl === 'eventtype');
    const isRestrictedLeader = fl === 'leader1' || fl === 'leader12' || fl.includes('leader at 12');

    if (isWeekId || isOriginalEventId || isComposedEventId)
      return { disabled: true, reason: 'This field cannot be edited' };
    if (isEventType) return { disabled: true, reason: 'Event type cannot be edited' };
    if (isRestrictedLeader) {
      if (isLeader144) return { disabled: true, reason: 'Leader at 144 cannot edit leader fields' };
      if (!hasEditPermission) return { disabled: true, reason: 'Leader fields can only be edited by administrators and Leader 1' };
    }
    return { disabled: false, reason: null };
  }, [hasEditPermission, isLeader144]);

  const isFieldDisabled = useCallback((field) => getFieldPermissions(field).disabled, [getFieldPermissions]);
  const getDisabledReason = useCallback((field) => getFieldPermissions(field).reason, [getFieldPermissions]);

  const cleanEventId = (event) => {
    if (!event) return null;
    const cleanEvent = { ...event };
    if (cleanEvent._id?.includes?.('_')) cleanEvent._id = cleanEvent._id.split('_')[0];
    if (cleanEvent.id?.includes?.('_')) cleanEvent.id = cleanEvent.id.split('_')[0];
    return cleanEvent;
  };

  useEffect(() => {
    if (event) {
      const cleanEvent = cleanEventId(event);
      const identifier = cleanEvent.Leader || cleanEvent.eventLeader || cleanEvent.eventLeaderName || '';
      setOriginalPersonIdentifier(identifier);
      setPersonIdentifier(identifier);

      const day = cleanEvent.Day || cleanEvent.recurring_day?.[0] || null;
      const location = cleanEvent.Address || cleanEvent.location || null;
      const eventName = cleanEvent['Event Name'] || cleanEvent.eventName || null;
      setOriginalContext({ day, location, eventName });
      const eventType = cleanEvent['Event Type'] || cleanEvent.eventType || '';
      const isCell = eventType.toLowerCase() === 'cells';
      setIsCellEvent(isCell);

      if (isCell) {
        setEditScope('person');
      } else {
        setEditScope('single');
      }

      const initialData = {};
      Object.keys(cleanEvent).forEach(key => {
        const systemFields = [
  '_id', '__v', 'id', 'UUID', 'created_at', 'updated_at',
  'persistent_attendees', 'attendees', 'total_attendance',
  'isEventType', 'eventTypeId', 'last_updated',
  'attendance', 'attendance_data',
  'checked_in_count', 'decisions', 'total_associated',
  'total_associated_count', 'last_attendance_count',
  'last_decisions_count', 'last_attendance_breakdown',
  'last_attendance_data', 'last_headcount', 'last_status',
  'last_attendance_date', 'last_updated_by',
  'priceTiers', 'price_tiers',
  'new_people', 'consolidations',
  'is_new_event', 'updatedAt', 'Date Of Event',
  'total_headcounts', 'deactivation_start', 'deactivation_end',
  'deactivation_reason', 'is_active'
];

        if (!systemFields.includes(key)) {
          let value = cleanEvent[key] ?? '';

          const lowerKey = key.toLowerCase();
          if ((lowerKey.includes('date') && !lowerKey.includes('datecaptured') && !lowerKey.includes('display')) || key === 'date') {
            if (value) {
              if (typeof value === 'string') {
                value = value.split('T')[0];
                console.log(`Loading date field ${key}: ${value}`);
              } else if (value instanceof Date) {
                const year = value.getFullYear();
                const month = String(value.getMonth() + 1).padStart(2, '0');
                const day = String(value.getDate()).padStart(2, '0');
                value = `${year}-${month}-${day}`;
                console.log(`Converting Date object for ${key}: ${value}`);
              }
            }
          }
          initialData[key] = value;
        }
      });
      setFormData(initialData);

      setIsActiveToggle(initialData.is_active === true || initialData.is_active === false ? initialData.is_active : true);
      const editableFields = Object.keys(initialData).filter(key =>
        !['_id', 'id', '__v', 'UUID', 'created_at', 'updated_at',
          'persistent_attendees', 'attendees', 'total_attendance',
          'isEventType', 'eventTypeId', 'last_updated'].includes(key)
        );
        setAvailableFields(editableFields);
    }
  }, [event]);

  useEffect(() => {
    if (event) {
      const changed = [];
      Object.keys(formData).forEach(key => {
        const originalValue = event[key];
        const newValue = formData[key];
        const isEmptyToRemove = (newValue === '' && originalValue !== undefined && originalValue !== null && originalValue !== '');
        const isValueChanged = newValue !== originalValue;
        if (isEmptyToRemove || isValueChanged) changed.push(key);
      });
      setChangedFields(changed);
    }
  }, [formData, event]);

  const handleChange = (field, value) => {
    const permissions = getFieldPermissions(field);
    if (permissions.disabled) {
      toast.warning(permissions.reason);
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };
  console.log("SCOPE", editScope, contextFilter)

  const handleDeactivateCell = async () => {
    try {
      setIsToggling(true);
      const userToken = localStorage.getItem("access_token") || token;

      const params = new URLSearchParams({
        weeks: deactivationWeeks.toString(),
        "is_permanent_deact": isPermanent,
        "event_id": event.event_id
      });

      if (deactivationReason) {
        params.append('reason', deactivationReason);
      }
      params.append('person_name', originalPersonIdentifier);
      params.append('cell_identifier', originalContext.eventName);


      console.log("Calling endpoint with:", params.toString());

      const response = await fetch(`${BACKEND_URL}/events/deactivate?${params.toString()}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Deactivation failed');
      }

      const result = await response.json();

      // Success message
      toast.success(
        <div>
          <div>{new Date(result.deactivation_end) < new Date() ? "You cell has been successfully deactivated" : result.message}</div>
          <div style={{ fontSize: '0.85em', marginTop: '5px' }}>
            Will auto-reactivate on: {new Date(result.deactivation_end) < new Date() ? "Never" : new Date(result.deactivation_end).toLocaleDateString()}
          </div>
        </div>
      );

      // Update local state
      setIsActiveToggle(false);
      setFormData(prev => ({
        ...prev,
        is_active: false,
        deactivation_start: new Date().toISOString(),
        deactivation_end: result.deactivation_end,
        deactivation_reason: deactivationReason
      }));
      handleSubmit(null, true)

      // Close and reset
      setDeactivationDialogOpen(false);
      setDeactivationReason('');
      setDeactivationWeeks(2);

      if (refreshEvents) await refreshEvents(); 


    } catch (error) {
      console.error('Deactivation error:', error);
      toast.error(error.message);
      setIsActiveToggle(true);
    } finally {
      setIsToggling(false);
    }
  };

  const handleReactivateCell = async () => {
    try {
      setIsToggling(true);
      const userToken = localStorage.getItem("access_token") || token;
      if (!userToken) {
        toast.error("No authentication token found. Please log in again.");
        setIsToggling(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('event_id', event.event_id);
      let endpoint = '/cells/reactivate';

      if (editScope === 'single' || !isCellEvent) {
        // Reactivate specific cell
        const cellName = formData.eventName || formData['Event Name'] || originalContext.eventName;
        params.append('cell_identifier', cellName);
        params.append('person_name', originalPersonIdentifier);

        if (originalContext.day) {
          params.append('day_of_week', originalContext.day);
        }
      } else {
        // Reactivate based on person scope
        if (contextFilter === 'all') {
          params.append('cell_identifier', originalPersonIdentifier);
        } else if (contextFilter === 'day' && originalContext.day) {
          params.append('cell_identifier', originalPersonIdentifier);
          params.append('day_of_week', originalContext.day);
        } else if (contextFilter === 'eventName' && originalContext.eventName) {
          params.append('cell_identifier', originalContext.eventName);
          params.append('person_name', originalPersonIdentifier);
        }
      }

      const response = await fetch(`${BACKEND_URL}${endpoint}?${params.toString()}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      toast.success(result.message);

      // Update local state
      setIsActiveToggle(true);
      setFormData(prev => ({
        ...prev,
        is_active: true,
        deactivation_start: null,
        deactivation_end: null,
        deactivation_reason: null
      }));

      if (refreshEvents) refreshEvents();

    } catch (error) {
      console.error('Reactivation error:', error);
      toast.error(`Failed to reactivate: ${error.message}`);
      setIsActiveToggle(false);
    } finally {
      setIsToggling(false);
    }
  };

  const handleActiveToggle = (newValue) => {
    if (isToggling || isFieldDisabled('is_active')) return;

    if (newValue === false) {
      // Show deactivation dialog
      setDeactivationDialogOpen(true);
    } else {
      // Immediate reactivation
      handleReactivateCell();
    } 
  };

  const prepareUpdateData = () => {
    const cleanData = {};

    changedFields.forEach(field => {
      if (isFieldDisabled(field)) return;

      const value = formData[field];

      if (value === '' || value === null || value === undefined) {
        cleanData[field] = null;
      } else {
        const fl = field.toLowerCase();

        if ((fl.includes('date') && !fl.includes('datecaptured') && !fl.includes('display') && !fl.includes('datetime')) || field === 'date') {
          if (typeof value === 'string') {
            // Extract just YYYY-MM-DD, remove any time component or timezone
            const dateOnly = value.split('T')[0];
            cleanData[field] = dateOnly;
            console.log(`Saving date field ${field}: ${dateOnly}`);

            try {
              const dateObj = new Date(dateOnly);
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayName = days[dateObj.getDay()];
              cleanData['Day'] = dayName;
              cleanData['day'] = dayName;
              console.log(`Auto-updating Day to ${dayName} based on new date ${dateOnly}`);
            } catch (e) {
              console.error("Failed to auto-update day:", e);
            }
          } else {
            cleanData[field] = value;
          }
        }
        else if ((fl.includes('time') && !fl.includes('datetime')) || field === 'Time') {
          if (typeof value === 'string') {
            const match = value.match(/(\d{1,2}):(\d{2})/);
            if (match) {
              const hours = match[1].padStart(2, '0');
              const minutes = match[2];
              cleanData[field] = `${hours}:${minutes}`;
            } else {
              cleanData[field] = value;
            }
          } else {
            cleanData[field] = value;
          }
        } else {
          cleanData[field] = value;
        }
      }

      if (field === 'status' || field === 'Status') {
        cleanData['status'] = value;
        cleanData['Status'] = value;
      }

      if (field === 'eventName' || field === 'Event Name') {
        cleanData['eventName'] = value;
        cleanData['Event Name'] = value;
      }

      if (field === 'Day' || field === 'day') {
        cleanData['Day'] = value;
        cleanData['day'] = value;
      }

      if (field === 'Address' || field === 'location') {
        cleanData['Address'] = value;
        cleanData['location'] = value;
      }

      if (field === 'Email' || field === 'eventLeaderEmail') {
        cleanData['Email'] = value;
        cleanData['eventLeaderEmail'] = value;
      }

      if (field === 'Leader' || field === 'eventLeader' || field === 'eventLeaderName') {
        cleanData['Leader'] = value;
        cleanData['eventLeader'] = value;
        cleanData['eventLeaderName'] = value;
      }

      if (field === 'time' || field === 'Time') {
        const timeValue = typeof value === 'string' && value.match(/(\d{1,2}):(\d{2})/)
          ? value.match(/(\d{1,2}):(\d{2})/).slice(1).map((v, i) => i === 0 ? v.padStart(2, '0') : v).join(':')
          : value;
        cleanData['time'] = timeValue;
        cleanData['Time'] = timeValue;
      }
    });

    return { ...cleanData, "is_permanent_deact": isPermanent };
  };

const handleSubmit = async (e, isDeactivating = false) => {
  try {
    setLoading(true);

    if (changedFields.length === 0 && !isDeactivating) {
      toast.info("No changes made");
      onClose();
      return;
    }

    const unauthorizedFields = changedFields.filter(field => isFieldDisabled(field));
    if (unauthorizedFields.length > 0) {
      toast.error(`You don't have permission to modify: ${unauthorizedFields.join(', ')}`);
      setLoading(false);
      return;
    }

    const updateData = prepareUpdateData();

    if ('Time' in updateData || 'time' in updateData) {
      const timeValue = updateData.Time || updateData.time;
      if (timeValue) {
        console.log(`DEBUG - Storing time as-is: ${timeValue}`);
      }
    }

    if (Object.keys(updateData).length === 0) {
      toast.info("No valid changes to save");
      setLoading(false);
      return;
    }

    let endpoint, method, body;

    const originalEventName = event['Event Name'] || event.eventName;
    const originalDay = event.Day || event.day;

    const newEventName = formData['Event Name'] || formData.eventName;
    const newDay = formData.Day || formData.day;

    if (editScope === 'single') {
      let identifier = event.UUID || event._id || event.id || event.original_event_id;
      if (identifier?.includes?.('_')) {
        identifier = identifier.split('_')[0];
      }

      if (!identifier) {
        toast.error("Cannot update: Event ID not found");
        setLoading(false);
        return;
      }

      console.log("Using identifier for update:", identifier);

      if (isCellEvent) {
        endpoint = `/events/cells/${identifier}`;
      } else {
        endpoint = `/events/${identifier}`;
      }

      method = 'PUT';
      body = JSON.stringify(updateData);

      if (newEventName && newEventName !== originalEventName) {
        const confirmMsg = `Update event name from "${originalEventName}" to "${newEventName}"?\n\nThis will update ONLY this specific event.\n\nContinue?`;
        if (!window.confirm(confirmMsg)) {
          setLoading(false);
          return;
        }
      }
    }
    else if (editScope === 'person') {
      if (!originalPersonIdentifier) {
        toast.error("Cannot update: Person identifier not found");
        setLoading(false);
        return;
      }

      if (!originalEventName) {
        toast.error("Cannot update: Original event name is required for 'Update All'");
        setLoading(false);
        return;
      }

      if (!originalDay) {
        toast.error("Cannot update: Original day is required for 'Update All'");
        setLoading(false);
        return;
      }

      endpoint = `/events/person/${encodeURIComponent(originalPersonIdentifier)}/event/${encodeURIComponent(originalEventName)}/day/${encodeURIComponent(originalDay)}/event_id/${event?.event_id}/session_id/${event?.session_id}`;
      method = 'PUT';
      body = JSON.stringify(updateData);

      let confirmMsg = `This will update ONLY:\n\n`;
      confirmMsg += `• Person: ${originalPersonIdentifier}\n`;
      confirmMsg += `• Event name: "${originalEventName}"\n`;
      confirmMsg += `• Day: ${originalDay}\n\n`;

      const changes = [];
      if (newEventName && newEventName !== originalEventName) {
        changes.push(`Event name: "${originalEventName}" → "${newEventName}"`);
      }
      if (newDay && newDay !== originalDay) {
        changes.push(`Day: ${originalDay} → ${newDay}`);
      }

      const otherFields = changedFields.filter(f =>
        !['Event Name', 'eventName', 'Day', 'day'].includes(f)
      );
      if (otherFields.length > 0) {
        changes.push(`Other fields: ${otherFields.join(', ')}`);
      }

      if (changes.length > 0) {
        confirmMsg += `Changes:\n${changes.join('\n')}\n\n`;
      }

      confirmMsg += `Continue?`;

      if (!window.confirm(confirmMsg)) {
        setLoading(false);
        return;
      }
    }

    const userToken = localStorage.getItem("access_token") || token;
    if (!userToken) {
      toast.error("No authentication token found. Please log in again.");
      setLoading(false);
      return;
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { detail: errorText }; }

      if (response.status === 404) {
        toast.error(`Not found: ${errorData.detail || 'The event or events could not be found'}`);
      } else if (response.status === 401) {
        toast.error("Your session has expired. Please log in again.");
        localStorage.removeItem("access_token");
      } else if (response.status === 409) {
        toast.error(`Conflict: ${errorData.detail || 'Duplicate event detected'}`);
      } else {
        toast.error(`Update failed: ${errorData.detail || errorData.message || `Error ${response.status}`}`);
      }

      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    if (editScope === 'person') {
      if (result.success) {
        if (result.modified_count === 0) {
          toast.info(`No changes were made to ${originalEventName} events`);
        } else {
          toast.success(`Updated ${result.modified_count || 0} ${originalDay} events named "${originalEventName}"`);
        }
      } else {
        toast.warning(result.message || "Update completed with warnings");
      }
    } else {
      if (result.sync_info) {
        if (result.sync_info.status_updated) {
          toast.success(`Status updated to ${result.sync_info.new_status}`);
        } else {
          toast.success('Event updated successfully');
        }
      } else if (result.success) {
        if (result.modified) {
          toast.success('Event updated successfully');
        } else {
          toast.info('No changes were made to the event');
        }
      } else {
        toast.error(result.message || 'Update failed');
      }
    }

    if (refreshEvents) {
      await refreshEvents();
    }

    // FIXED: Pass full formData back so optimistic update has all fields
    onClose(true, {
      ...formData,
      _id: event._id,
      UUID: event.UUID,
      Day: formData.Day || formData.day,
      day: formData.Day || formData.day,
      date: formData.date,
      recurring_day: formData.recurring_day,
      eventName: formData.eventName || formData['Event Name'],
      'Event Name': formData.eventName || formData['Event Name'],
      status: formData.status || formData.Status,
      Status: formData.status || formData.Status,
      eventLeader: formData.eventLeader || formData.Leader,
      eventLeaderName: formData.eventLeader || formData.Leader,
      Leader: formData.eventLeader || formData.Leader,
      eventLeaderEmail: formData.eventLeaderEmail || formData.Email,
      Email: formData.eventLeaderEmail || formData.Email,
      location: formData.location || formData.Address,
      Address: formData.location || formData.Address,
    });

  } catch (error) {
    console.error("Error saving:", error);
    if (!error.message.includes('401')) {
      toast.error(`Failed to save: ${error.message || error}`);
    }
  } finally {
    setLoading(false);
  }
};

  const renderField = (field) => {
    const value = formData[field] || '';
    const isChanged = changedFields.includes(field);
    const isDisabled = isFieldDisabled(field);
    const disabledReason = getDisabledReason(field);
    const displayName = field.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase()).trim();
    const fieldType = typeof value === 'object' && value !== null ? 'object' : typeof value;
    const fl = field.toLowerCase();

    if (!isCellEvent) {
      if (fl === 'leader1' || fl === 'leader12' || fl.includes('leader at 12') ||
        fl.includes('haspersonsteps') || fl.includes('has personal steps') || fl === 'haspersonalsteps') {
        return null;
      }
    }

    const labelContent = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {displayName}
        {isChanged && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />}
        {isDisabled && <Lock fontSize="small" color="disabled" />}
      </Box>
    );

    if (field === 'is_active' || field === 'Display date' || field === 'Display_date' ||
      field === 'display_date' || field === 'did_not_meet' || field === 'Did_not_meet' ||
      field === 'S' || field === 's' || field === 'Data-recurring' || field === 'data-recurring' ||
      field === 'is_recurring' || field === 'isRecurring') {
      return null;
    }

    if (
      (fl.includes('date') && !fl.includes('datecaptured') && !fl.includes('display')) ||
      field === 'date'
    ) {
      const dateValue = value ? value.split('T')[0] : '';

      const content = (
        <TextField
          fullWidth
          margin="normal"
          label={labelContent}
          type="date"
          value={dateValue}
          onChange={(e) => {
            handleChange(field, e.target.value);
          }}
          InputLabelProps={{ shrink: true }}
          error={isChanged}
          helperText={isChanged ? "Changed" : ""}
          disabled={isDisabled}
        />
      );

      return isDisabled && disabledReason ? (
        <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
      ) : <Box key={field}>{content}</Box>;
    }

    if (fl.includes('time') && !fl.includes('datetime')) {
      if (field === 'time' && availableFields.includes('Time')) {
        return null;
      }

      const rawTimeValue = value || '';

      let displayTime = rawTimeValue;

      if (typeof rawTimeValue === 'string') {
        if (rawTimeValue.includes('T')) {
          try {
            const date = new Date(rawTimeValue);
            displayTime = date.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
          } catch (e) {
            console.error("Failed to parse time:", e);
          }
        }
      }

      const content = (
        <TextField
          fullWidth
          margin="normal"
          label={labelContent}
          type="time"
          value={displayTime}
          onChange={(e) => {
            console.log(`Time changed for ${field}:`, e.target.value);
            handleChange(field, e.target.value);
          }}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            inputProps: {
              step: 300,
            }
          }}
          error={isChanged}
          helperText={isChanged ? "Changed" : ""}
          disabled={isDisabled}
        />
      );

      return isDisabled && disabledReason ? (
        <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
      ) : <Box key={field}>{content}</Box>;
    }

    if (fl.includes('email')) {
      const content = (
        <TextField fullWidth margin="normal" label={labelContent} value={value} type="email"
          onChange={(e) => handleChange(field, e.target.value)} error={isChanged}
          helperText={isChanged ? "Changed" : ""} disabled={isDisabled} />
      );
      return isDisabled && disabledReason ? (
        <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
      ) : <Box key={field}>{content}</Box>;
    }

    if (fieldType === 'boolean') {
      const content = (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 1 }}>
          <FormControlLabel
            control={<Switch checked={!!value} onChange={(e) => handleChange(field, e.target.checked)}
              color={isChanged ? "warning" : "primary"} disabled={isDisabled} />}
            label={labelContent} />
        </Box>
      );
      return isDisabled && disabledReason ? (
        <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
      ) : <Box key={field}>{content}</Box>;
    }

    if (Array.isArray(value)) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const content = (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {displayName}
            {isChanged && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />}
            {isDisabled && <Lock fontSize="small" color="disabled" />}
          </Typography>
          <FormGroup row>
            {days.map(day => (
              <FormControlLabel key={day}
                control={<Checkbox checked={value.includes(day)}
                  onChange={(e) => {
                    if (isDisabled) return;
                    const newValue = e.target.checked ? [...value, day] : value.filter(d => d !== day);
                    handleChange(field, newValue);
                  }} size="small" disabled={isDisabled} />}
                label={day.substring(0, 3)} />
            ))}
          </FormGroup>
          {!isDisabled && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button size="small" onClick={() => handleChange(field, [])}>Clear All</Button>
            </Box>
          )}
        </Box>
      );
      return isDisabled && disabledReason ? (
        <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
      ) : <Box key={field}>{content}</Box>;
    }

    if (fl.includes('day') && !fl.includes('recurring') && typeof value === 'string') {
      const content = (
        <FormControl fullWidth margin="normal" error={isChanged} disabled={isDisabled}>
          <InputLabel>{displayName}</InputLabel>
          <Select value={value || ''} label={displayName}
            onChange={(e) => handleChange(field, e.target.value)} disabled={isDisabled}>
            <MenuItem value="">None</MenuItem>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
              .map(day => <MenuItem key={day} value={day}>{day}</MenuItem>)}
          </Select>
          {isChanged && <Typography variant="caption" color="warning.main">Changed</Typography>}
        </FormControl>
      );
      return isDisabled && disabledReason ? (
        <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
      ) : <Box key={field}>{content}</Box>;
    }

    if (fl === 'status') {
      const statusOptions = ['complete', 'incomplete', 'did_not_meet'];
      const content = (
        <FormControl fullWidth margin="normal" error={isChanged} disabled={isDisabled}>
          <InputLabel>Status</InputLabel>
          <Select value={value || ''} label="Status"
            onChange={(e) => handleChange(field, e.target.value)} disabled={isDisabled}>
            <MenuItem value="">None</MenuItem>
            {statusOptions.map(status => (
              <MenuItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </MenuItem>
            ))}
          </Select>
          {isChanged && <Typography variant="caption" color="warning.main">Changed</Typography>}
        </FormControl>
      );
      return isDisabled && disabledReason ? (
        <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
      ) : <Box key={field}>{content}</Box>;
    }

    if (fl.includes('description') || (typeof value === 'string' && value.length > 50)) {
      const content = (
        <TextField fullWidth margin="normal" label={labelContent} value={value}
          onChange={(e) => handleChange(field, e.target.value)} multiline rows={3}
          error={isChanged} helperText={isChanged ? "Changed" : ""} disabled={isDisabled} />
      );
      return isDisabled && disabledReason ? (
        <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
      ) : <Box key={field}>{content}</Box>;
    }

    const content = (
      <TextField fullWidth margin="normal" label={labelContent} value={value}
        onChange={(e) => handleChange(field, e.target.value)} error={isChanged}
        helperText={isChanged ? "Changed" : ""} disabled={isDisabled} />
    );
    return isDisabled && disabledReason ? (
      <Tooltip key={field} title={disabledReason} arrow><Box>{content}</Box></Tooltip>
    ) : <Box key={field}>{content}</Box>;
  };

  const renderActiveStatusSection = () => {
    const isCurrentlyActive = formData.is_active !== false;
    const deactivationEnd = formData.deactivation_end || formData.deactivationEnd;
    const currentDeactivationReason = formData.deactivation_reason || formData.deactivationReason;

    return (
      <Box sx={{
        mb: 3, p: 2, border: '1px solid',
        borderColor: isCurrentlyActive ? 'success.main' : 'warning.main', borderRadius: 2,
        bgcolor: isCurrentlyActive ? 'success.50' : 'warning.50'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            color: isCurrentlyActive ? 'success.dark' : 'warning.dark'
          }}>
            {isCurrentlyActive ? (<><PlayArrow color="success" />{isCellEvent ? 'Cell' : 'Event'} is Active</>) :
              (<><Pause color="warning" />{isCellEvent ? 'Cell' : 'Event'} is Deactivated</>)}
          </Typography>
          <FormControlLabel control={
            <Switch checked={isActiveToggle}
              onChange={(e) => {
                handleActiveToggle(e.target.checked);
              }}
              disabled={isToggling || isFieldDisabled('is_active')}
              color={isCurrentlyActive ? "success" : "warning"} />
          }
            label={<Typography variant="body2">{isActiveToggle ? 'Active' : 'Deactivated'}{isToggling && '...'}</Typography>}
            sx={{ m: 0 }} />
        </Box>
        {!isCurrentlyActive && deactivationEnd && (
          <Alert
            severity="warning"
            icon={false}
            sx={{ mt: 1, mb: 1 }}
          >
            <Typography variant="body2">
              <strong>Deactivated until:</strong>{' '}
              {new Date(deactivationEnd) < new Date() ? "Never" : new Date(deactivationEnd).toLocaleDateString('en-ZA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>

            {currentDeactivationReason && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>Reason:</strong> {currentDeactivationReason}
              </Typography>
            )}
          </Alert>
        )}


        {editScope === 'person' && isCellEvent && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {contextFilter === 'day' && originalContext.day &&
              `${isActiveToggle ? 'Deactivating' : 'Activating'} only ${originalContext.day} cells`}
            {contextFilter === 'eventName' && originalContext.eventName &&
              `${isActiveToggle ? 'Deactivating' : 'Activating'} only "${originalContext.eventName}" cells`}
            {contextFilter === 'all' &&
              `${isActiveToggle ? 'Deactivating' : 'Activating'} ALL cells for this person`}
          </Typography>
        )}
      </Box>
    );
  };

  if (!event) return null;

  const personFields = availableFields.filter(f => {
    const basePersonFields = ['Leader', 'eventLeader', 'eventLeaderName', 'Email', 'eventLeaderEmail', 'email'];

    if (!isCellEvent) {
      const fl = f.toLowerCase();
      if (fl === 'leader1' || fl === 'leader12' || fl.includes('leader at 12')) {
        return false;
      }
    }

    // For cell events, include all leader fields
    if (isCellEvent) {
      return [...basePersonFields, 'leader1', 'leader12', 'Leader at 12'].includes(f);
    }

    return basePersonFields.includes(f);
  });

  const eventFields = availableFields.filter(f => {
    const fl = f.toLowerCase();

    // ADDED: For non-cell events, exclude "has Personal steps"
    if (!isCellEvent && (fl.includes('haspersonsteps') || fl.includes('has personal steps') || fl === 'haspersonalsteps')) {
      return false;
    }

    const allowed = ['eventname', 'event name', 'event type', 'eventtypename', 'description',
      'status', 'isticketed', 'isglobal'];

    // For cell events, include haspersonsteps
    if (isCellEvent) {
      allowed.push('haspersonsteps', 'has personal steps', 'haspersonalsteps');
    }

    return allowed.includes(fl);
  });

  const locationFields = availableFields.filter(f => ['Address', 'location', 'address'].includes(f));
  const timeFields = availableFields.filter(f => ['date', 'Date Of Event', 'time', 'Time', 'Day', 'recurring_day'].includes(f));
  const otherFields = availableFields.filter(f => {
    const skipFields = [
      'is_active', 'Display date', 'Display_date', 'display_date',
      'did_not_meet', 'Did_not_meet', 'S', 's', 'Data-recurring',
      'data-recurring', 'is_recurring', 'isRecurring',
      'closed_by', 'closed_at', 'new_people', 'consolidations', "Status", "new_people_count", "consolidation_count"
    ];

    if (!isCellEvent) {
      const fl = f.toLowerCase();
      if (fl === 'leader1' || fl === 'leader12' || fl.includes('leader at 12') ||
        fl.includes('haspersonsteps') || fl.includes('has personal steps') || fl === 'haspersonalsteps') {
        skipFields.push(f);
      }
    }

    return ![...personFields, ...eventFields, ...locationFields, ...timeFields, ...skipFields].includes(f);
  });

  const eventName = formData.eventName || formData['Event Name'] || 'Unnamed Event';

  return (
    <>
      <Dialog open={isOpen} onClose={() => onClose(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">Edit: {eventName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Person: <strong>{originalPersonIdentifier || 'Unknown'}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isCellEvent ? (
                <Chip label="CELL" color="primary" size="small" sx={{ fontSize: '0.7rem' }} />
              ) : (
                <Chip label="SINGLE" color="success" size="small" sx={{ fontSize: '0.7rem' }} />
              )}
              <Button size="small" onClick={() => setAdvancedMode(!advancedMode)}
                startIcon={advancedMode ? <ExpandLess /> : <ExpandMore />}>
                {advancedMode ? 'Simple' : 'Advanced'}
              </Button>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>

            {renderActiveStatusSection()}

            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Update Method:
              </Typography>

              <FormControl fullWidth>
                {isCellEvent ? (
                  <Box sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'primary.main',
                    borderRadius: 1,
                    bgcolor: 'primary.50'
                  }}>
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                      Update All Recurring Events
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Required for Cell consistency. All occurrences will be updated.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'success.main',
                    borderRadius: 1,
                    bgcolor: 'success.50'
                  }}>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      Single Event Only
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Update only this specific event.
                    </Typography>
                  </Box>
                )}
              </FormControl>

              {isCellEvent && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Changes will apply to all occurrences.
                  </Typography>
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {changedFields.length > 0 && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Fields to update ({changedFields.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {changedFields.map(field => {
                    const displayField = field
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/_/g, ' ')
                      .replace(/^./, str => str.toUpperCase());

                    const originalValue = event[field];
                    const newValue = formData[field];
                    const isDisabled = isFieldDisabled(field);

                    return (
                      <Tooltip
                        key={field}
                        title={
                          <Box>
                            <Typography variant="caption">
                              <strong>From:</strong> {originalValue !== undefined && originalValue !== null ? JSON.stringify(originalValue) : '(empty)'}
                            </Typography>
                            <br />
                            <Typography variant="caption">
                              <strong>To:</strong> {newValue !== '' ? JSON.stringify(newValue) : '(remove field)'}
                            </Typography>
                            {isDisabled && (
                              <>
                                <br />
                                <Typography variant="caption" color="error">
                                  {getDisabledReason(field)}
                                </Typography>
                              </>
                            )}
                          </Box>
                        }
                      >
                        <Chip
                          label={displayField}
                          size="small"
                          color={isDisabled ? "error" : "primary"}
                          variant="outlined"
                          onDelete={() => {
                            handleChange(field, event[field] !== undefined ? event[field] : '');
                          }}
                          icon={isDisabled ? <Lock fontSize="small" /> : undefined}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            )}

            {advancedMode ? (
              <Box>
                {personFields.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person /> Person Information
                    </Typography>
                    <Grid container spacing={2}>
                      {personFields.map(field => (
                        <Grid item xs={12} md={6} key={field}>
                          {renderField(field)}
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {eventFields.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Event /> Event Information
                    </Typography>
                    <Grid container spacing={2}>
                      {eventFields.map(field => (
                        <Grid item xs={12} md={6} key={field}>
                          {renderField(field)}
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Time & Location
                  </Typography>
                  <Grid container spacing={2}>
                    {/* Location field */}
                    {locationFields.map(field => (
                      <Grid item xs={12} md={4} key={field}>
                        {renderField(field)}
                      </Grid>
                    ))}

                    {/* Date field */}
                    {timeFields.filter(f => {
                      const fl = f.toLowerCase();
                      return (fl.includes('date') && !fl.includes('datecaptured') && !fl.includes('display')) || f === 'date' || f === 'Date Of Event';
                    }).map(field => (
                      <Grid item xs={12} md={4} key={field}>
                        {renderField(field)}
                      </Grid>
                    ))}

                    {/* Time field */}
                    {timeFields.filter(f => {
                      const fl = f.toLowerCase();
                      return (fl.includes('time') && !fl.includes('datetime')) && (f === 'Time' || f === 'time');
                    }).map(field => (
                      <Grid item xs={12} md={4} key={field}>
                        {renderField(field)}
                      </Grid>
                    ))}

                    {/* Other time-related fields (Day, recurring_day) */}
                    {timeFields.filter(f => {
                      const fl = f.toLowerCase();
                      const isDate = (fl.includes('date') && !fl.includes('datecaptured') && !fl.includes('display')) || f === 'date' || f === 'Date Of Event';
                      const isTime = (fl.includes('time') && !fl.includes('datetime')) && (f === 'Time' || f === 'time');
                      return !isDate && !isTime;
                    }).map(field => (
                      <Grid item xs={12} md={6} key={field}>
                        {renderField(field)}
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* {otherFields.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      fullWidth
                      onClick={() => setShowAllFields(!showAllFields)}
                      startIcon={showAllFields ? <ExpandLess /> : <ExpandMore />}
                      size="small"
                    >
                      {showAllFields ? 'Hide' : 'Show'} Other Fields ({otherFields.length})
                    </Button>

                    <Collapse in={showAllFields}>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        {otherFields.map(field => (
                          <Grid item xs={12} md={6} key={field}>
                            {renderField(field)}
                          </Grid>
                        ))}
                      </Grid>
                    </Collapse>
                  </Box>
                )} */}
                {otherFields.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      fullWidth
                      onClick={() => setShowAllFields(!showAllFields)}
                      startIcon={showAllFields ? <ExpandLess /> : <ExpandMore />}
                      size="small"
                    >
                      {showAllFields ? 'Hide' : 'Show'} Other Fields ({otherFields.length})
                    </Button>

                    <Collapse in={showAllFields}>
                      <Box sx={{ mt: 1 }}>

                        {/* Row 1: Event Type | Day | is overdue */}
                        <Grid container spacing={2}>
                          {[
                            otherFields.find(f => f === 'eventType' || f === 'Event Type'),
                            otherFields.find(f => f === 'day' || f === 'Day'),
                            otherFields.find(f => f === '_is_overdue' || f === 'is_overdue' || f === 'isOverdue'),
                          ]
                            .filter(Boolean)
                            .map(field => (
                              <Grid item xs={12} md={4} key={field}>
                                {renderField(field)}
                              </Grid>
                            ))}
                        </Grid>

                        <Grid container spacing={2} sx={{ mt: 0 }}>
                          {(() => {
                            const recurringField = otherFields.find(f => f === 'recurring_days' || f === 'recurring_day');
                            const origEventId = otherFields.find(f => f === 'original_event_id');
                            const compositeId = otherFields.find(f => f === 'original_composite_id');
                            return (
                              <>
                                {recurringField && (
                                  <Grid item xs={12} md={4} key={recurringField}>
                                    {renderField(recurringField)}
                                  </Grid>
                                )}
                                {origEventId && (
                                  <Grid item xs={12} md={4} key={origEventId}>
                                    {renderField(origEventId)}
                                  </Grid>
                                )}
                                {compositeId && (
                                  <Grid item xs={12} md={4} key={compositeId}>
                                    {renderField(compositeId)}
                                  </Grid>
                                )}
                              </>
                            );
                          })()}
                        </Grid>
                        {(() => {
                          const handled = new Set([
                            'eventType', 'Event Type',
                            'day', 'Day',
                            '_is_overdue', 'is_overdue', 'isOverdue',
                            'recurring_days', 'recurring_day',
                            'original_event_id',
                            'original_composite_id',
                          ]);
                          const remaining = otherFields.filter(f => !handled.has(f));
                          return remaining.length > 0 ? (
                            <Grid container spacing={2} sx={{ mt: 0 }}>
                              {remaining.map(field => (
                                <Grid item xs={12} md={6} key={field}>
                                  {renderField(field)}
                                </Grid>
                              ))}
                            </Grid>
                          ) : null;
                        })()}
                      </Box>
                    </Collapse>
                  </Box>
                )}
              </Box>
            ) : (
              <Grid container spacing={2}>            
                {/* Event Name, Leader, Email, Status, Day, Description fields */}
                {['eventName', 'Event Name', 'eventLeader', 'Leader', 'eventLeaderEmail', 'Email',
                  'status', 'recurring_day', 'Day', 'description']
                  .filter(field => availableFields.includes(field))
                  .map(field => (
                    <Grid item xs={12} md={6} key={field}>
                      {renderField(field)}
                    </Grid>
                  ))}

                {/* Date, Time, and Location side by side - each taking 4 columns (1/3 of row) */}
                {(availableFields.includes('date') || availableFields.includes('Date Of Event')) && (
                  <Grid item xs={12} md={4}>
                    {renderField(availableFields.includes('date') ? 'date' : 'Date Of Event')}
                  </Grid>
                )}
                {(availableFields.includes('time') || availableFields.includes('Time')) && (
                  <Grid item xs={12} md={4}>
                    {renderField(availableFields.includes('Time') ? 'Time' : 'time')}
                  </Grid>
                )}
                {(availableFields.includes('location') || availableFields.includes('Address')) && (
                  <Grid item xs={12} md={4}>
                    {renderField(availableFields.includes('Address') ? 'Address' : 'location')}
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Box>
              {changedFields.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {changedFields.length} field(s) changed
                  {changedFields.some(f => isFieldDisabled(f)) && (
                    <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                      (Some fields require higher permissions)
                    </Typography>
                  )}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                onClick={() => onClose(false)}
                disabled={loading}
                color="inherit"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={loading || changedFields.length === 0 || changedFields.some(f => isFieldDisabled(f))}
                color={isCellEvent ? 'primary' : 'success'}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Saving...' : (
                  isCellEvent ? 'Update All Cell Events' : 'Update This Event'
                )}
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deactivationDialogOpen}
        onClose={() => {
          setDeactivationDialogOpen(false);
          setIsActiveToggle(true);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Deactivate Event
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {editScope === 'person' ? (
              contextFilter === 'day' && originalContext.day ?
                `You are about to deactivate ${originalContext.day} cells for "${originalPersonIdentifier}".` :
                contextFilter === 'eventName' && originalContext.eventName ?
                  `You are about to deactivate "${originalContext.eventName}" cells for "${originalPersonIdentifier}".` :
                  `You are about to deactivate ALL cells for "${originalPersonIdentifier}".`
            ) : (
              `You are about to deactivate "${eventName}".`
            )}
          </Typography>

          <FormControl fullWidth margin="normal">
            <InputLabel>Deactivation Period</InputLabel>
            <Select
              value={deactivationWeeks}
              onChange={(e) => {
                setDeactivationWeeks(e.target.value);
                if (e.target.value === -1) {
                  setIsPermanent(true);
                } else {
                  setIsPermanent(false);
                }
              }}
              label="Deactivation Period"
            >
              <MenuItem value={1}>1 Week</MenuItem>
              <MenuItem value={2}>2 Weeks</MenuItem>
              <MenuItem value={3}>3 Weeks</MenuItem>
              <MenuItem value={4}>4 Weeks</MenuItem>
              <MenuItem value={8}>2 Months</MenuItem>
              <MenuItem value={12}>3 Months</MenuItem>
              <MenuItem value={-1}>Never</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            margin="normal"
            label="Reason (Optional)"
            value={deactivationReason}
            onChange={(e) => setDeactivationReason(e.target.value)}
            placeholder=""
            multiline
            rows={2}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              The cell will automatically reactivate after the deactivation period ends.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeactivationDialogOpen(false);
              setIsActiveToggle(true);
            }}
            disabled={isToggling}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeactivateCell}
            variant="contained"
            color="warning"
            startIcon={isToggling ? <CircularProgress size={20} /> : <Pause />}
            disabled={isToggling}
          >
            {isToggling ? 'Deactivating...' : 'Confirm Deactivation'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditEventModal;