import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useContext,
} from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { AuthContext } from "../contexts/AuthContext";
import { UserContext } from "../contexts/UserContext";
import {
  Box,
  Paper,
  Typography,
  Badge,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  IconButton,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  InputAdornment,
  Button,
  Snackbar,
  Alert,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Pagination,
  CircularProgress,
  LinearProgress,
  Grid,
} from "@mui/material";
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  ViewModule as ViewModuleIcon,
  ViewList as ViewListIcon,
  People as PeopleIcon,
  PersonOutline as PersonOutlineIcon,
  EmojiEvents as WinIcon,
  Handshake as ConsolidateIcon,
  School as DiscipleIcon,
  Send as SendIcon,
} from "@mui/icons-material";
import AddPersonDialog from "../components/AddPersonDialog";
import PeopleListView from "../components/PeopleListView";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal";
import PeopleImportFAB from "../components/PeopleImportFAB";

if (!window.globalPeopleCache) window.globalPeopleCache = null;
if (!window.globalCacheTimestamp) window.globalCacheTimestamp = null;
if (!window.globalPeopleCacheOrg) window.globalPeopleCacheOrg = null;
const CACHE_DURATION = 5 * 60 * 1000;

const safeStr = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    try {
      return String(v);
    } catch {
      return "";
    }
  }
  return "";
};

function getLeadersByLevel(person) {
  if (Array.isArray(person?.leaders) && person.leaders.length > 0) {
    const map = {};
    for (const l of person.leaders) {
      if (l?.level != null && l?.name)
        map[`leader${l.level}`] = safeStr(l.name);
    }
    if (Object.keys(map).length > 0) return map;
  }
  const map = {};
  const l1 = safeStr(person?.["Leader @1"] || person?.leader1 || "");
  const l12 = safeStr(person?.["Leader @12"] || person?.leader12 || "");
  const l144 = safeStr(person?.["Leader @144"] || person?.leader144 || "");
  const l1728 = safeStr(person?.["Leader @1728"] || person?.leader1728 || "");
  if (l1) map.leader1 = l1;
  if (l12) map.leader12 = l12;
  if (l144) map.leader144 = l144;
  if (l1728) map.leader1728 = l1728;
  return map;
}

function getLeadersCombined(person) {
  return Object.values(getLeadersByLevel(person)).join(" ");
}

const stages = [
  { id: "Win", title: "Win" },
  { id: "Consolidate", title: "Consolidate" },
  { id: "Disciple", title: "Disciple" },
  { id: "Send", title: "Send" },
];

function mapRawPerson(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = safeStr(raw.Name || raw.name || "").trim();
  const surname = safeStr(raw.Surname || raw.surname || "").trim();
  const email = safeStr(raw.Email || raw.email || "").trim();
  const phone = safeStr(
    raw.Number || raw.Phone || raw.phone || raw.number || "",
  ).trim();
  const address = safeStr(raw.Address || raw.address || "").trim();
  const stage = safeStr(raw.Stage || raw.stage || "Win").trim();
  const gender = safeStr(raw.Gender || raw.gender || "").trim();
  const dob = safeStr(
    raw.Birthday || raw.birthday || raw.DateOfBirth || raw.dob || "",
  );
  const invitedBy = safeStr(raw.InvitedBy || raw.invitedBy || "").trim();
  const org = safeStr(
    raw.Organization ||
      raw.Organisation ||
      raw.organization ||
      raw.org_id ||
      "",
  ).trim();
  const leaderMap = getLeadersByLevel(raw);
  const leadersCombined = Object.values(leaderMap).join(" ");
  const fullName = `${name} ${surname}`.trim();
  return {
    _id: safeStr(raw._id || raw.id || ""),
    name,
    surname,
    fullName,
    fullNameLower: fullName.toLowerCase(),
    emailLower: email.toLowerCase(),
    phoneLower: phone.toLowerCase(),
    addressLower: address.toLowerCase(),
    gender,
    dob,
    location: address,
    email,
    phone,
    Stage: stage,
    lastUpdated: safeStr(raw.UpdatedAt || raw.updatedAt || ""),
    invitedBy,
    org_id: safeStr(raw.org_id || ""),
    Organization: org,
    ...leaderMap,
    leaders: leaderMap,
    leadersCombinedLower: leadersCombined.toLowerCase(),
    leadersRaw: Array.isArray(raw.leaders) ? raw.leaders : [],
  };
}

