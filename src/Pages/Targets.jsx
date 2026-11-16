import { useContext, useState } from "react";
import {
  Alert,
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { AuthContext } from "../contexts/AuthContext";
import { normalizeRole } from "../utils/roleNormalizer";
import CustomTargetsTab from "../features/targets/CustomTargetsTab";
import LegacyTargetsTab from "../features/targets/LegacyTargetsTab";
import WeeklyReviewTab from "../features/targets/WeeklyReviewTab";
import { isoWeekId } from "../features/targets/dateUtils";

const FULL_PAGE_ROLES = ["admin", "leader", "leaderat12", "registrant"];
const TAB_LABELS = ["12 Tasks", "Service Targets", "Custom Targets", "Weekly Review"];

function isSupremeAdmin(user) {
  return String(user?.is_supreme_admin ?? "").trim().toLowerCase() === "true";
}

export default function Targets() {
  const { user } = useContext(AuthContext);
  const role = normalizeRole(user?.role);
  const supremeAdmin = isSupremeAdmin(user);
  const isPlainUser = role === "user" && !supremeAdmin;
  const hasFullAccess = supremeAdmin || FULL_PAGE_ROLES.includes(role);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(isoWeekId());
  const [organization, setOrganization] = useState(
    user?.Organization || user?.organization || "Active Church",
  );

  if (!hasFullAccess && !isPlainUser) {
    return (
      <Box sx={{ maxWidth: 1100, mx: "auto", p: { xs: 2, sm: 3 } }}>
        <Alert severity="error">Your account does not have access to Targets.</Alert>
      </Box>
    );
  }

  const visibleTabs = isPlainUser ? ["Weekly Review"] : TAB_LABELS;
  const tabIndex = isPlainUser ? 0 : activeTab;

  return (
    <Box sx={{
      width: "100%",
      maxWidth: 1440,
      minWidth: 0,
      mx: "auto",
      p: { xs: 1.5, sm: 2.5, md: 4 },
      overflowX: "hidden",
      boxSizing: "border-box",
    }}>
      <Typography component="h1" variant="h4" fontWeight={800} sx={{ mb: 2 }}>
        Targets
      </Typography>
      <Paper variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
        <Tabs
          value={tabIndex}
          onChange={(_, value) => !isPlainUser && setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Target management sections"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": { minWidth: { xs: 112, sm: 140 }, textTransform: "none", fontWeight: 700 },
          }}
        >
          {visibleTabs.map((label, index) => <Tab key={label} label={label} value={index} />)}
        </Tabs>
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, minWidth: 0 }}>
          {isPlainUser ? (
            <WeeklyReviewTab readOnly />
          ) : (
            <>
              {activeTab === 0 && (
                <LegacyTargetsTab
                  type="twelve-tasks"
                  selectedWeek={selectedWeek}
                  setSelectedWeek={setSelectedWeek}
                  organization={organization}
                  setOrganization={setOrganization}
                  isSupremeAdmin={supremeAdmin}
                />
              )}
              {activeTab === 1 && (
                <LegacyTargetsTab
                  type="service"
                  selectedWeek={selectedWeek}
                  setSelectedWeek={setSelectedWeek}
                  organization={organization}
                  setOrganization={setOrganization}
                  isSupremeAdmin={supremeAdmin}
                />
              )}
              {activeTab === 2 && <CustomTargetsTab />}
              {activeTab === 3 && <WeeklyReviewTab />}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
