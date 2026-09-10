import { useState, useEffect, useRef } from "react";
import {
  Button,
  TextField,
  Checkbox,
  Chip,
  Card,
  CardContent,
  FormControlLabel,
  Box,
  MenuItem,
  InputAdornment,
  Typography,
  useTheme,
  IconButton,
  Alert,
  Paper,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import { useContext } from "react"; // if not already
import { AuthContext } from "../contexts/AuthContext"
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import DescriptionIcon from "@mui/icons-material/Description";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Popper } from "@mui/material";
import { useOrgConfig } from "../contexts/OrgConfigContext";
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
// Geoapify
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;
const GEOAPIFY_COUNTRY_CODE = (
  import.meta.env.VITE_GEOAPIFY_COUNTRY_CODE || "za"
).toLowerCase();

const SameWidthPopper = (props) => {
  const { anchorEl } = props;

  const width =
    anchorEl && typeof anchorEl.getBoundingClientRect === "function"
      ? anchorEl.getBoundingClientRect().width
      : undefined;

  return (
    <Popper
      {...props}
      placement="bottom-start"
      style={{
        zIndex: 20000,
        width,
      }}
    />
  );
};

const CreateEvents = ({ user, isModal, onClose, eventTypes, selectedEventType, selectedEventTypeObj }) => {
  const navigate = useNavigate();
  const { id: paramEventID } = useParams();
  const [autoPopulatedFields, setAutoPopulatedFields] = useState(new Set());
  const [eventId, setEventId] = useState(paramEventID ? paramEventID : null)
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [eventTypeFlags, setEventTypeFlags] = useState({
    isGlobal: false,
    isTicketed: false,
    hasPersonSteps: false,
  });
  const {
    isGlobal: isGlobalEvent,
    isTicketed: isTicketedEvent,
    hasPersonSteps,
  } = eventTypeFlags;
  const { getAllHierarchyLevels } = useOrgConfig();
  const { authFetch } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [peopleData, setPeopleData] = useState([]);
  const [priceTiers, setPriceTiers] = useState([]);

  const isSelectingFromDropdown = useRef(false);

  const isAdmin = user?.role === "admin";
  console.log("view role", isAdmin);

  const [formData, setFormData] = useState({
    eventType: selectedEventTypeObj?.name || selectedEventType || "",
    eventName: "",
    email: "",
    date: "",
    time: "",
    timePeriod: "AM",
    recurringDays: [],
    location: "",
    eventLeader: "",
    eventLeaderEmail: "",
    description: "",
    leader1: "",
    leader12: "",
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [errors, setErrors] = useState({});
  const formAlert = useRef();

  // -----------------------------
  // GEOAPIFY LOCATION AUTOCOMPLETE (with geolocation bias)
  // -----------------------------
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Bias location for better SA results
  const [biasLonLat, setBiasLonLat] = useState(null);
  const searchDebounceRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBiasLonLat({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        setBiasLonLat(null);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const handleIsRecurringChange = (e) => {
    const checked = e.target.checked;
    setIsRecurring(checked);
    if (!checked) {
      setFormData((prev) => ({
        ...prev,
        recurringDays: [],
      }));
    }
  };

  useEffect(() => {
    if (!GEOAPIFY_API_KEY) {
      setLocationError(
        "Missing Geoapify API key. Please set VITE_GEOAPIFY_API_KEY in your .env file.",
      );
      return;
    }

    const query = (formData.location || "").trim();
    if (query.length < 3) {
      setLocationOptions([]);
      setLocationError("");
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setTimeout(async () => {
      try {
        setLocationLoading(true);
        setLocationError("");

        const biasParam = biasLonLat
          ? `&bias=proximity:${encodeURIComponent(
            biasLonLat.lon,
          )},${encodeURIComponent(biasLonLat.lat)}`
          : "";

        const url =
          `https://api.geoapify.com/v1/geocode/autocomplete` +
          `?text=${encodeURIComponent(query)}` +
          `&limit=10` +
          `&lang=en` +
          `&filter=countrycode:${encodeURIComponent(GEOAPIFY_COUNTRY_CODE)}` +
          biasParam +
          `&format=json` +
          `&apiKey=${encodeURIComponent(GEOAPIFY_API_KEY)}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Location lookup failed");

        const data = await res.json();
        if (!isActive) return;

        const results = Array.isArray(data?.results) ? data.results : [];

        const mapped = results
          .map((r) => ({
            label: r.formatted || "",
            formatted: r.formatted || "",
            suburb: r.suburb || "",
            city: r.city || r.town || r.village || "",
            state: r.state || "",
            postcode: r.postcode || "",
            lat: r.lat,
            lon: r.lon,
          }))
          .filter((x) => x.label);

        setLocationOptions(mapped);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setLocationError(
          "Could not load location suggestions. Please type manually.",
        );
        setLocationOptions([]);
      } finally {
        if (isActive) setLocationLoading(false);
      }
    }, 350);

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [formData.location, biasLonLat]);

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  useEffect(() => {
    console.log("CreateEvents - Props received:", {
      selectedEventTypeObj,
      selectedEventType,
      eventTypes: eventTypes.map((et) => ({
        name: et.name,
        isGlobal: et.isGlobal,
        isTicketed: et.isTicketed,
        hasPersonSteps: et.hasPersonSteps,
      })),
    });
    const determineEventType = () => {
      if (selectedEventTypeObj) {
        const objName = selectedEventTypeObj.name || selectedEventTypeObj.displayName || "";
        const matchedFromList = eventTypes.find((et) => {
          const etName = et.name || et.displayName || "";
          return (
            etName.toLowerCase() === objName.toLowerCase() ||
            et._id === selectedEventTypeObj._id
          );
        });
        const source = matchedFromList || selectedEventTypeObj;
        console.log("Using event type source:", matchedFromList ? "eventTypes list" : "selectedEventTypeObj", source);
        return {
          eventType:
            objName,
          isGlobal: !!source.isGlobal,
          isTicketed: !!source.isTicketed,
          hasPersonSteps: !!source.hasPersonSteps,
        };
      }
      if (selectedEventType) {
        console.log("Looking for event type:", selectedEventType);
        if (selectedEventType === "all" || selectedEventType.toUpperCase() === "ALL CELLS") {
          return {
            eventType: "CELLS",
            isGlobal: false,
            isTicketed: false,
            hasPersonSteps: true,
          };
        }
        const foundEventType = eventTypes.find((et) => {
          const etName = et.name || et.displayName || "";
          const searchName = selectedEventType;
          return (
            etName === searchName ||
            etName.toLowerCase() === searchName.toLowerCase() ||
            et._id === searchName ||
            etName.includes(searchName) ||
            searchName.includes(etName)
          );
        });
        if (foundEventType) {
          console.log("Found event type:", foundEventType);
          return {
            eventType:
              foundEventType.name ||
              foundEventType.displayName ||
              selectedEventType,
            isGlobal: !!foundEventType.isGlobal,
            isTicketed: !!foundEventType.isTicketed,
            hasPersonSteps: !!foundEventType.hasPersonSteps,
          };
        } else {
          console.log("Event type not found, using defaults");
          const isCellsType = selectedEventType.toUpperCase() === "CELLS";
          return {
            eventType: selectedEventType,
            isGlobal: false,
            isTicketed: false,
            hasPersonSteps: isCellsType,
          };
        }
      }
      return {
        eventType: "",
        isGlobal: false,
        isTicketed: false,
        hasPersonSteps: false,
      };
    };

    const { eventType, isGlobal, isTicketed, hasPersonSteps } =
      determineEventType();

    console.log("Final event type settings:", {
      eventType,
      isGlobal,
      isTicketed,
      hasPersonSteps,
    });

    setEventTypeFlags({
      isGlobal,
      isTicketed,
      hasPersonSteps,
    });

    setFormData((prev) => ({
      ...prev,
      eventType,
      ...(prev.hasPersonSteps && !hasPersonSteps
        ? {
          ...Object.fromEntries(getAllHierarchyLevels().map(h => [h.field, ""])),
        }
        : {}),
    }));
  }, [selectedEventTypeObj, selectedEventType, eventTypes]);

  useEffect(() => {
    console.log("Leader fields debug:", {
      hasPersonSteps,
      isGlobalEvent,
      shouldShowLeaderFields: hasPersonSteps && !isGlobalEvent,
      formData: {
        leader1: formData.leader1,
        leader12: formData.leader12,
      },
    });
  }, [hasPersonSteps, isGlobalEvent, formData.leader1, formData.leader12]);

  useEffect(() => {
    console.log("Price tier debug:", {
      isTicketedEvent,
      isGlobalEvent,
      shouldShowPriceTiers: isTicketedEvent && !isGlobalEvent,
      priceTiersCount: priceTiers.length,
    });
  }, [isTicketedEvent, isGlobalEvent, priceTiers]);

  useEffect(() => {
    if (isTicketedEvent && priceTiers.length === 0) {
      setPriceTiers([
        {
          name: "",
          price: "",
          ageGroup: "",
          memberType: "",
          paymentMethod: "",
        },
      ]);
    }
  }, [isTicketedEvent]);

const fetchPeople = async (q) => {
  console.log("fetchPeople called with:", q);
  if (!q?.trim() || q.trim().length < 2) {
    setPeopleData([]);
    return;
  }

  try {
    setIsSearchingPeople(true);
    console.log("Hitting URL:", `${BACKEND_URL}/people/search-fast?query=${encodeURIComponent(q.trim())}&limit=25`);

    const res = await authFetch(
      `${BACKEND_URL}/people/search-fast?query=${encodeURIComponent(q.trim())}&limit=25`
    );

    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Raw API response:", data);
    console.log("Results count:", data?.results?.length);

    const people = data?.results || [];
    const formatted = people.map((p) => ({
      id:            p._id,
      fullName:      p.FullName || `${p.Name || ""} ${p.Surname || ""}`.trim(),
      email:         p.Email || "",
      leader1:       p["Leader @1"] || p.leader1 || "",
      leader12:      p["Leader @12"] || p.leader12 || "",
      leader144:     p["Leader @144"] || p.leader144 || "",
      leaderValues:  {},
      org:           "",
      isDifferentOrg: false,
    }));

    console.log("Formatted people:", formatted);
    console.log("Setting peopleData to:", formatted.length, "items");
    setPeopleData(formatted);
  } catch (err) {
    console.error("fetchPeople error:", err);
    setPeopleData([]);
  } finally {
    setIsSearchingPeople(false);
  }
};

  useEffect(() => {
  const queryString = window.location.search
  const queries = new URLSearchParams(queryString)
  if (selectedEventTypeObj?.isTicketed === true) {
    setEventId(queries.get("eventId"))
  }
}, [])
  useEffect(() => {
    console.log("dd", eventId)
    if (!eventId) return;
    const fetchEventData = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/events/${eventId}`);
        const data = response.data;

        console.log("Fetched event data:", data);

        if (data.date) {
          const dt = new Date(data.date);
          data.date = dt.toISOString().split("T")[0];
          const hours = dt.getHours();
          const minutes = dt.getMinutes();
          data.time = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`;
          data.timePeriod = hours >= 12 ? "PM" : "AM";
        }

        if (data.recurring_day) {
          data.recurringDays = Array.isArray(data.recurring_day)
            ? data.recurring_day
            : [];
        }

        if (data.isTicketed !== undefined) {
          setEventTypeFlags((prev) => ({
            ...prev,
            isTicketed: !!data.isTicketed,
          }));
        }

        if (data.isTicketed) {
          console.log(
            "Setting price tiers for ticketed event:",
            data.priceTiers,
          );
          if (
            data.priceTiers &&
            Array.isArray(data.priceTiers) &&
            data.priceTiers.length > 0
          ) {
            const formattedPriceTiers = data.priceTiers.map((tier) => ({
              name: tier.name || "",
              price: tier.price || "",
              ageGroup: tier.ageGroup || "",
              memberType: tier.memberType || "",
              paymentMethod: tier.paymentMethod || "",
            }));
            setPriceTiers(formattedPriceTiers);
          } else {
            setPriceTiers([
              {
                name: "",
                price: "",
                ageGroup: "",
                memberType: "",
                paymentMethod: "",
              },
            ]);
          }
        } else {
          setPriceTiers([]);
        }

        setFormData((prev) => ({ ...prev, ...data }));
        window.history.replaceState({}, "", window.location.pathname);
      } catch (err) {
        console.error("Failed to fetch event:", err);
        toast.error("Failed to load event data. Please try again.");
      }
    };

    fetchEventData();
  }, [eventId]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      if (errors[field]) {
        setErrors((prevErrors) => ({ ...prevErrors, [field]: "" }));
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleDayChange = (day) => {
    setFormData((prev) => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(day)
        ? prev.recurringDays.filter((d) => d !== day)
        : [...prev.recurringDays, day],
    }));
  };

  const handleAddPriceTier = () => {
    setPriceTiers((prev) => [
      ...prev,
      { name: "", price: "", ageGroup: "", memberType: "", paymentMethod: "" },
    ]);
  };

  const handlePriceTierChange = (index, field, value) => {
    setPriceTiers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      setFormData((prev) => ({
        ...prev,
        "priceTiers": updated,
      }));
      return updated;
    });

  };

  const handleRemovePriceTier = (index) => {
    setPriceTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      eventType: selectedEventTypeObj?.name || selectedEventType || "",
      eventName: "",
      email: "",
      date: "",
      time: "",
      timePeriod: "AM",
      recurringDays: [],
      location: "",
      eventLeader: "",
      eventLeaderEmail: "",
      description: "",
      leader1: "",
      leader12: "",
    });
    setPriceTiers([]);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.eventType) newErrors.eventType = "Event type is required";
    if (!formData.eventName) newErrors.eventName = "Event name is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.eventLeader)
      newErrors.eventLeader = "Event leader is required";
    if (!formData.description)
      newErrors.description = "Description is required";
    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.time) newErrors.time = "Time is required";

    if (!isGlobalEvent) {
      if (hasPersonSteps && formData.recurringDays.length === 0) {
        newErrors.recurringDays = "Select at least one recurring day";
      }

      if (isTicketedEvent) {
        if (priceTiers.length === 0) {
          newErrors.priceTiers =
            "Add at least one price tier for ticketed events";
        } else {
          priceTiers.forEach((tier, index) => {
            if (!tier.name)
              newErrors[`tier_${index}_name`] = "Price name is required";
            if (
              tier.price === "" ||
              isNaN(Number(tier.price)) ||
              Number(tier.price) < 0
            )
              newErrors[`tier_${index}_price`] = "Valid price is required";
            if (!tier.ageGroup)
              newErrors[`tier_${index}_ageGroup`] = "Age group is required";
            if (!tier.memberType)
              newErrors[`tier_${index}_memberType`] = "Member type is required";
            if (!tier.paymentMethod)
              newErrors[`tier_${index}_paymentMethod`] =
                "Payment method is required";
          });
        }
      }

      if (hasPersonSteps) {
        const leaderDepth = [
          formData.leader1,
          formData.leader12,
          formData.leader144,
        ].filter(Boolean).length;
        getAllHierarchyLevels().forEach((h, idx) => {
          if (autoPopulatedFields.has(h.field)) return;
          if (formData[h.field]) return;
          if (idx >= leaderDepth && leaderDepth > 0) return;
          newErrors[h.field] = `${h.label} is required`;
        });
      }
    } else {
      if (!formData.date) newErrors.date = "Date is required";
      if (!formData.time) newErrors.time = "Time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getDayFromDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[date.getDay()];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return setTimeout(() => {
        formAlert.current.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }

    setIsSubmitting(true);

    try {
      let eventTypeToSend =
        selectedEventTypeObj?.name ||
        selectedEventType ||
        formData.eventType ||
        "";
      if (
        eventTypeToSend === "all" ||
        eventTypeToSend.toLowerCase() === "all cells"
      ) {
        eventTypeToSend = "CELLS";
      }

      if (!eventTypeToSend) {
        toast.error("Event type is required");
        setIsSubmitting(false);
        return;
      }

      console.log("Creating event with type:", eventTypeToSend);

      let dayValue = "";

      if (!formData.recurringDays || formData.recurringDays.length === 0) {
        dayValue = formData.date ? getDayFromDate(formData.date) : "";
      } else if (formData.recurringDays.length === 1) {
        dayValue = formData.recurringDays[0];
      } else {
        dayValue = "Recurring";
      }

      const payload = {
        UUID: generateUUID(),
        eventTypeName: formData.eventType,
        eventName: formData.eventName,
        isTicketed: !!isTicketedEvent,
        isGlobal: !!isGlobalEvent,
        hasPersonSteps: !!hasPersonSteps,
        location: formData.location,
        eventLeader: formData.eventLeader,
        eventLeaderName: formData.eventLeader,
        eventLeaderEmail: formData.eventLeaderEmail || "",
        description: formData.description,
        userEmail: user?.email || "",
        recurring_day: formData.recurringDays,
        day: dayValue,
        status: "open",
        leader1: formData.leader1 || "",
        leader12: formData.leader12 || "",
        isRecurring: isRecurring,
        recurringDays: isRecurring ? formData.recurringDays : [],
      };

      if (formData.date && formData.time) {
        const [hoursStr, minutesStr] = formData.time.split(":");
        let hours = Number(hoursStr);
        const minutes = Number(minutesStr);
        if (formData.timePeriod === "PM" && hours !== 12) hours += 12;
        if (formData.timePeriod === "AM" && hours === 12) hours = 0;

        payload.date = `${formData.date}T${hours
          .toString()
          .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
        payload.time = `${hours
          .toString()
          .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }

      if (isTicketedEvent) {
        if (priceTiers.length > 0) {
          payload.priceTiers = priceTiers.map((tier) => ({
            name: tier.name || "",
            price: parseFloat(tier.price) || 0,
            ageGroup: tier.ageGroup || "",
            memberType: tier.memberType || "",
            paymentMethod: tier.paymentMethod || "",
          }));
        } else {
          payload.priceTiers = [];
        }
      } else {
        payload.priceTiers = [];
      }

      if (hasPersonSteps && !isGlobalEvent) {
        payload.leader1 = formData.leader1 || "";
        payload.leader12 = formData.leader12 || "";
      }

      console.log("Final Payload:", payload);

      const token = localStorage.getItem("access_token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
        "Content-Type": "application/json",
      };
      const response = eventId ?
        await authFetch(`${BACKEND_URL}/events/${eventId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData)
        })
        : await axios.post(
          `${BACKEND_URL.replace(/\/$/, "")}/events`,
          payload,
          { headers },
        );

      console.log("Response:", response.data);

      toast.success(
        eventId ? "Event updated successfully!" : "Event created successfully!",
      );

      if (!eventId) resetForm();

      setTimeout(() => {
        if (isModal && onClose) {
          onClose(true);
        } else {
          navigate("/events", {
            state: {
              refresh: true,
              timestamp: Date.now(),
            },
          });
        }
      }, 1200);
    } catch (err) {
      console.error("Error:", err);
      console.error("Response:", err?.response?.data);

      let errorMsg = "Failed to submit event";

      if (err?.response?.data) {
        const errorData = err.response.data;

        if (Array.isArray(errorData.detail)) {
          errorMsg =
            "Validation errors: " +
            errorData.detail
              .map((errorObj) => {
                if (errorObj.msg) return errorObj.msg;
                if (errorObj.loc && errorObj.msg)
                  return `${errorObj.loc.join(".")}: ${errorObj.msg}`;
                return JSON.stringify(errorObj);
              })
              .join(", ");
        } else if (errorData.detail && typeof errorData.detail === "object") {
          errorMsg = errorData.detail.msg || JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMsg = errorData.message;
        } else if (errorData.detail) {
          errorMsg = errorData.detail;
        }
      } else if (err?.message) {
        errorMsg = err.message;
      }

      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerStyle = isModal
    ? {
      padding: "0",
      minHeight: "auto",
      backgroundColor: "transparent",
      width: "100%",
      height: "100%",
      maxHeight: "none",
      overflowY: "auto",
    }
    : {
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      bgcolor: isDarkMode ? "#121212" : "#f5f5f5",
      px: 2,
    };

  const cardStyle = isModal
    ? {
      width: "100%",
      height: "100%",
      padding: "1.5rem",
      borderRadius: 0,
      boxShadow: "none",
      backgroundColor: "transparent",
      maxHeight: "none",
      overflow: "visible",
    }
    : {
      width: { xs: "100%", sm: "85%", md: "700px" },
      p: 5,
      borderRadius: "20px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    };

  const darkModeStyles = {
    textField: {
      "& .MuiOutlinedInput-root": {
        bgcolor: isDarkMode ? theme.palette.background.paper : "#fff",
        color: theme.palette.text.primary,
        "& fieldset": {
          borderColor: isDarkMode
            ? theme.palette.divider
            : "rgba(0, 0, 0, 0.23)",
        },
        "&:hover fieldset": {
          borderColor: isDarkMode
            ? theme.palette.primary.light
            : "rgba(0, 0, 0, 0.87)",
        },
        "&.Mui-focused fieldset": {
          borderColor: theme.palette.primary.main,
          boxShadow: `0 0 0 3px ${theme.palette.primary.main}22`,
        },
        "& input": {
          color: theme.palette.text.primary,
          WebkitTextFillColor: theme.palette.text.primary,
        },
        "& textarea": {
          color: theme.palette.text.primary,
        },
      },

      "& .MuiInputAdornment-root .MuiSvgIcon-root": {
        color: isDarkMode ? "#fff" : theme.palette.text.secondary,
      },

      "& .MuiInputLabel-root": {
        color: theme.palette.text.secondary,
        "&.Mui-focused": {
          color: theme.palette.primary.main,
        },
        "&.MuiInputLabel-shrink": {
          color: theme.palette.text.secondary,
        },
      },
      "& .MuiFormHelperText-root": {
        color: theme.palette.text.secondary,
        "&.Mui-error": {
          color: theme.palette.error.main,
        },
      },
    },

    autocomplete: {
      "& .MuiOutlinedInput-root": {
        bgcolor: isDarkMode ? theme.palette.background.paper : "#fff",
        color: theme.palette.text.primary,
        "& fieldset": {
          borderColor: isDarkMode
            ? theme.palette.divider
            : "rgba(0, 0, 0, 0.23)",
        },
        "&:hover fieldset": {
          borderColor: isDarkMode
            ? theme.palette.primary.light
            : "rgba(0, 0, 0, 0.87)",
        },
        "&.Mui-focused fieldset": {
          borderColor: theme.palette.primary.main,
        },
      },
      "& .MuiAutocomplete-input": {
        color: theme.palette.text.primary,
      },
      "& .MuiInputLabel-root": {
        color: theme.palette.text.secondary,
      },
    },

    formControlLabel: {
      "& .MuiFormControlLabel-label": {
        color: theme.palette.text.primary,
        fontSize: "0.95rem",
        fontWeight: 500,
      },
      "& .MuiCheckbox-root": {
        color: theme.palette.text.secondary,
        "&.Mui-checked": {
          color: theme.palette.primary.main,
        },
      },
    },

    button: {
      contained: {
        bgcolor: isDarkMode ? "#194c99ff" : theme.palette.primary.dark,
        color: "#fff",
        "&:hover": {
          bgcolor: isDarkMode ? "#2f6bbeff" : theme.palette.primary.main,
        },
      },

      outlined: {
        borderColor: theme.palette.divider,
        color: theme.palette.text.primary,
        "&:hover": {
          borderColor: theme.palette.primary.dark,
          bgcolor: theme.palette.action.hover,
        },
      },
    },

    errorText: {
      color: theme.palette.error.main,
    },

    card: {
      bgcolor: isDarkMode ? theme.palette.background.paper : "#fff",
      border: `1px solid ${theme.palette.divider}`,
    },

    sectionTitle: {
      color: theme.palette.text.primary,
    },

    helperText: {
      color: theme.palette.text.secondary,
    },

    daysContainer: {
      "& .MuiFormControlLabel-root": {
        margin: 0,
        "& .MuiFormControlLabel-label": {
          color: theme.palette.text.primary,
          fontSize: "0.95rem",
          fontWeight: 500,
        },
      },
    },
  };

  return (
    <Box sx={containerStyle}>
      <Card
        sx={{
          ...cardStyle,
          ...(isDarkMode && !isModal
            ? {
              bgcolor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
            }
            : {}),
        }}
      >
        <CardContent
          sx={{
            padding: isModal ? "0" : "1rem",
            "&:last-child": { paddingBottom: isModal ? "0" : "1rem" },
          }}
        >
          {!isModal && (
            <Typography
              variant="h4"
              fontWeight="bold"
              textAlign="center"
              mb={4}
              sx={{
                color: isDarkMode ? "#ffffff" : theme.palette.primary.main,
              }}
            >
              {eventId ? "Edit Event" : "Create New Event"}
            </Typography>
          )}
          {Object.keys(errors).length !== 0 && (
            <Alert
              ref={formAlert}
              sx={{
                marginBottom: "20px",
              }}
              severity="error"
            >
              Please fill In all required fields
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {selectedEventType || selectedEventTypeObj ? (
              <TextField
                label="Event Type"
                value={formData.eventType || ""}
                fullWidth
                size="small"
                sx={{ mb: 3, ...darkModeStyles.textField }}
                InputProps={{ readOnly: true }}
                helperText="Event type is pre-selected"
              />
            ) : (
              <TextField
                select
                label="Event Type *"
                value={formData.eventType || ""}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  const selectedObj = eventTypes.find((et) => et.name === selectedName);
                  setFormData((prev) => ({ ...prev, eventType: selectedName }));
                  if (selectedObj) {
                    setEventTypeFlags({
                      isGlobal: !!selectedObj.isGlobal,
                      isTicketed: !!selectedObj.isTicketed,
                      hasPersonSteps: !!selectedObj.hasPersonSteps,
                    });
                  }
                }}
                fullWidth
                size="small"
                sx={{ mb: 3, ...darkModeStyles.textField }}
                error={!!errors.eventType}
                helperText={errors.eventType}
              >
                {eventTypes.map((et) => (
                  <MenuItem key={et.id} value={et.name}>
                    {et.name}
                  </MenuItem>
                ))}
                {formData.eventType && !eventTypes.find((et) => et.name === formData.eventType) && (
                  <MenuItem key="__current__" value={formData.eventType} sx={{ display: "none" }}>
                    {formData.eventType}
                  </MenuItem>
                )}
              </TextField>
            )}
            <TextField
              label="Event Name *"
              value={formData.eventName}
              onChange={(e) => handleChange("eventName", e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 3, ...darkModeStyles.textField }}
              error={!!errors.eventName}
              helperText={errors.eventName}
            />

            {isTicketedEvent && (
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" sx={darkModeStyles.sectionTitle}>
                    Price Tiers *
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={handleAddPriceTier}
                    variant="contained"
                    size="small"
                  >
                    Add Price Tier
                  </Button>
                </Box>
                {errors.priceTiers && (
                  <Typography
                    variant="caption"
                    sx={{
                      ...darkModeStyles.errorText,
                      mb: 1,
                      display: "block",
                    }}
                  >
                    {errors.priceTiers}
                  </Typography>
                )}

                {priceTiers.map((tier, index) => (
                  <Card
                    key={index}
                    sx={{
                      mb: 2,
                      p: 2,
                      ...darkModeStyles.card,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        sx={{ color: isDarkMode ? "#ffffff" : "#000000" }}
                      >
                        Price Tier {index + 1}
                      </Typography>
                      {priceTiers.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemovePriceTier(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <TextField
                      label="Price Name *"
                      value={tier.name}
                      onChange={(e) => {
                        handlePriceTierChange(index, "name", e.target.value);
                      }

                      }
                      fullWidth
                      size="small"
                      sx={{ mb: 2, ...darkModeStyles.textField }}
                      error={!!errors[`tier_${index}_name`]}
                      helperText={errors[`tier_${index}_name`]}
                    />

                    <TextField
                      label="Price (R) *"
                      type="number"
                      value={tier.price}
                      onChange={(e) =>
                        handlePriceTierChange(index, "price", e.target.value)
                      }
                      fullWidth
                      size="small"
                      inputProps={{ min: 0, step: "0.01" }}
                      sx={{ mb: 2, ...darkModeStyles.textField }}
                      error={!!errors[`tier_${index}_price`]}
                      helperText={errors[`tier_${index}_price`]}
                    />

                    <TextField
                      label="Age Group *"
                      value={tier.ageGroup}
                      onChange={(e) =>
                        handlePriceTierChange(index, "ageGroup", e.target.value)
                      }
                      fullWidth
                      size="small"
                      sx={{ mb: 2, ...darkModeStyles.textField }}
                      error={!!errors[`tier_${index}_ageGroup`]}
                      helperText={errors[`tier_${index}_ageGroup`]}
                    />

                    <TextField
                      label="Member Type *"
                      value={tier.memberType}
                      onChange={(e) =>
                        handlePriceTierChange(
                          index,
                          "memberType",
                          e.target.value,
                        )
                      }
                      fullWidth
                      size="small"
                      sx={{ mb: 2, ...darkModeStyles.textField }}
                      error={!!errors[`tier_${index}_memberType`]}
                      helperText={errors[`tier_${index}_memberType`]}
                    />

                    <TextField
                      label="Payment Method *"
                      value={tier.paymentMethod}
                      onChange={(e) =>
                        handlePriceTierChange(
                          index,
                          "paymentMethod",
                          e.target.value,
                        )
                      }
                      fullWidth
                      size="small"
                      sx={{ ...darkModeStyles.textField }}
                      error={!!errors[`tier_${index}_paymentMethod`]}
                      helperText={errors[`tier_${index}_paymentMethod`]}
                    />
                  </Card>
                ))}
              </Box>
            )}

            <Box
              display="flex"
              gap={2}
              flexDirection={{ xs: "column", sm: "row" }}
              mb={3}
            >
              <TextField
                label="Date *"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                error={!!errors.date}
                helperText={errors.date}
                sx={darkModeStyles.textField}
              />
              <TextField
                label="Time *"
                type="time"
                value={formData.time}
                onChange={(e) => handleChange("time", e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
                error={!!errors.time}
                helperText={errors.time}
                sx={darkModeStyles.textField}
              />
            </Box>

            <Box mb={3}>
              <Typography
                fontWeight="bold"
                mb={1}
                sx={darkModeStyles.sectionTitle}
              >
                Is Recurring?{" "}
                {hasPersonSteps && !isGlobalEvent && (
                  <span style={{ color: "red" }}>*</span>
                )}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRecurring}
                    onChange={handleIsRecurringChange}
                  />
                }
                label="Yes"
              />

              <Typography
                fontWeight="bold"
                mb={1}
                sx={darkModeStyles.sectionTitle}
              >
                Recurring Days{" "}
                {hasPersonSteps && !isGlobalEvent && (
                  <span style={{ color: "red" }}>*</span>
                )}
              </Typography>
              <Box
                display="flex"
                flexWrap="wrap"
                gap={2}
                sx={darkModeStyles.daysContainer}
              >
                {days.map((day) => (
                  <FormControlLabel
                    key={day}
                    control={
                      <Checkbox
                        checked={formData.recurringDays.includes(day)}
                        onChange={() => handleDayChange(day)}
                        disabled={!isRecurring}
                      />
                    }
                    label={day}
                  />
                ))}
              </Box>
              {errors.recurringDays && (
                <Typography variant="caption" sx={darkModeStyles.errorText}>
                  {errors.recurringDays}
                </Typography>
              )}
            </Box>

            <Autocomplete
              freeSolo
              fullWidth
              options={locationOptions}
              value={selectedLocation}
              inputValue={formData.location}
              onInputChange={(event, newInputValue) => {
                handleChange("location", newInputValue);
                setSelectedLocation(null);
              }}
              onChange={(event, newValue) => {
                const formatted =
                  typeof newValue === "string"
                    ? newValue
                    : newValue?.formatted || newValue?.label || "";
                setSelectedLocation(
                  typeof newValue === "string" ? null : newValue,
                );
                handleChange("location", formatted);
              }}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.label || ""
              }
              filterOptions={(x) => x}
              loading={locationLoading}
              PopperComponent={SameWidthPopper}
              ListboxProps={{ sx: darkModeStyles.autocompleteListbox }}
              PaperComponent={({ children }) => (
                <Paper
                  sx={{
                    width: "100%",
                    bgcolor: isDarkMode ? theme.palette.background.paper : "#fff",
                    border: `1px solid ${isDarkMode ? theme.palette.divider : "#ccc"}`,
                  }}
                >
                  {children}
                </Paper>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Location *"
                  fullWidth
                  size="small"
                  sx={{ mb: 3, ...darkModeStyles.textField }}
                  error={!!errors.location}
                  helperText={
                    errors.location ||
                    locationError ||
                    (GEOAPIFY_API_KEY
                      ? "Start typing a South African location..."
                      : "Missing Geoapify API key.")
                  }
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOnIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {locationLoading ? (
                          <CircularProgress color="inherit" size={18} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li
                  {...props}
                  key={`${option.lon ?? ""}-${option.lat ?? ""}-${option.label}`}
                >
                  <Box>
                    <Typography variant="body1">{option.label}</Typography>
                    {(option.suburb ||
                      option.city ||
                      option.state ||
                      option.postcode) && (
                        <Typography variant="caption" color="text.secondary">
                          {[
                            option.suburb,
                            option.city,
                            option.state,
                            option.postcode,
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </Typography>
                      )}
                  </Box>
                </li>
              )}
            />
            <Box sx={{ mb: 3, position: "relative" }}>
              <TextField
                label="Event Leader *"
                value={formData.eventLeader}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChange("eventLeader", value);
                  setPeopleData([]);
                  if (autoPopulatedFields.size > 0) {
                    setAutoPopulatedFields(new Set());
                  }
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  if (value.trim().length >= 2) {
                    searchDebounceRef.current = setTimeout(() => {
                      fetchPeople(value);
                    }, 300);
                  }
                }}
                onFocus={() => {
                  if (formData.eventLeader.length >= 2) {
                    fetchPeople(formData.eventLeader);
                  }
                }}
                onBlur={() => {
                  if (!isSelectingFromDropdown.current) {
                    setTimeout(() => {
                      if (!isSelectingFromDropdown.current) {
                        setPeopleData([]);
                      }
                    }, 200);
                  }
                }}
                fullWidth
                size="small"
                sx={darkModeStyles.textField}
                error={!!errors.eventLeader}
                helperText={
                  errors.eventLeader ||
                  (isSearchingPeople
                    ? "Searching..."
                    : "Type at least 2 characters to search")
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Type name and surname to search..."
                autoComplete="off"
              />

              {/* Dropdown results */}
              {peopleData.length > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 20000,
                    backgroundColor: isDarkMode
                      ? theme.palette.background.paper
                      : "#fff",
                    border: `1px solid ${isDarkMode ? theme.palette.divider : "#ccc"}`,
                    borderRadius: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    maxHeight: "200px",
                    overflowY: "auto",
                    mt: 0.5,
                  }}
                >
                  {peopleData.map((person) => (
                    <Box
                      key={person.id || `${person.fullName}-${person.email}`}
                      sx={{
                        padding: "12px",
                        borderBottom: `1px solid ${isDarkMode ? theme.palette.divider : "#f0f0f0"}`,
                        "&:hover": {
                          backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#f5f5f5",
                        },
                        "&:last-child": { borderBottom: "none" },
                        opacity: person.isDifferentOrg ? 0.5 : 1,
                        cursor: person.isDifferentOrg ? "not-allowed" : "pointer",
                      }}
                      onMouseDown={() => {
                        if (person.isDifferentOrg) return;
                        isSelectingFromDropdown.current = true;
                      }}
                      onMouseUp={() => {
                        if (person.isDifferentOrg) return;
                        isSelectingFromDropdown.current = false;
                        const selectedName = person.fullName;
                        const selectedEmail = person.email;

                        if (hasPersonSteps && !isGlobalEvent) {
                          const populated = new Set(Object.keys(person.leaderValues || {}));
                          setAutoPopulatedFields(populated);

                          setFormData((prev) => ({
                            ...prev,
                            eventLeader: selectedName,
                            eventName: selectedName,
                            eventLeaderEmail: selectedEmail.toLowerCase(),
                            email: selectedEmail.toLowerCase(),
                            ...(person.leaderValues || {}),
                          }));
                        } else {
                          setAutoPopulatedFields(new Set());
                          setFormData((prev) => ({
                            ...prev,
                            eventLeader: selectedName,
                            eventLeaderEmail: selectedEmail.toLowerCase(),
                          }));
                        }
                        setPeopleData([]);
                      }}
                    >
                      <Typography variant="body1" fontWeight="500">
                        {person.fullName}
                        {person.isDifferentOrg && (
                          <span style={{ color: "red", fontSize: "0.75rem", marginLeft: 8 }}>
                            Different organisation — cannot select
                          </span>
                        )}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                        {person.email}
                        {person.leader1 && ` • L@1: ${person.leader1}`}
                        {person.leader12 && ` • L@12: ${person.leader12}`}
                        {person.leader144 && ` • L@144: ${person.leader144}`}
                        {person.org && ` • Org: ${person.org}`}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {hasPersonSteps && !isGlobalEvent && (
              <>
                <TextField
                  label="Email *"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 2, ...darkModeStyles.textField }}
                  error={!!errors.email}
                  helperText={errors.email || "Enter the email for this event"}
                />

                {getAllHierarchyLevels().map((h) => {
                  const isAutoFilled = autoPopulatedFields.has(h.field) && !!formData[h.field];
                  return (
                    <TextField
                      key={h.field}
                      label={isAutoFilled ? h.label : `${h.label} *`}
                      value={formData[h.field] || ""}
                      onChange={(e) => !isAutoFilled && handleChange(h.field, e.target.value)}
                      fullWidth
                      size="small"
                      sx={{
                        mb: 2,
                        ...darkModeStyles.textField,
                        ...(isAutoFilled && {
                          "& .MuiOutlinedInput-root": {
                            ...darkModeStyles.textField["& .MuiOutlinedInput-root"],
                            bgcolor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                          },
                        }),
                      }}
                      InputProps={{
                        readOnly: isAutoFilled,
                        endAdornment: isAutoFilled ? (
                          <InputAdornment position="end">
                            <Typography variant="caption" sx={{ color: "success.main", fontSize: "0.7rem", whiteSpace: "nowrap" }}>
                              Auto-filled
                            </Typography>
                          </InputAdornment>
                        ) : undefined,
                      }}
                      error={!!errors[h.field]}
                      helperText={
                        errors[h.field] ||
                        (isAutoFilled
                          ? `Auto-filled from ${formData.eventLeader}`
                          : `Enter the ${h.label} for this event`)
                      }
                    />
                  );
                })}
              </>
            )}
            <Box sx={{ mb: 3, display: "flex", gap: 1, flexWrap: "wrap" }}>
              {isTicketedEvent && (
                <Chip label="Ticketed Event" color="warning" size="small" />
              )}
              {isGlobalEvent && null}
              {hasPersonSteps && !isGlobalEvent && (
                <Chip
                  label="Personal Steps Event"
                  color="secondary"
                  size="small"
                />
              )}
            </Box>

            <TextField
              label="Description *"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
              sx={{ mb: 3, ...darkModeStyles.textField }}
              error={!!errors.description}
              helperText={errors.description}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DescriptionIcon />
                  </InputAdornment>
                ),
              }}
            />

            <Box display="flex" gap={2} sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  if (isModal && typeof onClose === "function") {
                    onClose();
                  } else {
                    navigate("/events");
                  }
                }}
                sx={darkModeStyles.button.outlined}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                sx={{
                  ...darkModeStyles.button.contained,
                }}
              >
                {isSubmitting
                  ? eventId
                    ? "Updating..."
                    : "Creating..."
                  : eventId
                    ? "Update Event"
                    : "Create Event"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateEvents;