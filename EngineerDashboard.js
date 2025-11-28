import React, { useState, useEffect, useRef } from "react";
import { Animated,Dimensions,FlatList,Modal, View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Picker } from '@react-native-picker/picker';
import { Ionicons,FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

const API_BASE = "https://activ-io.com/Crm/engineer-tracker/";
const Tab = createBottomTabNavigator();


function DashboardTab({ user }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [supportMode, setSupportMode] = useState("");
  const [note, setNote] = useState("");

  const [checkedInClient, setCheckedInClient] = useState(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [checkins, setCheckins] = useState([]);

  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

const API_BASE = "https://activ-io.com/Crm/engineer-tracker/";

  // ================================
  // FETCH CUSTOMERS
  // ================================
  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE}get-customers.php?t=${Date.now()}`);
      if (res.data?.status === "success") setCustomers(res.data.data);
    } catch (e) {
      console.log("❌ Customer Fetch Error:", e);
    }
  };

  // ================================
  // FETCH CHECKINS
  // ================================
  const fetchCheckins = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}checkins-list.php?user_id=${user.id}&t=${Date.now()}`
      );
      setCheckins(res.data.data?.reverse() || []);
    } catch (e) {
      console.log("❌ Checkin Fetch Error:", e);
    }
  };

  // ================================
  // GET LOCATION
  // ================================
  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Enable location access.");
      return null;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    const address = await Location.reverseGeocodeAsync({ latitude, longitude });
    let locationText = "Unknown Location";

    if (address && address.length > 0) {
      const a = address[0];
      locationText = `${a.name || ""} ${a.street || ""}, ${a.city || ""}, ${a.region || ""}, ${a.country || ""}`;
    }

    setCurrentLocation({ latitude, longitude });
    return { latitude, longitude, location_text: locationText };
  };

  // ================================
  // TIMER FUNCTIONS
  // ================================
  const startTimer = async () => {
    // Clear previous interval
    if (timerRef.current) clearInterval(timerRef.current);

    // Read start time from AsyncStorage
    const savedStart = await AsyncStorage.getItem("checkin_start_time");
    if (!savedStart) return;

    const startTime = parseInt(savedStart);

    timerRef.current = setInterval(() => {
      const diffSeconds = Math.floor((Date.now() - startTime) / 1000);
      setTimer(diffSeconds);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(0);
    setCheckedInClient(null);
  };

  // ================================
  // CHECK-IN
  // ================================
  const handleCheckIn = async () => {
    if (checkInLoading) return;
    setCheckInLoading(true);

    if (!selectedCustomer || !serviceType || !supportMode) {
      setCheckInLoading(false);
      return Alert.alert("Please fill all fields");
    }

    const loc = await getLocation();
    if (!loc) {
      setCheckInLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}checkin.php`, {
        user_id: user.id,
        name: user.name,
        client: selectedCustomer,
        service_type: serviceType,
        support_mode: supportMode,
        note,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_text: loc.location_text,
      });

      if (res.data.status === "success") {
        Alert.alert("Successful","Checked In Successfully");

        // Save check-in data in AsyncStorage
        await AsyncStorage.setItem("checkin_start_time", Date.now().toString());
        await AsyncStorage.setItem("checked_in_client", selectedCustomer);

        setCheckedInClient(selectedCustomer);
        startTimer();
        fetchCheckins();
      } else {
        Alert.alert("Failed","Check-in failed");
      }
    } catch (err) {
      Alert.alert("Error","Network error");
    }

    setCheckInLoading(false);
  };

  // ================================
  // CHECK-OUT
  // ================================
  const handleCheckOut = async () => {
    if (checkOutLoading) return;
    setCheckOutLoading(true);

    const loc = await getLocation();
    if (!loc) {
      setCheckOutLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}checkout.php`, {
        user_id: user.id,
        client: checkedInClient,
        name: user.name,
        service_type: serviceType,
        support_mode: supportMode,
        note,
        latitude: loc.latitude,
        longitude: loc.longitude,
        location_text: loc.location_text,
      });

      if (res.data.status === "success") {
        Alert.alert("Successful","Checked Out Successfully");

        // Clear AsyncStorage
        await AsyncStorage.removeItem("checkin_start_time");
        await AsyncStorage.removeItem("checked_in_client");

        stopTimer();
        fetchCheckins();
      } else {
        Alert.alert("Failed","Check-out failed");
      }
    } catch (err) {
      Alert.alert("Error","Network error");
    }

    setCheckOutLoading(false);
  };

  // ================================
  // RESTORE TIMER ON LOAD
  // ================================
  useEffect(() => {
    const restoreTimer = async () => {
      const savedClient = await AsyncStorage.getItem("checked_in_client");
      const savedStart = await AsyncStorage.getItem("checkin_start_time");

      if (savedClient && savedStart) {
        setCheckedInClient(savedClient);
        const diffSeconds = Math.floor((Date.now() - parseInt(savedStart)) / 1000);
        setTimer(diffSeconds);
        startTimer();
      }
    };

    restoreTimer();
    fetchCustomers();
    fetchCheckins();
    getLocation();

    return () => clearInterval(timerRef.current);
  }, []);

  // ================================
  // UI
  // ================================
  return (
    <ScrollView style={{ padding: 16 }}>
      {!checkedInClient && (
        <View style={styles.card}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedCustomer}
              onValueChange={(val) => setSelectedCustomer(val)}
              style={styles.picker}
            >
              <Picker.Item label="Select Customer" value="" />
              {customers.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.name} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Service Type</Text>
          <View style={styles.row}>
            {["Ticket", "Project", "Documentation", "PM", "Presales"].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.option, serviceType === t && styles.optionSelected]}
                onPress={() => setServiceType(t)}
              >
                <Text style={{ color: serviceType === t ? "#fff" : "#ccc" }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Support Mode</Text>
          <View style={styles.row}>
            {["Remote", "Onsite"].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.option, supportMode === m && styles.optionSelected]}
                onPress={() => setSupportMode(m)}
              >
                <Text style={{ color: supportMode === m ? "#fff" : "#ccc" }}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Note (optional)"
            placeholderTextColor="#aaa"
            value={note}
            onChangeText={setNote}
            style={styles.input}
          />
        </View>
      )}

      {checkedInClient && (
        <Text style={styles.timerText}>
          Active: {checkedInClient} | {Math.floor(timer / 60)}m {timer % 60}s
        </Text>
      )}

      <TouchableOpacity
        disabled={checkInLoading || checkOutLoading}
        onPress={checkedInClient ? handleCheckOut : handleCheckIn}
        style={[
          styles.button,
          {
            backgroundColor:
              checkInLoading || checkOutLoading ? "#bdc3c7" : checkedInClient ? "#e74c3c" : "#9b59b6",
          },
        ]}
      >
        <Text style={styles.buttonText}>
          {checkInLoading
            ? "Checking In..."
            : checkOutLoading
            ? "Checking Out..."
            : checkedInClient
            ? "Check Out"
            : "Check In"}
        </Text>
      </TouchableOpacity>

      {currentLocation && (
        <View style={[styles.card, { height: 250, marginTop: 16 }]}>
          <MapView
            style={{ flex: 1, borderRadius: 12 }}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
          >
            {checkins.map((c) => (
              <Marker
                key={c.id}
                coordinate={{
                  latitude: parseFloat(c.latitude),
                  longitude: parseFloat(c.longitude),
                }}
                title={c.client}
                description={`${c.service_type} | ${c.support_mode}`}
              />
            ))}
          </MapView>
        </View>
      )}
    </ScrollView>
  );
}