// ─── Skeleton card shown while loading ──────────────────────────────────────
const PersonCardSkeleton = () => (
  <Card sx={{ mb: 1, boxShadow: 1 }}>
    <CardContent sx={{ p: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
        <Skeleton variant="circular" width={28} height={28} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={18} />
          <Skeleton variant="text" width="40%" height={14} />
        </Box>
      </Box>
      <Skeleton variant="text" width="80%" height={14} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="55%" height={14} sx={{ mb: 0.5 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
        <Skeleton variant="rounded" width={50} height={20} />
        <Skeleton variant="text" width="35%" height={14} />
      </Box>
    </CardContent>
  </Card>
);

// ─── Skeleton stat card ──────────────────────────────────────────────────────
const StatCardSkeleton = () => (
  <Card
    sx={{
      width: "100%",
      height: 200,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      boxShadow: 2,
    }}
  >
    <CardContent
      sx={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Skeleton variant="circular" width={56} height={56} />
      <Skeleton variant="text" width={48} height={32} />
      <Skeleton variant="text" width={72} height={18} />
    </CardContent>
  </Card>
);

// ─── Full board skeleton (4 columns × N cards) ───────────────────────────────
const BoardSkeleton = ({ cardCount = 4 }) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: isSmall ? "wrap" : "nowrap",
        gap: 3,
        justifyContent: "center",
        py: 1,
      }}
    >
      {stages.map((stage) => (
        <Paper
          key={stage.id}
          sx={{
            flex: isSmall ? "1 1 100%" : "0 0 250px",
            minWidth: 220,
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor:
              theme.palette.mode === "dark"
                ? theme.palette.grey[800]
                : theme.palette.common.white,
          }}
        >
          {/* Column header skeleton */}
          <Box
            sx={{
              p: 1.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor:
                theme.palette.mode === "dark"
                  ? theme.palette.grey[900]
                  : theme.palette.grey[100],
            }}
          >
            <Skeleton variant="text" width={70} height={22} />
            <Skeleton variant="circular" width={22} height={22} />
          </Box>
          {/* Card skeletons */}
          <Box sx={{ p: 1 }}>
            {[...Array(cardCount)].map((_, i) => (
              <PersonCardSkeleton key={i} />
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

// ─── PersonCard ───────────────────────────────────────────────────────────────
const PersonCard = React.memo(({ person, onEdit, onDelete, isDragging }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);
  const handleEdit = () => {
    onEdit(person);
    handleMenuClose();
  };
  const handleDelete = () => {
    onDelete(person._id);
    handleMenuClose();
  };

  const getInitials = useCallback(
    (n) =>
      safeStr(n)
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?",
    [],
  );
  const getAvatarColor = useCallback(
    (n) =>
      ["#f44336", "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3"][
        safeStr(n).length % 6
      ],
    [],
  );
  const formatDate = useCallback((d) => {
    try {
      return d ? new Date(d).toLocaleDateString() : "-";
    } catch {
      return "-";
    }
  }, []);
  const getStageColor = useCallback((s) => {
    switch (s) {
      case "Win":
        return "success.main";
      case "Consolidate":
        return "info.main";
      case "Disciple":
        return "warning.main";
      case "Send":
        return "error.main";
      default:
        return "primary.main";
    }
  }, []);

  const leaderEntries = useMemo(() => {
    if (Array.isArray(person.leadersRaw) && person.leadersRaw.length > 0)
      return person.leadersRaw
        .filter((l) => l?.name)
        .map((l) => [`leader${l.level}`, safeStr(l.name)]);
    return Object.entries(getLeadersByLevel(person)).filter(([, n]) => n);
  }, [person]);

  const displayName =
    `${safeStr(person.name)} ${safeStr(person.surname)}`.trim();

  return (
    <Card
      sx={{
        cursor: "grab",
        "&:hover": { boxShadow: 4, transform: "translateY(-1px)" },
        transition: "all 0.2s ease-in-out",
        boxShadow: isDragging ? 6 : 2,
        backgroundColor: isDragging ? "action.selected" : "background.paper",
        mb: 1,
      }}
    >
      <CardContent sx={{ p: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
          <Avatar
            sx={{
              width: 28,
              height: 28,
              fontSize: 12,
              backgroundColor: getAvatarColor(displayName),
              mr: 1,
            }}
          >
            {getInitials(displayName)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" noWrap>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {safeStr(person.gender)} • {formatDate(person.dob)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleMenuClick}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ mb: 1 }}>
          {person.email && (
            <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
              <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption">{person.email}</Typography>
            </Box>
          )}
          {person.phone && (
            <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
              <PhoneIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption">{person.phone}</Typography>
            </Box>
          )}
          {person.location && (
            <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
              <LocationIcon fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption">{person.location}</Typography>
            </Box>
          )}
          {leaderEntries.length > 0 && (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 1 }}
            >
              {leaderEntries.map(([key, name]) => (
                <Box key={key} sx={{ display: "flex", alignItems: "center" }}>
                  <GroupIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">
                    Leader @{safeStr(key).replace("leader", "")}: {name}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Chip
            label={safeStr(person.Stage) || "Win"}
            size="small"
            sx={{
              height: 20,
              fontSize: 10,
              backgroundColor: getStageColor(person.Stage),
              color: "#fff",
            }}
          />
          <Typography variant="caption">
            Updated: {formatDate(person.lastUpdated)}
          </Typography>
        </Box>

        <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
});

// ─── DragDropBoard ────────────────────────────────────────────────────────────
const DragDropBoard = ({
  people,
  onEditPerson,
  onDeletePerson,
  loading,
  updatePersonInCache,
  allPeople,
  setAllPeople,
}) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const isMedium = useMediaQuery(theme.breakpoints.between("sm", "lg"));
  const { authFetch } = useContext(AuthContext);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const newStage = destination.droppableId;
    const originalPerson = allPeople.find(
      (p) => safeStr(p._id) === safeStr(draggableId),
    );
    if (!originalPerson) return;

    // Optimistic update — move card instantly in UI
    setAllPeople((prev) =>
      prev.map((p) =>
        safeStr(p._id) === safeStr(draggableId) ? { ...p, Stage: newStage } : p,
      ),
    );

    try {
      const response = await authFetch(`${BACKEND_URL}/people/${draggableId}`, {
        method: "PATCH",
        body: JSON.stringify({ Stage: newStage }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      const ts = safeStr(data.person?.UpdatedAt || new Date().toISOString());

      // Confirm with server timestamp
      setAllPeople((prev) =>
        prev.map((p) =>
          safeStr(p._id) === safeStr(draggableId)
            ? { ...p, Stage: newStage, lastUpdated: ts }
            : p,
        ),
      );
      if (updatePersonInCache)
        updatePersonInCache(draggableId, { Stage: newStage, lastUpdated: ts });

      // Keep global window cache in sync
      window.globalPeopleCache = (window.globalPeopleCache || []).map((p) =>
        safeStr(p._id) === safeStr(draggableId)
          ? { ...p, Stage: newStage, lastUpdated: ts }
          : p,
      );
    } catch (err) {
      console.error("Failed to update Stage:", err.message || err);
      // Roll back on failure
      setAllPeople((prev) =>
        prev.map((p) =>
          safeStr(p._id) === safeStr(draggableId) ? originalPerson : p,
        ),
      );
      alert(`Failed to update stage: ${err.message || "Unknown error"}`);
    }
  };

  // Show skeletons only when truly empty (no cache, no data at all)
  if (loading && people.length === 0) {
    return <BoardSkeleton cardCount={3} />;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Box
        sx={{
          display: "flex",
          flexWrap: isSmall || isMedium ? "wrap" : "nowrap",
          gap: 3,
          justifyContent: "center",
          py: 1,
        }}
      >
        {stages.map((stage) => {
          const stagePeople = people.filter((p) => {
            const s = safeStr(p.Stage).trim().toLowerCase();
            return s === stage.id.toLowerCase() && (p.name || p.surname);
          });
          const stageWidth = isSmall ? "100%" : isMedium ? "45%" : "250px";
          return (
            <Paper
              key={stage.id}
              sx={{
                flex: `0 0 ${stageWidth}`,
                minWidth: 220,
                borderRadius: 2,
                overflow: "hidden",
                mb: isSmall || isMedium ? 2 : 0,
                backgroundColor:
                  theme.palette.mode === "dark"
                    ? theme.palette.grey[800]
                    : theme.palette.common.white,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor:
                    theme.palette.mode === "dark"
                      ? theme.palette.grey[900]
                      : theme.palette.grey[100],
                }}
              >
                <Typography variant="subtitle1">{stage.title}</Typography>
                <Badge
                  badgeContent={stagePeople.length}
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor:
                        theme.palette.mode === "dark" ? "#fff" : "#000",
                      color: theme.palette.mode === "dark" ? "#000" : "#fff",
                      fontSize: 10,
                    },
                  }}
                />
              </Box>
              <Droppable droppableId={stage.id}>
                {(provided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      p: 1,
                      minHeight: 140,
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
                    {stagePeople.length > 0 ? (
                      stagePeople.map((person, index) => (
                        <Draggable
                          key={safeStr(person._id)}
                          draggableId={safeStr(person._id)}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Box
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <PersonCard
                                person={person}
                                onEdit={onEditPerson}
                                onDelete={onDeletePerson}
                                isDragging={snapshot.isDragging}
                              />
                            </Box>
                          )}
                        </Draggable>
                      ))
                    ) : // While refreshing in background, show subtle skeletons inside non-empty columns
                    loading ? (
                      [...Array(2)].map((_, i) => (
                        <PersonCardSkeleton key={i} />
                      ))
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          textAlign: "center",
                          py: 2,
                          color: "text.disabled",
                        }}
                      >
                        No people
                      </Typography>
                    )}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
          );
        })}
      </Box>
    </DragDropContext>
  );
};

// ─── PeopleSection ────────────────────────────────────────────────────────────
export const PeopleSection = () => {
  const theme = useTheme();
  const { user, authFetch } = useContext(AuthContext);
  const { userProfile } = useContext(UserContext);

  const currentUserOrg = useMemo(() => {
    const org = safeStr(
      user?.org_id || user?.organization || user?.Organization || "",
    );
    return org.toLowerCase().replace(" ", "-");
  }, [user]);

  const currentUserName = useMemo(() => {
    if (user?.name && user?.surname)
      return `${safeStr(user.name).trim()} ${safeStr(user.surname).trim()}`.toLowerCase();
    if (userProfile?.name)
      return safeStr(userProfile.name).toLowerCase().trim();
    return "";
  }, [user, userProfile]);

  // ── Initialise from cache immediately so the page is never blank ──────────
  const hasCachedData = !!(
    window.globalPeopleCache &&
    window.globalCacheTimestamp &&
    Date.now() - window.globalCacheTimestamp < CACHE_DURATION &&
    window.globalPeopleCacheOrg ===
      safeStr(user?.org_id || user?.organization || user?.Organization || "")
        .toLowerCase()
        .replace(" ", "-")
  );

  const [personToDelete, setPersonToDelete] = useState(null);
  const [allPeople, setAllPeople] = useState(() =>
    hasCachedData ? window.globalPeopleCache : [],
  );
  // loading = true only when we have NO data at all to show
  const [loading, setLoading] = useState(!hasCachedData);
  // backgroundLoading = true when we have cached data but are silently refreshing
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    dob: "",
    address: "",
    email: "",
    number: "",
    invitedBy: "",
    gender: "",
    leader12: "",
    leader144: "",
    leader1728: "",
    stage: "Win",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [viewMode, setViewMode] = useState("grid");
  const [viewFilter, setViewFilter] = useState("myPeople");
  const [stageFilter, setStageFilter] = useState("all");
  const [gridPage, setGridPage] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [cacheInfo, setCacheInfo] = useState({
    source: hasCachedData ? "local-cache" : "",
    org: "",
  });
  const ITEMS_PER_PAGE = 100;

  const isFetchingRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const peopleFetchPromiseRef = useRef(null);
  const prevOrgRef = useRef(currentUserOrg);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // ── Core fetch ─────────────────────────────────────────────────────────────
  const fetchAllPeople = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();
      const orgKey = currentUserOrg;

      if (
        window.globalPeopleCacheOrg &&
        window.globalPeopleCacheOrg !== orgKey
      ) {
        window.globalPeopleCache = null;
        window.globalCacheTimestamp = null;
        window.globalPeopleCacheOrg = null;
      }

      if (
        !forceRefresh &&
        window.globalPeopleCache &&
        window.globalCacheTimestamp &&
        now - window.globalCacheTimestamp < CACHE_DURATION
      ) {
        setAllPeople(window.globalPeopleCache);
        setCacheInfo({ source: "local-cache", org: orgKey });
        setLoading(false);
        return window.globalPeopleCache;
      }

      if (forceRefresh) {
        isFetchingRef.current = false;
        peopleFetchPromiseRef.current = null;
      }

      if (isFetchingRef.current && peopleFetchPromiseRef.current) {
        try {
          return (
            (await peopleFetchPromiseRef.current) ||
            window.globalPeopleCache ||
            []
          );
        } catch {
          return window.globalPeopleCache || [];
        }
      }

      isFetchingRef.current = true;

      // If we already have data (cached), show it immediately and refresh silently
      if (window.globalPeopleCache && window.globalPeopleCache.length > 0) {
        setAllPeople(window.globalPeopleCache);
        setLoading(false);
        setBackgroundLoading(true);
      } else {
        // Truly empty — show skeleton
        setLoading(true);
      }

      peopleFetchPromiseRef.current = (async () => {
        // Replace the try block inside peopleFetchPromiseRef.current = (async () => { ... })()
        try {
          const response = await authFetch(`${BACKEND_URL}/cache/people`);
          if (!response || !response.ok)
            throw new Error("Failed to fetch people");
          const data = await response.json();
          if (!data.success)
            throw new Error(data.error || "Cache returned error");

          setCacheInfo({
            source: safeStr(data.source),
            org: safeStr(data.organization || orgKey),
          });

          const mapped = (data?.cached_data || [])
            .map(mapRawPerson)
            .filter(Boolean);

          // ── NEW: if backend is still loading, show partial data and poll ──
          if (!data.is_complete && data.source === "loading") {
            if (mapped.length > 0) {
              setAllPeople(mapped);
              window.globalPeopleCache = mapped;
              window.globalCacheTimestamp = Date.now();
              window.globalPeopleCacheOrg = orgKey;
            }
            // Poll every 3s until complete
            await new Promise((resolve) => {
              let attempts = 0;
              const interval = setInterval(async () => {
                attempts++;
                try {
                  const pollRes = await authFetch(
                    `${BACKEND_URL}/cache/people`,
                  );
                  if (!pollRes?.ok) return;
                  const pollData = await pollRes.json();
                  const pollMapped = (pollData?.cached_data || [])
                    .map(mapRawPerson)
                    .filter(Boolean);
                  if (pollMapped.length > 0) {
                    setAllPeople(pollMapped);
                    window.globalPeopleCache = pollMapped;
                    window.globalCacheTimestamp = Date.now();
                    window.globalPeopleCacheOrg = orgKey;
                  }
                  if (pollData.is_complete || attempts >= 20) {
                    clearInterval(interval);
                    resolve();
                  }
                } catch {
                  if (attempts >= 20) {
                    clearInterval(interval);
                    resolve();
                  }
                }
              }, 3000);
            });
            return window.globalPeopleCache || [];
          }
          // ── END NEW ──

          window.globalPeopleCache = mapped;
          window.globalCacheTimestamp = Date.now();
          window.globalPeopleCacheOrg = orgKey;
          setAllPeople(mapped);
          return mapped;
        } catch (err) {
          console.error("Fetch error:", err);
          setSnackbar({
            open: true,
            message: `Failed to load people: ${safeStr(err?.message)}`,
            severity: "error",
          });
          if (window.globalPeopleCache) {
            setAllPeople(window.globalPeopleCache);
            return window.globalPeopleCache;
          }
          return [];
        } finally {
          setLoading(false);
          setBackgroundLoading(false);
          isFetchingRef.current = false;
          peopleFetchPromiseRef.current = null;
        }
      })();

      return await peopleFetchPromiseRef.current;
    },
    [BACKEND_URL, authFetch, currentUserOrg],
  );

  // ── Mount effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    const now = Date.now();
    const orgKey = currentUserOrg;
    const cacheValid =
      window.globalPeopleCache &&
      window.globalCacheTimestamp &&
      now - window.globalCacheTimestamp < CACHE_DURATION &&
      window.globalPeopleCacheOrg === orgKey;

    if (cacheValid) {
      // Show cache instantly, silently refresh if it's getting old
      setAllPeople(window.globalPeopleCache);
      setLoading(false);
      setCacheInfo({ source: "local-cache", org: orgKey });
      const age = now - window.globalCacheTimestamp;
      if (age > 2 * 60 * 1000) {
        setBackgroundLoading(true);
        fetchAllPeople(true).catch(() => {});
      }
    } else {
      fetchAllPeople(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Org change ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (prevOrgRef.current !== currentUserOrg) {
      prevOrgRef.current = currentUserOrg;
      window.globalPeopleCache = null;
      window.globalCacheTimestamp = null;
      window.globalPeopleCacheOrg = null;
      setAllPeople([]);
      setLoading(true);
      fetchAllPeople(true);
    }
  }, [currentUserOrg, fetchAllPeople]);

  // ── Manual refresh ─────────────────────────────────────────────────────────
  const refetchPeople = useCallback(async () => {
    setIsRefreshing(true);
    window.globalPeopleCache = null;
    window.globalCacheTimestamp = null;
    window.globalPeopleCacheOrg = null;
    isFetchingRef.current = false;
    peopleFetchPromiseRef.current = null;
    try {
      await fetchAllPeople(true);
      setSnackbar({
        open: true,
        message: "People list refreshed.",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to refresh people data",
        severity: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAllPeople]);

  // ── Search debounce ────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchTerm.trim()) setIsSearching(true);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsSearching(false);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const searchPeople = useCallback((list, q, field = "name") => {
    const rawQ = safeStr(q).trim();
    if (!rawQ) return list;
    const lq = rawQ.toLowerCase();
    if (field === "phone") {
      const digits = rawQ.replace(/\D/g, "");
      return digits
        ? list.filter((p) =>
            safeStr(p.phone).replace(/\D/g, "").includes(digits),
          )
        : list;
    }
    if (field === "leaders") {
      return list
        .filter((p) => safeStr(p.leadersCombinedLower).includes(lq))
        .sort(
          (a, b) =>
            safeStr(a.leadersCombinedLower).indexOf(lq) -
            safeStr(b.leadersCombinedLower).indexOf(lq),
        );
    }
    if (field === "email") {
      return list
        .filter((p) => safeStr(p.emailLower).includes(lq))
        .sort(
          (a, b) =>
            safeStr(a.emailLower).indexOf(lq) -
            safeStr(b.emailLower).indexOf(lq),
        );
    }
    if (field === "location") {
      return list
        .filter((p) => safeStr(p.addressLower).includes(lq))
        .sort(
          (a, b) =>
            safeStr(a.addressLower).indexOf(lq) -
            safeStr(b.addressLower).indexOf(lq),
        );
    }
    if (field === "stage")
      return list.filter((p) => safeStr(p.Stage).toLowerCase().includes(lq));
    const tokens = lq.split(/\s+/).filter(Boolean);
    const matches = list.filter((p) =>
      tokens.every((t) => safeStr(p.fullNameLower).includes(t)),
    );
    const score = (p) => {
      const f = safeStr(p.fullNameLower);
      const n = safeStr(p.name).toLowerCase();
      const s = safeStr(p.surname).toLowerCase();
      if (f === lq) return 0;
      if (f.startsWith(lq)) return 1;
      if (n === lq) return 2;
      if (s === lq) return 3;
      if (n.startsWith(lq)) return 4;
      if (s.startsWith(lq)) return 5;
      if (tokens.every((t) => n.startsWith(t) || s.startsWith(t))) return 6;
      if (tokens[0] && f.indexOf(tokens[0]) === 0) return 7;
      return 10;
    };
    matches.sort(
      (a, b) =>
        score(a) - score(b) ||
        safeStr(a.fullNameLower).localeCompare(safeStr(b.fullNameLower)),
    );
    return matches;
  }, []);

  const filterMyPeople = useCallback(
    (list) => {
      if (!currentUserName) return list;
      const un = currentUserName.toLowerCase().trim();
      return list.filter((p) =>
        Object.values(p.leaders || {}).some(
          (n) => safeStr(n).toLowerCase() === un,
        ),
      );
    },
    [currentUserName],
  );

  // ── Derived data ───────────────────────────────────────────────────────────
  const filteredPeople = useMemo(() => {
    let r = allPeople;
    if (viewFilter === "myPeople") r = filterMyPeople(r);
    if (stageFilter !== "all")
      r = r.filter(
        (p) =>
          safeStr(p.Stage).trim().toLowerCase() === stageFilter.toLowerCase(),
      );
    if (debouncedSearch.trim())
      r = searchPeople(r, debouncedSearch, searchField);
    return r;
  }, [
    allPeople,
    debouncedSearch,
    searchField,
    viewFilter,
    stageFilter,
    searchPeople,
    filterMyPeople,
  ]);

  const paginatedPeople = useMemo(() => {
    if (viewMode === "list" || debouncedSearch.trim()) return filteredPeople;
    const start = (gridPage - 1) * ITEMS_PER_PAGE;
    return filteredPeople.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPeople, gridPage, viewMode, debouncedSearch]);

  const totalPages = useMemo(() => {
    if (viewMode === "list" || debouncedSearch.trim()) return 1;
    return Math.ceil(filteredPeople.length / ITEMS_PER_PAGE);
  }, [filteredPeople.length, viewMode, debouncedSearch]);

  const stageCounts = useMemo(() => {
    const base =
      viewFilter === "myPeople" ? filterMyPeople(allPeople) : allPeople;
    const norm = (s) => safeStr(s).trim().toLowerCase();
    return {
      Win: base.filter((p) => norm(p.Stage) === "win").length,
      Consolidate: base.filter((p) => norm(p.Stage) === "consolidate").length,
      Disciple: base.filter((p) => norm(p.Stage) === "disciple").length,
      Send: base.filter((p) => norm(p.Stage) === "send").length,
      total: base.length,
    };
  }, [allPeople, viewFilter, filterMyPeople]);

  useEffect(() => {
    setGridPage(1);
  }, [debouncedSearch, searchField, viewFilter, stageFilter]);

  // ── Cache helpers ──────────────────────────────────────────────────────────
  const updatePersonInCache = useCallback((personId, updates) => {
    setAllPeople((prev) => {
      const updated = prev.map((person) => {
        if (safeStr(person._id) !== safeStr(personId)) return person;
        const m = { ...person, ...updates };
        m.fullName = `${safeStr(m.name)} ${safeStr(m.surname)}`.trim();
        m.fullNameLower = m.fullName.toLowerCase();
        m.emailLower = safeStr(m.email).toLowerCase();
        m.phoneLower = safeStr(m.phone).toLowerCase();
        m.addressLower = safeStr(m.location).toLowerCase();
        m.leadersCombinedLower = getLeadersCombined(m).toLowerCase();
        return m;
      });
      window.globalPeopleCache = updated;
      return updated;
    });
  }, []);

  const addPersonToCache = useCallback((newPerson) => {
    setAllPeople((prev) => {
      const p = { ...newPerson };
      p.fullName = `${safeStr(p.name)} ${safeStr(p.surname)}`.trim();
      p.fullNameLower = p.fullName.toLowerCase();
      p.emailLower = safeStr(p.email).toLowerCase();
      p.phoneLower = safeStr(p.phone).toLowerCase();
      p.addressLower = safeStr(p.location).toLowerCase();
      p.leadersCombinedLower = getLeadersCombined(p).toLowerCase();
      const updated = [...prev, p];
      window.globalPeopleCache = updated;
      return updated;
    });
  }, []);

  const removePersonFromCache = useCallback((personId) => {
    setAllPeople((prev) => {
      const updated = prev.filter((p) => safeStr(p._id) !== safeStr(personId));
      window.globalPeopleCache = updated;
      return updated;
    });
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
  setIsRefreshing(true);
  try {
    const res = await authFetch(`${BACKEND_URL}/cache/people/refresh`, { method: "POST" });
    if (!res.ok) throw new Error("Refresh failed");
    
    // Clear local cache so next fetch goes to server
    window.globalPeopleCache = null;
    window.globalCacheTimestamp = null;
    window.globalPeopleCacheOrg = null;
    isFetchingRef.current = false;
    peopleFetchPromiseRef.current = null;

    await fetchAllPeople(true);
    setSnackbar({ open: true, message: "People list refreshed.", severity: "success" });
  } catch (err) {
    setSnackbar({ open: true, message: `Refresh failed: ${safeStr(err?.message)}`, severity: "error" });
  } finally {
    setIsRefreshing(false);
  }
}, [authFetch, BACKEND_URL, fetchAllPeople]);

  const handleViewFilterChange = (e, v) => {
    if (v !== null) setViewFilter(v);
  };
  const handleViewChange = (e, v) => {
    if (v !== null) setViewMode(v);
  };

  const handleEditPerson = (person) => {
    setEditingPerson(person);
    let formattedDob = "";
    if (person.dob) {
      try {
        const d = new Date(person.dob);
        if (!isNaN(d.getTime())) formattedDob = d.toISOString().split("T")[0];
      } catch {
        /* ignore */
      }
    }
    const lm = person.leaders || {};
    setFormData({
      name: safeStr(person.name),
      surname: safeStr(person.surname),
      dob: formattedDob,
      address: safeStr(person.location),
      email: safeStr(person.email),
      number: safeStr(person.phone),
      invitedBy: safeStr(lm.leader1 || person.invitedBy),
      gender: safeStr(person.gender),
      leader12: safeStr(lm.leader12),
      leader144: safeStr(lm.leader144),
      leader1728: safeStr(lm.leader1728),
      stage: safeStr(person.Stage) || "Win",
    });
    setIsModalOpen(true);
  };

  const handleDeletePerson = (personId) =>
    setPersonToDelete(
      allPeople.find((p) => safeStr(p._id) === safeStr(personId)),
    );
  const handleConfirmDelete = async () => {
    if (!personToDelete) return;
    try {
      const res = await authFetch(
        `${BACKEND_URL}/people/${personToDelete._id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Delete failed");
      }
      removePersonFromCache(personToDelete._id);
      
      window.globalPeopleCache = null;
      window.globalCacheTimestamp = null;
      window.globalPeopleCacheOrg = null;
      
      authFetch(`${BACKEND_URL}/cache/people/refresh`, {
        method: "POST",
      }).catch(() => {});

      setSnackbar({
        open: true,
        message: "Person deleted successfully",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: safeStr(err.message) || "Delete failed",
        severity: "error",
      });
    } finally {
      setPersonToDelete(null);
    }
  };

  const handleSaveFromDialog = useCallback(
  async (savedPerson) => {
    // Read leaders from the normalized fields the dialog returns
    const leader1   = savedPerson.leader1   || savedPerson["Leader @1"]   || "";
    const leader12  = savedPerson.leader12  || savedPerson["Leader @12"]  || "";
    const leader144 = savedPerson.leader144 || savedPerson["Leader @144"] || "";

    const leadersMap = { leader1, leader12, leader144 };

    // Build leadersRaw in the array shape extractLeaders() expects
    const leadersRaw = [
      leader1   ? { level: 1,   name: leader1   } : null,
      leader12  ? { level: 12,  name: leader12  } : null,
      leader144 ? { level: 144, name: leader144 } : null,
    ].filter(Boolean);

    const mappedPerson = {
      _id:      safeStr(savedPerson._id || editingPerson?._id),
      name:     safeStr(savedPerson.name),
      surname:  safeStr(savedPerson.surname),
      gender:   safeStr(savedPerson.gender),
      dob:      safeStr(savedPerson.birthday || savedPerson.dob),
      location: safeStr(savedPerson.address),   // ← store as location to match mapRawPerson
      address:  safeStr(savedPerson.address),   // ← also keep address so dialog can read it on re-edit
      email:    safeStr(savedPerson.email),
      phone:    safeStr(savedPerson.number || savedPerson.phone),
      Stage:    safeStr(savedPerson.stage || savedPerson.Stage) || "Win",
      lastUpdated: new Date().toISOString(),
      invitedBy: safeStr(savedPerson.invitedBy),
      ...leadersMap,
      leaders:  leadersMap,
      leadersRaw,
      leadersCombinedLower: Object.values(leadersMap).join(" ").toLowerCase(),
      fullName: `${safeStr(savedPerson.name)} ${safeStr(savedPerson.surname)}`.trim(),
      fullNameLower: `${safeStr(savedPerson.name)} ${safeStr(savedPerson.surname)}`.trim().toLowerCase(),
      emailLower:   safeStr(savedPerson.email).toLowerCase(),
      phoneLower:   safeStr(savedPerson.number || savedPerson.phone).toLowerCase(),
      addressLower: safeStr(savedPerson.address).toLowerCase(),
    };

    if (editingPerson) {
      updatePersonInCache(editingPerson._id, mappedPerson);
      setSnackbar({ open: true, message: "Person updated successfully", severity: "success" });
    } else {
      setSnackbar({ open: true, message: "Person added — refreshing list…", severity: "info" });
      try {
        await authFetch(`${BACKEND_URL}/cache/people/refresh`, { method: "POST" });
      } catch { /* non-critical */ }
      window.globalPeopleCache = null;
      window.globalCacheTimestamp = null;
      window.globalPeopleCacheOrg = null;
      try {
        await fetchAllPeople(true);
        setSnackbar({ open: true, message: "Person added successfully", severity: "success" });
      } catch {
        addPersonToCache(mappedPerson);
        setSnackbar({ open: true, message: "Person added (refresh if needed)", severity: "warning" });
      }
    }
  },
  [editingPerson, updatePersonInCache, addPersonToCache, fetchAllPeople, authFetch, BACKEND_URL],
);

  const handleCloseDialog = () => {
    setIsModalOpen(false);
    setEditingPerson(null);
    setFormData({
      name: "",
      surname: "",
      dob: "",
      address: "",
      email: "",
      number: "",
      invitedBy: "",
      gender: "",
      leader12: "",
      leader144: "",
      leader1728: "",
      stage: "Win",
    });
  };

  const isSearchingNow = debouncedSearch.trim().length > 0;

  // ── Stat card definitions ──────────────────────────────────────────────────
  const statCards = [
    {
      id: "all",
      label: "Total People",
      value: stageCounts.total,
      icon: <PeopleIcon />,
      color: "#2196f3",
    },
    {
      id: "Win",
      label: "Win",
      value: stageCounts.Win,
      icon: <WinIcon />,
      color: "#4caf50",
    },
    {
      id: "Consolidate",
      label: "Consolidate",
      value: stageCounts.Consolidate,
      icon: <ConsolidateIcon />,
      color: "#ff9800",
    },
    {
      id: "Disciple",
      label: "Disciple",
      value: stageCounts.Disciple,
      icon: <DiscipleIcon />,
      color: "#9c27b0",
    },
    {
      id: "Send",
      label: "Send",
      value: stageCounts.Send,
      icon: <SendIcon />,
      color: "#f44336",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        mt: 8,
        px: 2,
        pb: 4,
      }}
    >
      {/* Thin top bar: shown during silent background refresh, not blocking skeletons */}
      {backgroundLoading && !loading && (
        <LinearProgress
          sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999 }}
        />
      )}

      {/* ── Stat cards (skeleton or real) ────────────────────────────────── */}
      <Box sx={{ maxWidth: "1400px", margin: "0 auto", width: "100%", mb: 3 }}>
        <Grid
          container
          spacing={window.innerWidth >= theme.breakpoints.values.md ? 3 : 2}
        >
          {statCards.map((stat) => (
            <Grid item xs={6} sm={4} md={2.4} key={stat.id}>
              {loading ? (
                <StatCardSkeleton />
              ) : (
                <Card
                  sx={{
                    width: "100%",
                    height: 200,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    border:
                      stageFilter === stat.id
                        ? `3px solid ${stat.color}`
                        : "1px solid",
                    borderColor:
                      stageFilter === stat.id ? stat.color : "divider",
                    transform:
                      stageFilter === stat.id ? "scale(1.03)" : "scale(1)",
                    boxShadow: stageFilter === stat.id ? 6 : 2,
                    "&:hover": { transform: "scale(1.03)", boxShadow: 6 },
                  }}
                  onClick={() => setStageFilter(stat.id)}
                >
                  <CardContent
                    sx={{
                      textAlign: "center",
                      p: 2,
                      width: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: stat.color,
                        width: 56,
                        height: 56,
                        mb: 1,
                        boxShadow: 2,
                      }}
                    >
                      {stat.icon}
                    </Avatar>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color="text.primary"
                      sx={{ lineHeight: 1 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Header row ───────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          px: 1,
          mb: 1,
        }}
      >
        <Box>
          {loading ? (
            <>
              <Skeleton variant="text" width={180} height={28} />
              <Skeleton
                variant="text"
                width={240}
                height={18}
                sx={{ mt: 0.5 }}
              />
            </>
          ) : (
            <>
              <Typography variant="h6">
                {viewFilter === "myPeople" ? "My People" : "All People"}
                {stageFilter !== "all" && ` — ${stageFilter}`}
                {isSearchingNow && ` (${filteredPeople.length} results)`}
                {isSearching && <CircularProgress size={16} sx={{ ml: 1 }} />}
                {isRefreshing && <CircularProgress size={16} sx={{ ml: 1 }} />}
                {backgroundLoading && !isRefreshing && (
                  <CircularProgress size={14} sx={{ ml: 1, opacity: 0.5 }} />
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {cacheInfo.org
                  ? safeStr(cacheInfo.org)
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())
                  : safeStr(
                      user?.Organization ||
                        user?.organization ||
                        "All Organizations",
                    )}
                {" · "}
                {allPeople.length} people loaded
                {cacheInfo.source &&
                  cacheInfo.source !== "cache" &&
                  cacheInfo.source !== "local-cache" && (
                    <Chip
                      label={
                        cacheInfo.source === "loading"
                          ? "Loading…"
                          : cacheInfo.source
                      }
                      size="small"
                      color={
                        cacheInfo.source === "stale_cache"
                          ? "warning"
                          : "default"
                      }
                      sx={{ ml: 1, height: 16, fontSize: "0.6rem" }}
                    />
                  )}
              </Typography>
            </>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {loading ? (
            <>
              <Skeleton variant="rounded" width={130} height={36} />
              <Skeleton variant="rounded" width={80} height={36} />
              <Skeleton variant="rounded" width={72} height={36} />
            </>
          ) : (
            <>
              <ToggleButtonGroup
                value={viewFilter}
                exclusive
                onChange={handleViewFilterChange}
                size="small"
              >
                <Tooltip title="View All People" arrow>
                  <ToggleButton value="all" aria-label="all people">
                    <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} /> All
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="View My People Only" arrow>
                  <ToggleButton value="myPeople" aria-label="my people">
                    <PersonOutlineIcon fontSize="small" sx={{ mr: 0.5 }} /> Mine
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewChange}
                size="small"
              >
                <Tooltip title="Grid View" arrow>
                  <ToggleButton value="grid" aria-label="grid view">
                    <ViewModuleIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="List View" arrow>
                  <ToggleButton value="list" aria-label="list view">
                    <ViewListIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                size="small"
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
              >
                {isRefreshing ? "Loading..." : "Refresh"}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* ── Search row ───────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, px: 1 }}>
        {loading ? (
          <>
            <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
            <Skeleton variant="rounded" width={140} height={40} />
          </>
        ) : (
          <>
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {isSearching ? (
                      <CircularProgress size={20} />
                    ) : (
                      <SearchIcon />
                    )}
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="phone">Phone</MenuItem>
              <MenuItem value="location">Location</MenuItem>
              <MenuItem value="leaders">Leaders</MenuItem>
            </TextField>
          </>
        )}
      </Box>

      {/* ── Board / list ─────────────────────────────────────────────────── */}
      <Box sx={{ position: "relative" }}>
        {viewMode === "grid" ? (
          <>
            <DragDropBoard
              people={paginatedPeople}
              onEditPerson={handleEditPerson}
              onDeletePerson={handleDeletePerson}
              loading={loading}
              updatePersonInCache={updatePersonInCache}
              allPeople={allPeople}
              setAllPeople={setAllPeople}
            />
            {!isSearchingNow && totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={gridPage}
                  onChange={(_, p) => setGridPage(p)}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ px: 2 }}>
            <PeopleListView
              people={filteredPeople}
              onEdit={handleEditPerson}
              onDelete={handleDeletePerson}
              loading={loading}
            />
          </Box>
        )}

        <AddPersonDialog
          open={isModalOpen}
          onClose={handleCloseDialog}
          onSave={handleSaveFromDialog}
          formData={formData}
          setFormData={setFormData}
          isEdit={!!editingPerson}
          personId={editingPerson?._id || null}
          editingPersonObject={editingPerson}
          preloadedPeople={allPeople}
        />

        <DeleteConfirmationModal
          open={!!personToDelete}
          onClose={() => setPersonToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Person"
          content={`Are you sure you want to delete ${safeStr(personToDelete?.fullName) || "this person"}? This action cannot be undone.`}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert severity={snackbar.severity} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>

      <PeopleImportFAB
        onImportComplete={refetchPeople}
        themeMode={theme.palette.mode}
      />
    </Box>
  );
};
