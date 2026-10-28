import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  useTheme,
  IconButton,
  Alert,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CategoryIcon from "@mui/icons-material/Category";

const EventTypesModal = ({
  open,
  onClose,
  onSubmit,
  setSelectedEventTypeObj,
  selectedEventType,
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isTicketed: false,
    isTraining: false,  
    isGlobal: false,
  });

  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);
  const isDarkMode = theme.palette.mode === "dark";
  console.log("Selected Event Type in Modal:", isDarkMode);

  useEffect(() => {
    if (open && selectedEventType) {
      setFormData({
        name: selectedEventType.name || "",
        description: selectedEventType.description || "",
        isTicketed: !!selectedEventType.isTicketed,
        isTraining: !!selectedEventType.isTraining, 
        isGlobal: typeof selectedEventType.isGlobal === "boolean"
          ? selectedEventType.isGlobal
          : false,
      });
    } else if (open && !selectedEventType) {
      resetForm();
    }
  }, [selectedEventType, open]);

  useEffect(() => {
    if (open && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      isTicketed: false,
      isTraining: false,  
      isGlobal: false,
    });
    setErrors({});
  };
  const handleCheckboxChange = (name) => (event) => {
    setFormData((prev) => ({ ...prev, "event_category": name }));
  };
const handleInputChange = (e) => {
  const { name, value } = e.target;
  if (name === "name") {
    // Convert to title case as user types (first letter of each word uppercase)
    const titleCaseValue = value.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
    setFormData((prev) => ({ ...prev, [name]: titleCaseValue }));
  } else {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }
};
const validateForm = () => {
  const newErrors = {};

  if (!formData.name.trim()) {
    newErrors.name = "Event Type Name is required";
  } else if (!/^[A-Z][a-z]*(\s[A-Z][a-z]*)*$/.test(formData.name)) {
    newErrors.name = "Event Type Name must have first letter of each word capitalized";
  }

  if (!formData.description.trim()) {
    newErrors.description = "Event description is required";
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
const handleSubmit = async () => {
  if (!validateForm() || loading) return;

  setLoading(true);
  try {
    // Convert name to title case
    const titleCaseName = formData.name.trim().replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
    
    const eventTypeData = {
      name: titleCaseName,
      eventTypeName: titleCaseName,
      description: formData.description.trim(),
      isTicketed: formData.isTicketed,
      isTraining: formData.isTraining,
      isGlobal: formData.isGlobal,
      event_category: formData.event_category,
    };

    let result;
    if (selectedEventType?._id) {
      result = await onSubmit(eventTypeData, selectedEventType._id);
    } else {
      result = await onSubmit(eventTypeData);
    }

    if (setSelectedEventTypeObj) {
      setSelectedEventTypeObj({
        ...eventTypeData,
        _id: result?._id,
      });
    }

    resetForm();
    onClose();
  } catch (error) {
    setErrors({
      submit: error.response?.data?.detail || "Failed to save event type.",
    });
  } finally {
    setLoading(false);
  }
};

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose?.();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          width: "600px",
          bgcolor: "background.paper",
          borderRadius: 2,
          mx: "auto",
          my: "10vh",
        }}
      >
        <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <CategoryIcon color="primary" />
          <Typography variant="h6" sx={{ flex: 1 }}>
            {selectedEventType ? "Edit Event Type" : "Create Event Type"}
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ p: 3 }}>
          <TextField
            inputRef={nameInputRef}
            label="Event Type Name"
            name="name"
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            error={!!errors.name}
            helperText={errors.name}
          />

          <TextField
            label="Event Description"
            name="description"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            sx={{ mb: 3 }}
            error={!!errors.description}
            helperText={errors.description}
          />

          {/* Visibility Settings */}
          <Box sx={{ mb: 3, p: 2, bgcolor: "rgba(0,0,0,0.02)", borderRadius: 1 }}>

            <Typography fontWeight={600} sx={{ mb: 2 }}>

              isGlobal Event            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Tooltip title="Make this event type available globally across teams.">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isGlobal === true}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isGlobal: true,
                        }))
                      }
                    />
                  }
                  label="True"
                />
              </Tooltip>

              <Tooltip title="Keep this event type limited to this team.">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isGlobal === false}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isGlobal: false,
                        }))
                      }
                    />
                  }
                  label="False"
                />
              </Tooltip>
            </Box>
          </Box>

          {/* Form Type Settings */}
          <Box sx={{ mb: 3, p: 2, bgcolor: "rgba(0,123,255,0.05)", borderRadius: 1,display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Typography fontWeight={600} sx={{ mb: 2, gridColumn: '1 / -1' }}>
              Type Settings:
            </Typography>

            <Tooltip title="Mark this event type for events that require tickets.">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.event_category === "ticketed"   }
                    onChange={handleCheckboxChange("ticketed")}
                  />
                }
                label="Ticketed Event"
                sx={{ mb: 2, display: 'block' }}
              />
            </Tooltip>
            <Tooltip title="Mark this event type for training sessions.">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.event_category === "training"}
                    onChange={handleCheckboxChange("training")}
                  />
                }
                label="Training Event"
                sx={{ display: 'block' }}
              />
            </Tooltip>

            <Tooltip title="Mark this event type for small gatherings.">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.event_category === "small_gatherings"}
                    onChange={handleCheckboxChange("small_gatherings")}
                  />
                }
                label="Small Gathering"
                sx={{ mb: 2, display: 'block' }}
              />
            </Tooltip>

            <Tooltip title="Mark this event type for services.">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.event_category === "service"}
                    onChange={handleCheckboxChange("service")}
                  />
                }
                label="Service"
                sx={{ mb: 2, display: 'block' }}
              />
            </Tooltip>

            {/* ADDED TRAINING CHECKBOX */}

          </Box>

          {errors.submit && (
            <Typography color="error" sx={{ mt: 2 }}>
              {errors.submit}
            </Typography>
          )}

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button onClick={handleClose} sx={{ mr: 2 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default EventTypesModal;