// ----- History Tab -----
function HistoryTab({ user }) {
  console.log(" HISTORY TAB USER:", user);

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  // Fetch history
  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}checkins-list.php`, {
        params: { user_id: user.id, t: Date.now() },
      });

      console.log("API Response:", res.data);

      setHistory(res.data.data || []);
    } catch (err) {
      console.log("History fetch error:", err);
    }
    setLoading(false);
  };

  // Wait until user exists (NO LOG SPAM)
  useEffect(() => {
    if (!user || !user.id) return; // stay silent until user arrives
    fetchHistory();
  }, [user]);

  // Auto refresh every 20 sec after user is loaded
  useEffect(() => {
    if (!user || !user.id) return;
    const interval = setInterval(fetchHistory, 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Still waiting for user? (first few ms after login)
  if (!user || !user.id) {
    return (
      <ActivityIndicator
        size="large"
        color="#9b59b6"
        style={{ marginTop: 80 }}
      />
    );
  }

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color="#9b59b6"
        style={{ marginTop: 80 }}
      />
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No history found</Text>
      </View>
    );
  }

return (
  <FlatList
    data={history}
    keyExtractor={(item) => item.id.toString()}
    contentContainerStyle={{ padding: 16 }}
    renderItem={({ item }) => {
      const checkIn = new Date(item.check_in_time);
      const checkOut = item.check_out_time ? new Date(item.check_out_time) : new Date();
      const diffSeconds = Math.floor((checkOut - checkIn) / 1000);
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;
      const totalTime = `${hours}h ${minutes}m ${seconds}s`;

      return (
        <View
          style={{
            backgroundColor: "#fff",
            padding: 16,
            borderRadius: 16,
            marginBottom: 15,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          {/* Top Row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#2c3e50" }}>
              {item.client}
            </Text>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: item.type === "in" ? "#27ae60" : "#c0392b",
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                {item.type.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Service Details */}
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 14, color: "#7f8c8d" }}>
              Service: <Text style={{ color: "#2c3e50" }}>{item.service_type}</Text>
            </Text>

            <Text style={{ fontSize: 14, color: "#7f8c8d" }}>
              Mode: <Text style={{ color: "#2c3e50" }}>{item.support_mode}</Text>
            </Text>
          </View>

          {/* Location + Time Box */}
          <View
            style={{
              backgroundColor: "#f9f9f9",
              padding: 12,
              borderRadius: 12,
            }}
          >
            {/* Location Row */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Ionicons name="location-sharp" size={18} color="#e74c3c" />
              <Text style={{ fontSize: 14, color: "#2c3e50", marginLeft: 6 }}>
                {item.location_text && item.location_text.trim() !== ""
                  ? item.location_text
                  : "Location not available"}
              </Text>
            </View>

            {/* Check-in Time */}
            <Text style={{ fontSize: 13, color: "#34495e" }}>
              ⏱️ <Text style={{ fontWeight: "600" }}>Check-In:</Text> {item.check_in_time}
            </Text>

            {/* Check-out Time */}
            <Text style={{ fontSize: 13, color: "#34495e", marginTop: 4 }}>
              🏁 <Text style={{ fontWeight: "600" }}>Check-Out:</Text>{" "}
              {item.check_out_time || "—"}
            </Text>

            {/* Total Time */}
            <Text style={{ fontSize: 13, color: "#34495e", marginTop: 4 }}>
              ⏳ <Text style={{ fontWeight: "600" }}>Total Time:</Text> {totalTime}
            </Text>
          </View>
        </View>
      );
    }}
  />
);



}


function RequestsTab({ user }) {
 const [requestModal, setRequestModal] = useState(false);
  const [customerModal, setCustomerModal] = useState(false);
  const [breakModal, setBreakModal] = useState(false);
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
 const PANEL_WIDTH = Dimensions.get("window").width * 0.75;
const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;



   const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState(null);

   const fetchCustomers = async () => {
    setLoadingCustomers(true);
    setCustomerError(null);
    try {
      const res = await fetch(
        "https://activ-io.com/Crm/engineer-tracker/get-customers.php",
        { cache: "no-store" }
      );
      const data = await res.json();
      setCustomers(data?.data || []);
    } catch (err) {
      setCustomerError("Failed to fetch customers");
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const openCustomerModal = () => {
    fetchCustomers(); // Always refresh list when modal opens
    setCustomerModal(true);
  };


  // ----- DATE / TIME STATES ----
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date"); 
  const [activePicker, setActivePicker] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());

  const [totalHours, setTotalHours] = useState("00:00");

  const serviceTypes = ["Maintenance", "Support", "Installation"];
  const supportModes = ["Remote", "On-site", "Hybrid"];

  const [serviceType, setServiceType] = useState("");
  const [supportMode, setSupportMode] = useState("");
  const [note, setNote] = useState("");



const [breakStart, setBreakStart] = useState(null);
const [breakEnd, setBreakEnd] = useState(null);
const [breakTemp, setBreakTemp] = useState(new Date());
const [breakPickerMode, setBreakPickerMode] = useState("date");
const [showBreakPicker, setShowBreakPicker] = useState(false);

const [breakNote, setBreakNote] = useState("");
const [breakHours, setBreakHours] = useState("00:00");
const [activeBreakPicker, setActiveBreakPicker] = useState(null);


const [breakType, setBreakType] = useState("rest");

const openSidePanel = () => {
  setSidePanelVisible(true);
  Animated.timing(slideAnim, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  }).start();
};

const closeSidePanel = () => {
  Animated.timing(slideAnim, {
    toValue: 400,
    duration: 300,
    useNativeDriver: true,
  }).start(() => setSidePanelVisible(false));
};

const [myRequests, setMyRequests] = useState([]);




  // -------------------------
  // CALCULATE TOTAL HOURS
  // -------------------------




 useEffect(() => {
    if (startDate && endDate) {
      const diffMs = endDate - startDate;
      if (diffMs <= 0) return setTotalHours("00:00");

      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      setTotalHours(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);
    } else {
      setTotalHours("00:00");
    }
  }, [startDate, endDate]);

  // ---------------- CALCULATE BREAK HOURS ----------------
  useEffect(() => {
    if (breakStart && breakEnd) {
      const diffMs = breakEnd - breakStart;
      if (diffMs > 0) {
        const totalMinutes = Math.floor(diffMs / 60000);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        setBreakHours(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      } else setBreakHours("00:00");
    }
  }, [breakStart, breakEnd]);

  // ---------------- HELPER ----------------
  const formatLocalForDb = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 19).replace("T", " ");
  };




const loadMyRequests = async () => {
  if (!user?.id) {
    console.warn("User ID is missing!");
    return;
  }

  try {
    // Clear previous requests
    setMyRequests([]);

    const res = await fetch(
      `https://activ-io.com/Crm/engineer-tracker/my-requests.php?user_id=${user.id}`,
      {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    // Parse JSON directly
    const data = await res.json();

    if (data.status === "success") {
      setMyRequests(data.data || []);
      console.log("Loaded requests:", data.data);
    } else {
      console.warn("Failed to load requests:", data.message);
      setMyRequests([]);
    }
  } catch (err) {
    console.error("Failed to load requests:", err);
    setMyRequests([]);
  }
};


  // -------------------------------------------------------------------
  // DATE/TIME PICKER CONTROLS
  // -------------------------------------------------------------------


 const openStartPicker = () => {
    setActivePicker("start");
    setPickerMode("date");
    setTempDate(startDate || new Date());
    setShowPicker(true);
  };

  const openEndPicker = () => {
    setActivePicker("end");
    setPickerMode("date");
    setTempDate(endDate || new Date());
    setShowPicker(true);
  };

  const onPickerChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }
    if (!selectedDate) return;

    if (pickerMode === "date") {
      setTempDate(selectedDate);
      setPickerMode("time");
      return;
    }

    const finalDate = new Date(tempDate);
    finalDate.setHours(selectedDate.getHours());
    finalDate.setMinutes(selectedDate.getMinutes());

    if (activePicker === "start") setStartDate(finalDate);
    else setEndDate(finalDate);

    setShowPicker(false);
    setPickerMode("date");
    setActivePicker(null);
  };

  const openBreakStartPicker = () => {
    setActiveBreakPicker("start");
    setBreakPickerMode("date");
    setBreakTemp(breakStart || new Date());
    setShowBreakPicker(true);
  };

  const openBreakEndPicker = () => {
    setActiveBreakPicker("end");
    setBreakPickerMode("date");
    setBreakTemp(breakEnd || new Date());
    setShowBreakPicker(true);
  };

  const onBreakPickerChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      setShowBreakPicker(false);
      setActiveBreakPicker(null);
      return;
    }

    const picked = selectedDate || breakTemp;

    if (breakPickerMode === "date") {
      setBreakTemp(picked);
      setBreakPickerMode("time");
      return;
    }

    const finalDate = new Date(breakTemp);
    finalDate.setHours(picked.getHours());
    finalDate.setMinutes(picked.getMinutes());

    if (activeBreakPicker === "start") setBreakStart(finalDate);
    else setBreakEnd(finalDate);

    setShowBreakPicker(false);
    setBreakPickerMode("date");
    setActiveBreakPicker(null);
  };



