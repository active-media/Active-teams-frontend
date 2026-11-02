// DeleteConfirmationModal.jsx
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box,
  useTheme,
} from "@mui/material";
import { getTokens, DISPLAY, BODY, outlinedBtnSx, dangerBtnSx } from "../theme/checkinTokens";

const DeleteConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  personName = "",
  isLoading = false,
}) => {
  const theme = useTheme();
  const tokens = getTokens(theme.palette.mode === "dark");

  return (
    <Dialog
      open={open}
      onClose={!isLoading ? onClose : undefined}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "18px",
          bgcolor: tokens.cardBg,
          border: `1px solid ${tokens.line}`,
          backgroundImage: "none",
          m: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          p: "16px 20px",
          borderBottom: `1px solid ${tokens.line}`,
        }}
      >
        <Typography sx={{ fontFamily: DISPLAY, fontWeight: 800, color: tokens.ink, fontSize: "1.25rem" }}>
          Delete person
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: "16px 20px 12px", overflowY: "auto" }}>
        <Typography sx={{ fontFamily: BODY, fontSize: "0.95rem", color: tokens.ink, lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>{personName}</strong>? This can't be undone.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: "12px 20px", borderTop: `1px solid ${tokens.line}`, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          sx={{ ...outlinedBtnSx(tokens), minWidth: 96 }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          sx={{
            ...dangerBtnSx(tokens),
            minWidth: 120,
            ...(isLoading ? { opacity: 0.85 } : {}),
          }}
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {isLoading ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteConfirmationModal;