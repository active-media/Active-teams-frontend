import { Alert, Box, Button, Card, Skeleton, Stack, Typography } from "@mui/material";

export function LoadingState() {
  return <Stack spacing={2} aria-label="Loading report"><Skeleton variant="rounded" height={112} /><Skeleton variant="rounded" height={280} /></Stack>;
}

export function EmptyState({ title = "No report data", message = "There are no rows for this selection." }) {
  return <Card variant="outlined" sx={{ p: 3, textAlign: "center" }}><Typography fontWeight={700}>{title}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>{message}</Typography></Card>;
}

export function AccessDeniedState({ message }) {
  return <Alert severity="error" role="alert">{message || "Your account does not have access to reporting for this organization."}</Alert>;
}

export function ComingSoonState({ title = "Coming soon", message }) {
  return <Card variant="outlined" sx={{ p: 3, borderStyle: "dashed" }}><Typography variant="h6" fontWeight={700}>{title}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{message || "This report is not implemented by the reporting service yet."}</Typography></Card>;
}

export function ReportErrorState({ error, onRetry }) {
  if (error?.status === 403) return <AccessDeniedState message={error.message} />;
  if (error?.status === 501 && error?.code === "not_implemented") {
    return <ComingSoonState title="Coming soon" message={error.message} />;
  }
  const expired = error?.code === "AUTH_EXPIRED";
  return (
    <Alert
      severity="error"
      role="alert"
      action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Retry</Button> : null}
    >
      {expired ? "Your session expired. Please sign in again." : error?.message || "Unable to load this report."}
    </Alert>
  );
}

export default function ReportStates({ loading, error, empty, children, onRetry }) {
  if (loading && !children) return <LoadingState />;
  if (error) return <ReportErrorState error={error} onRetry={onRetry} />;
  if (empty) return <EmptyState />;
  return <Box>{children}</Box>;
}