const submitShift = async () => {
  if (!selectedCustomer || !startDate || !endDate || !serviceType || !supportMode) {
    Alert.alert("Error", "Please fill all fields");
    return;
  }



  try {
    const payload = {
      user_id: user?.id,
        customer: selectedCustomer?.id,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      hours: totalHours,
      service_type: serviceType,
      support_mode: supportMode,
      note: note,
      status: "pending"
    };

    const response = await fetch("https://activ-io.com/Crm/engineer-tracker/add-shift.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status === "success") {
      Alert.alert("Success", "Request sent for admin approval");
      setRequestModal(false);
    } else {
      Alert.alert("Error", data.message || "Something went wrong");
    }
  } catch (err) {
    Alert.alert("Error", "Server error");
  }
};


const submitBreak = async () => {
  if (!breakStart || !breakEnd) {
    Alert.alert("Error", "Please select break start and end time");
    return;
  }

  if (!breakType) {
    Alert.alert("Error", "Please select break type");
    return;
  }

  const payload = {
    user_id: user?.id,
    start: formatLocalForDb(breakStart),
    end: formatLocalForDb(breakEnd),
    total_hm: breakHours,   
    type: breakType,
    note: breakNote,
    status: "pending",
  };

  console.log("SENDING PAYLOAD:", payload);

  try {
    const response = await fetch(
      "https://activ-io.com/Crm/engineer-tracker/break-request.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const raw = await response.text();
    console.log("RAW SERVER:", raw);

    const data = JSON.parse(raw);

    if (data.status === "success") {
      Alert.alert("Success", "Break request submitted");
      setBreakModal(false);
    } else {
      Alert.alert("Error", data.message || "Something went wrong");
    }
  } catch (err) {
    Alert.alert("Error", "Server error");
  }
};





const breakTypes = [
  { label: "Rest Break", value: "rest" },
  { label: "Lunch Break", value: "lunch" },
  { label: "Unpaid Break", value: "unpaid" },
  { label: "Prayer Break", value: "prayer" },
  { label: "Other", value: "other" }
];




  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* ADD SHIFT BUTTON */}
      <TouchableOpacity
        style={styles.addShiftButton}
        onPress={() => setRequestModal(true)}
      >
        <Ionicons name="add-circle-outline" size={26} color="#fff" />
        <Text style={styles.addShiftText}>Add a Shift request</Text>
      </TouchableOpacity>

      {/* SHIFT REQUEST MODAL */}
      <Modal visible={requestModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#111" }}>
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.modalHeading}>Create Shift Request</Text>

           {/* CUSTOMER DROPDOWN */}
            <Text style={styles.label}>Customer</Text>
            <TouchableOpacity style={styles.dropdownBox} onPress={openCustomerModal}>
              <Text style={{ color: selectedCustomer ? "#fff" : "#777" }}>
                {selectedCustomer?.name || "Select Customer"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>

            {/* CUSTOMER LIST MODAL */}
            <Modal visible={customerModal} transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={styles.modalBox}>
                  <Text style={styles.modalTitle}>Select Customer</Text>

                  {loadingCustomers && <Text style={{ color: "#aaa" }}>Loading...</Text>}
                  {customerError && <Text style={{ color: "red" }}>{customerError}</Text>}

                  <FlatList
                    data={customers}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.modalItem}
                        onPress={() => {
                          setSelectedCustomer({ id: parseInt(item.id), name: item.name });
                          setCustomerModal(false);
                        }}
                      >
                        <Text style={styles.modalItemText}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                  />

                  <TouchableOpacity onPress={() => setCustomerModal(false)} style={styles.closeBtn}>
                    <Text style={{ color: "#fff" }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* START / END */}
            <View style={styles.timeRow}>
              <TouchableOpacity style={styles.timeBox} onPress={openStartPicker}>
                <Text style={styles.label}>Start</Text>
                <Text style={styles.dateText}>
                  {startDate ? startDate.toLocaleDateString() : "Select date"}
                </Text>
                <Text style={styles.timeText}>
                  {startDate
                    ? startDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Select time"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.timeBox} onPress={openEndPicker}>
                <Text style={styles.label}>End</Text>
                <Text style={styles.dateText}>
                  {endDate ? endDate.toLocaleDateString() : "Select date"}
                </Text>
                <Text style={styles.timeText}>
                  {endDate
                    ? endDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Select time"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* DATETIME PICKER */}
            {showPicker && (
              <DateTimePicker
                value={tempDate}
                mode={pickerMode}
                onChange={onPickerChange}
              />
            )}

            {/* TOTAL HOURS CARD */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Hours</Text>
              <Text style={styles.totalValue}>{totalHours}</Text>
            </View>

            {/* SERVICE TYPE */}
            <Text style={styles.label}>Service Type</Text>
            <View style={styles.row}>
              {serviceTypes.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.option,
                    serviceType === t && styles.optionSelected,
                  ]}
                  onPress={() => setServiceType(t)}
                >
                  <Text
                    style={{
                      color: serviceType === t ? "#fff" : "#999",
                      fontSize: 14,
                    }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SUPPORT MODE */}
            <Text style={styles.label}>Support Mode</Text>
            <View style={styles.row}>
              {supportModes.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.option,
                    supportMode === m && styles.optionSelected,
                  ]}
                  onPress={() => setSupportMode(m)}
                >
                  <Text
                    style={{
                      color: supportMode === m ? "#fff" : "#999",
                    }}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* NOTE */}
            <Text style={styles.label}>Note</Text>
            <TextInput
              placeholder="Attach a note to your request"
              placeholderTextColor="#777"
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              multiline
            />

            {/* SUBMIT BUTTON */}
           <TouchableOpacity style={styles.submitButton} onPress={submitShift}>
  <Text style={styles.submitButtonText}>Send for Approval</Text>
</TouchableOpacity>


            <Text style={styles.approvalNote}>
              All requests will be sent for a manager's approval
            </Text>

            {/* CLOSE MODAL */}
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setRequestModal(false)}
            >
              <Text style={{ color: "#fff", fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
   


  <TouchableOpacity
  style={styles.addShiftButton}
  onPress={() => setBreakModal(true)}
>
  <FontAwesome5 name="mug-hot" size={26} color="#fff" />
  <Text style={styles.addShiftText}>Add a break request</Text>
</TouchableOpacity>


      <Modal visible={breakModal} animationType="slide">
  <View style={{ flex: 1, backgroundColor: "#111" }}>
    <ScrollView style={{ padding: 20 }}>

      <Text style={styles.modalHeading}>Break Request</Text>

<View style={{ marginBottom: 12 }}>
  <Text style={{ fontWeight: "600", marginBottom: 6 }}>Break Type</Text>

  <Picker
    selectedValue={breakType}
    onValueChange={(value) => setBreakType(value)}
    style={{ backgroundColor: "#eee", borderRadius: 8 }}
  >
    {breakTypes.map((item) => (
      <Picker.Item key={item.value} label={item.label} value={item.value} />
    ))}
  </Picker>
</View>



      {/* START / END */}
      <View style={styles.timeRow}>
        <TouchableOpacity style={styles.timeBox} onPress={openBreakStartPicker}>
          <Text style={styles.label}>Starts</Text>
          <Text style={styles.dateText}>
            {breakStart ? breakStart.toLocaleDateString() : "Select date"}
          </Text>
          <Text style={styles.timeText}>
            {breakStart
              ? breakStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Select time"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.timeBox} onPress={openBreakEndPicker}>
          <Text style={styles.label}>Ends</Text>
          <Text style={styles.dateText}>
            {breakEnd ? breakEnd.toLocaleDateString() : "Select date"}
          </Text>
          <Text style={styles.timeText}>
            {breakEnd
              ? breakEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Select time"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* DATETIME PICKER */}
      {showBreakPicker && (
        <DateTimePicker
  value={breakTemp}
  mode={breakPickerMode}
  onChange={onBreakPickerChange}
/>

      )}

      {/* TOTAL HOURS CARD */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Break</Text>
        <Text style={styles.totalValue}>{breakHours}</Text>
      </View>

      {/* NOTE */}
      <Text style={styles.label}>Note</Text>
      <TextInput
        placeholder="Attach a note to your request"
        placeholderTextColor="#777"
        style={styles.noteInput}
        value={breakNote}
        onChangeText={setBreakNote}
        multiline
      />

<TouchableOpacity 
  style={styles.submitButton} 
  onPress={submitBreak}   // or submitShift
>
  <Text style={styles.submitButtonText}>Send for Approval</Text>
</TouchableOpacity>

      

      <Text style={styles.approvalNote}>
        All requests will be sent for a manager's approval
      </Text>

      {/* CLOSE MODAL */}
      <TouchableOpacity
        style={styles.closeModalBtn}
        onPress={() => setBreakModal(false)}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>Close</Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
</Modal>

      <TouchableOpacity
  style={{
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#9b59b6",
    padding: 14,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    elevation: 5
  }}
onPress={async () => {
  await loadMyRequests();
  openSidePanel();
}}

>
  <Ionicons name="list-circle-outline" size={24} color="#fff" />
  <Text style={{ color: "#fff", marginLeft: 8, fontSize: 14 }}>Your Requests</Text>
</TouchableOpacity>

{sidePanelVisible && (
  <Animated.View
    style={{
      position: "absolute",
      top: 0,
      right: 0,
      height: "100%",
      width: "75%",
      backgroundColor: "#222",
      padding: 20,
      transform: [{ translateX: slideAnim }],
      elevation: 10
    }}
  >
    <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", marginBottom: 20, }}>
      Your Requests
    </Text>

    <ScrollView>
      {myRequests.length === 0 ? (
        <Text style={{ color: "#aaa" }}>No requests yet.</Text>
      ) : (
        myRequests.map((req, index) => (
          <View
            key={index}
            style={{
              backgroundColor: "#333",
              padding: 12,
              borderRadius: 10,
              marginBottom: 12
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
  {req.request_type === "shift" ? "Shift Request" : "Break Request"}
</Text>

<Text style={{ color: "#aaa" }}>
  Start: {req.start_datetime || req.start}
</Text>

<Text style={{ color: "#aaa" }}>
  End: {req.end_datetime || req.end}
</Text>

<Text style={{ color: "#aaa" }}>
  Hours: {req.total_hours || req.total_hm || "00:00"}
</Text>

<Text style={{ color: "#aaa" }}>
  Status: {req.status}
</Text>

          </View>
        ))
      )}
    </ScrollView>

    <TouchableOpacity
      onPress={closeSidePanel}
      style={{
        marginTop: 20,
        padding: 12,
        backgroundColor: "#444",
        borderRadius: 10,
        alignItems: "center"
      }}
    >
      <Text style={{ color: "#fff" }}>Close</Text>
    </TouchableOpacity>
  </Animated.View>
)}

    </View>
    
  );
}



// ----- Logout function -----
const handleLogout = async (navigation) => {
  Alert.alert("Logout", "Are you sure you want to logout?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Logout",
      style: "destructive",
      onPress: async () => {
        await AsyncStorage.removeItem("user");
        navigation.replace("Login");
      },
    },
  ]);
};

// ----- Main EngineerDashboard with Bottom Tabs -----
export default function EngineerDashboard({ navigation }) {
  const [user, setUser] = useState(null);
  const insets = useSafeAreaInsets();

useEffect(() => {
  const init = async () => {
    const raw = await AsyncStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : null;
    console.log("Logged-in user:", u);  // check user.id
    if (!u) return navigation.replace("Login");
    setUser(u);
  };
  init();
}, []);



  if (!user) return <ActivityIndicator size="large" color="#ff6ec7" style={{ flex: 1 }} />;

  return (
<Tab.Navigator
  screenOptions={({ route }) => ({
    headerStyle: { backgroundColor: "#9b59b6" },
    headerTintColor: "#fff",
    tabBarStyle: {
      backgroundColor: "#fff",
      height: 60 + insets.bottom,
      paddingBottom: 8 + insets.bottom,
    },
    headerRight: () => (
      <TouchableOpacity onPress={() => handleLogout(navigation)} style={{ marginRight: 16 }}>
        <Ionicons name="log-out-outline" size={24} color="#ff6ec7" />
      </TouchableOpacity>
    ),
    tabBarActiveTintColor: "#9b59b6",
    tabBarInactiveTintColor: "#555",

  
    tabBarIcon: ({ color, size }) => {
      let iconName = "home-outline";

      if (route.name === "Dashboard") iconName = "home-outline";
      else if (route.name === "History") iconName = "time-outline";
      else if (route.name === "Requests") iconName = "list-circle-outline"; 

      return <Ionicons name={iconName} size={size} color={color} style={{ marginBottom: 4 }} />;
    },
  })}
>

  <Tab.Screen name="Dashboard">
    {() => <DashboardTab user={user} />}
  </Tab.Screen>

<Tab.Screen 
  name="History" 
  children={() => <HistoryTab user={user} />} 
/>


  <Tab.Screen name="Requests">
    {() => <RequestsTab user={user} />}
  </Tab.Screen>

</Tab.Navigator>


  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#3f2a5a", padding: 16, borderRadius: 12, marginBottom: 12 },
  cardTitle: { color: "#ff6ec7", fontWeight: "700", fontSize: 16 },
  cardText: { color: "#fff", marginTop: 2 },
  input: { borderBottomWidth: 1, borderBottomColor: "#ff6ec7", color: "#fff", paddingVertical: 8, fontSize: 16 },
  button: { padding: 12, borderRadius: 12, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  label: { color: "#fff", marginTop: 10, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap" },
  option: { borderWidth: 1, borderColor: "#ff6ec7", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 6 },
  optionSelected: { backgroundColor: "#ff6ec7" },
  timerText: { color: "#fff", textAlign: "center", marginVertical: 12, fontWeight: "600" },
   addShiftButton: {
    backgroundColor: "#9b59b6",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  addShiftText: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 10,
  },

  modalHeading: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 20,
    fontWeight: "600",
  },

  dropdownBox: {
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  label: {
    color: "#aaa",
    marginBottom: 6,
    fontSize: 15,
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeBox: {
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 10,
    width: "48%",
  },
  dateText: {
    color: "#fff",
    fontSize: 16,
  },
  timeText: {
    color: "#ff6ec7",
    fontSize: 16,
    marginTop: 4,
  },

  totalCard: {
    backgroundColor: "#333",
    marginTop: 25,
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 25,
  },
  totalLabel: {
    color: "#ccc",
  },
  totalValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 5,
  },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
 option: {
  paddingVertical: 10,
  paddingHorizontal: 14,
  borderRadius: 8,
  marginRight: 10,
  marginTop: 10,
  borderWidth: 1,
  borderColor: "#ff6ec7",
},
 optionSelected: {
  backgroundColor: "#9b59b6",
  borderWidth: 0,      
  borderColor: "transparent",
},

  noteInput: {
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 10,
    color: "#fff",
    marginBottom: 20,
    minHeight: 80,
  },

  submitButton: {
    backgroundColor: "#9b59b6",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
  },

  approvalNote: {
    color: "#777",
    textAlign: "center",
    marginTop: 10,
  },

  closeModalBtn: {
    backgroundColor: "#ff4444",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "85%",
    backgroundColor: "#222",
    padding: 20,
    borderRadius: 12,
    maxHeight: "70%",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomColor: "#444",
    borderBottomWidth: 1,
  },
  modalItemText: {
    color: "#fff",
  },
  closeBtn: {
    backgroundColor: "#9b59b6",
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
    alignItems: "center",
  },
});
