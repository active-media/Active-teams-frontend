// DeleteConfirmationModal.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box
} from "@mui/material";

const DeleteConfirmationModal = ({ 
  open, 
  onClose, 
  onConfirm, 
  personName = '',
  isLoading = false
}) => {
  return (
    <Dialog
      open={open}
      onClose={!isLoading ? onClose : undefined}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete <strong>{personName}</strong>? 
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose}
          color="primary"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationModal;