// AdminDashboardWithFeatures.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Switch,
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LineChart } from "react-native-chart-kit";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "https://activ-io.com/Crm/engineer-tracker/";
const Tab = createBottomTabNavigator();
const PAGE_SIZE = 10; // page size for client-side pagination

// ---------------------------
// Theme utils
// ---------------------------
const THEME_KEY = "app_theme"; // stored in AsyncStorage
const useTheme = () => {
  const [theme, setTheme] = useState("dark"); // default dark
  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem(THEME_KEY);
        if (t) setTheme(t);
      } catch (e) {
        console.log("Theme load error", e);
      }
    })();
  }, []);
  const toggle = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      await AsyncStorage.setItem(THEME_KEY, next);
    } catch (e) {
      console.log("Theme save error", e);
    }
  };
  const styles = getStyles(theme === "dark");
  return { theme, toggle, styles, isDark: theme === "dark" };
};

// ---------------------------
// CHECKINS TAB
// ---------------------------
function CheckinsTab({ themeStyles }) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch check-ins
  const fetchCheckins = async () => {
    try {
      if (!refreshing) setLoading(true);
      const res = await axios.get(`${API_BASE}checkins-list.php?nocache=${Date.now()}`);
      setCheckins(res.data.data || []);
    } catch (e) {
      console.log("Checkins fetch error:", e);
      Alert.alert("Error", "Failed to fetch check-ins");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCheckins();
  }, []);

  if (loading) {
    return (
      <ActivityIndicator 
        size="large" 
        color={themeStyles.accent} 
        style={{ marginTop: 50 }} 
      />
    );
  }

const renderItem = ({ item }) => {
  // Calculate total time
  const checkIn = new Date(item.check_in_time);
  const checkOut = item.check_out_time ? new Date(item.check_out_time) : new Date();
  const diffSeconds = Math.floor((checkOut - checkIn) / 1000);
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;
  const totalTime = `${hours}h ${minutes}m ${seconds}s`;

  return (
    <View
      style={[
        themeStyles.card,
        {
          marginBottom: 15,
          padding: 16,
          borderRadius: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 5,
        },
      ]}
    >
      {/* Top Row: Employee/Client Name + Type Badge */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#e9f1efff" }}>
          {item.user_name || item.name || item.client}
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
        <Text style={{ fontSize: 14, color: "#e9f1efff" }}>
          Client: <Text style={{ fontWeight: "600" }}>{item.client}</Text>
        </Text>
        <Text style={{ fontSize: 14, color: "#e9f1efff" }}>
          Service: <Text style={{ fontWeight: "600" }}>{item.service_type}</Text>
        </Text>
        <Text style={{ fontSize: 14, color: "#e9f1efff" }}>
          Mode: <Text style={{ fontWeight: "600" }}>{item.support_mode}</Text>
        </Text>
        {item.note && item.note.trim() !== "" && (
          <Text style={{ fontSize: 14, color: "#e9f1efff", marginTop: 4 }}>
            Note: {item.note}
          </Text>
        )}
      </View>

      {/* Location + Times */}
      <View style={{ backgroundColor: "#f9f9f9", padding: 12, borderRadius: 12 }}>
        {/* Location */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="location-sharp" size={18} color="#e74c3c" />
          <Text style={{ fontSize: 14, color: "#2c3e50", marginLeft: 6 }}>
            {item.location_text && item.location_text.trim() !== ""
              ? item.location_text
              : "Location not available"}
          </Text>
        </View>

        {/* Check-in / Check-out Times */}
        <Text style={{ fontSize: 13, color: "#34495e" }}>
          ⏱️ <Text style={{ fontWeight: "600" }}>Check-In:</Text> {item.check_in_time}
        </Text>
        <Text style={{ fontSize: 13, color: "#34495e", marginTop: 4 }}>
          🏁 <Text style={{ fontWeight: "600" }}>Check-Out:</Text> {item.check_out_time || "—"}
        </Text>

        {/* Total Time */}
        <Text style={{ fontSize: 13, color: "#34495e", marginTop: 4 }}>
          ⏳ <Text style={{ fontWeight: "600" }}>Total Time:</Text> {totalTime}
        </Text>
      </View>
    </View>
  );
};


 return (
  <FlatList
    contentContainerStyle={{ padding: 16 }}
    data={checkins}
    keyExtractor={(item) => String(item.id)}
    renderItem={renderItem}
    refreshControl={
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchCheckins();
        }}
        tintColor={themeStyles.accent}
      />
    }
    ListEmptyComponent={
      <Text style={[themeStyles.smallText, { textAlign: "center", marginTop: 20 }]}>
        No check-ins
      </Text>
    }
  />
);

}

// ---------------------------
// CREATE + CUSTOMER LIST TAB
// ---------------------------
function CustomerTab({ themeStyles, isDark }) {
  const [customerName, setCustomerName] = useState("");
  const [customersAll, setCustomersAll] = useState([]); // full array from API
  const [customersPage, setCustomersPage] = useState([]); // displayed page
  const [page, setPage] = useState(1);
  const [loadingSave, setLoadingSave] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // search & filter
  const [search, setSearch] = useState("");

  // edit modal
  const [editing, setEditing] = useState(null); // {id, name}
  const [editLoading, setEditLoading] = useState(false);

  // delete indicator (id)
  const [deletingId, setDeletingId] = useState(null);

  const fetchCustomers = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API_BASE}get-customers.php?nocache=${Date.now()}`);
      const list = (res.data?.status === "success" && Array.isArray(res.data.data)) ? res.data.data : [];
      setCustomersAll(list);
      setPage(1);
      // init page slice
      setCustomersPage(list.slice(0, PAGE_SIZE));
    } catch (e) {
      console.log("Customers fetch error", e);
      Alert.alert("Error", "Failed to load customers");
      setCustomersAll([]);
      setCustomersPage([]);
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Search filter - recompute displayed page based on search + pagination
  useEffect(() => {
    const filtered = customersAll.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()));
    setPage(1);
    setCustomersPage(filtered.slice(0, PAGE_SIZE));
  }, [search, customersAll]);

  const loadMore = () => {
    const filtered = customersAll.filter((c) => c.name?.toLowerCase().includes(search.toLowerCase()));
    const nextPage = page + 1;
    const start = (nextPage - 1) * PAGE_SIZE;
    const more = filtered.slice(start, start + PAGE_SIZE);
    if (more.length === 0) return;
    setCustomersPage((prev) => [...prev, ...more]);
    setPage(nextPage);
  };

  // Create
  const handleSave = async () => {
    if (!customerName.trim()) return Alert.alert("Please enter a customer name");
    setLoadingSave(true);
    try {
      const res = await axios.post(`${API_BASE}create-customer.php`, { name: customerName }, { headers: { "Content-Type": "application/json" }});
      if (res.data?.status === "success") {
        Alert.alert("Success", "Customer created");
        setCustomerName("");
        fetchCustomers();
      } else {
        Alert.alert("Error", res.data?.message || "Failed to create");
      }
    } catch (e) {
      console.log("Save error", e);
      Alert.alert("Error", "Network error");
    } finally {
      setLoadingSave(false);
    }
  };

  // Edit
  const openEdit = (item) => setEditing({ ...item });
  const handleEditSave = async () => {
    if (!editing?.name?.trim()) return Alert.alert("Enter a name");
    setEditLoading(true);
    try {
      // NOTE: replace update-customer.php if your backend uses different endpoint
      const res = await axios.post(`${API_BASE}update-customer.php`, { id: editing.id, name: editing.name }, { headers: { "Content-Type": "application/json" }});
      if (res.data?.status === "success") {
        Alert.alert("Success", "Customer updated");
        setEditing(null);
        fetchCustomers();
      } else {
        Alert.alert("Error", res.data?.message || "Failed to update");
      }
    } catch (e) {
      console.log("Edit error", e);
      Alert.alert("Error", "Network error");
    } finally {
      setEditLoading(false);
    }
  };

  // Delete
  const handleDelete = (id) => {
    Alert.alert("Delete", "Are you sure you want to delete this customer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setDeletingId(id);
          try {
            // NOTE: replace delete-customer.php if your backend uses different endpoint
            const res = await axios.post(`${API_BASE}delete-customer.php`, { id }, { headers: { "Content-Type": "application/json" }});
            if (res.data?.status === "success") {
              Alert.alert("Deleted");
              fetchCustomers();
            } else {
              Alert.alert("Error", res.data?.message || "Failed to delete");
            }
          } catch (e) {
            console.log("Delete error", e);
            Alert.alert("Error", "Network error");
          } finally {
            setDeletingId(null);
          }
        }
      }
    ]);
  };

  const onRefresh = () => { setRefreshing(true); fetchCustomers(); };

  // displayed list for FlatList
  const displayed = customersPage;

  return (
    <View style={[themeStyles.container]}>
      {/* Create form */}
      <View style={[themeStyles.card, { margin: 16 }]}>
        <Text style={themeStyles.cardTitle}>Create Customer</Text>
        <TextInput
          placeholder="Customer name"
          placeholderTextColor={themeStyles.placeholder}
          value={customerName}
          onChangeText={setCustomerName}
          style={[themeStyles.input, { marginTop: 12 }]}
        />
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          <TouchableOpacity style={[themeStyles.button, { flex: 1 }]} onPress={handleSave} disabled={loadingSave}>
            <Text style={themeStyles.buttonText}>{loadingSave ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[themeStyles.buttonAlt, { marginLeft: 8 }]} onPress={() => { setCustomerName(""); }}>
            <Text style={themeStyles.buttonAltText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16 }}>
        <TextInput
          placeholder="Search customers..."
          placeholderTextColor={themeStyles.placeholder}
          value={search}
          onChangeText={setSearch}
          style={[themeStyles.input, { marginBottom: 12 }]}
        />
      </View>

      {/* List */}
      {fetching ? (
        <ActivityIndicator size="large" color={themeStyles.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={[themeStyles.listItem]}>
              <View style={{ flex: 1 }}>
                <Text style={themeStyles.listTitle}>{item.id}. {item.name}</Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity onPress={() => openEdit(item)} style={{ marginRight: 12 }}>
                  <Ionicons name="pencil-outline" size={22} color={themeStyles.icon} />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  {deletingId === item.id ? <ActivityIndicator size="small" color={themeStyles.accent} /> : <Ionicons name="trash-outline" size={22} color={themeStyles.icon} />}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => <Text style={[themeStyles.smallText, { textAlign: "center", marginTop: 24 }]}>No customers</Text>}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={!!editing} transparent animationType="slide">
        <View style={themeStyles.modalWrap}>
          <View style={themeStyles.modal}>
            <Text style={themeStyles.cardTitle}>Edit Customer</Text>
            <TextInput
              value={editing?.name || ""}
              onChangeText={(t) => setEditing((s) => ({ ...s, name: t }))}
              style={[themeStyles.input, { marginTop: 12 }]}
            />
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <Pressable style={[themeStyles.button, { flex: 1 }]} onPress={handleEditSave} disabled={editLoading}>
                <Text style={themeStyles.buttonText}>{editLoading ? "Saving..." : "Save"}</Text>
              </Pressable>
              <Pressable style={[themeStyles.buttonAlt, { marginLeft: 8 }]} onPress={() => setEditing(null)}>
                <Text style={themeStyles.buttonAltText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------
// APPROVALS TAB (pull-to-refresh)
// ---------------------------
function ApprovalsTab({ themeStyles }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}approvals-list.php?nocache=${Date.now()}`);
      setApprovals(res.data.data || []);
    } catch (e) {
      console.log("Approvals fetch error", e);
      Alert.alert("Error", "Failed to load approvals");
      setApprovals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const approveShift = async (id) => {
    try {
      const res = await axios.post(`${API_BASE}approve-shift.php`, { id, action: "approved" });
      if (res.data.status === "success") {
        Alert.alert("Success", "Shift approved");
        fetchApprovals();
      } else {
        Alert.alert("Error", res.data.message || "Failed to approve");
      }
    } catch (err) {
      Alert.alert("Error", "Server error");
    }
  };

  const rejectShift = async (id) => {
    try {
      const res = await axios.post(`${API_BASE}approve-shift.php`, { id, action: "rejected" });
      if (res.data.status === "success") {
        Alert.alert("Rejected", "Shift rejected");
        fetchApprovals();
      } else {
        Alert.alert("Error", res.data.message || "Failed to reject");
      }
    } catch (err) {
      Alert.alert("Error", "Server error");
    }
  };

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={approvals}
      keyExtractor={(i) => String(i.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchApprovals();
          }}
        />
      }
      renderItem={({ item }) => (
        <View style={[themeStyles.card, { marginBottom: 15 }]}>
          {/* Employee and Client */}
          <Text style={[themeStyles.cardTitle, { fontSize: 16 }]}>
            Employee: {item.employee_name || item.engineer_id}
          </Text>
          <Text style={themeStyles.cardTitle}>
            Client: {item.customer || item.customer_id}
          </Text>

          {/* Shift details */}
          <Text style={themeStyles.cardText}>
            Start: {new Date(item.start_time).toLocaleString()}
          </Text>
          <Text style={themeStyles.cardText}>
            End: {new Date(item.end_time).toLocaleString()}
          </Text>
          <Text style={themeStyles.cardText}>Hours: {item.total_hours}</Text>
          <Text style={themeStyles.cardText}>Service: {item.service_type}</Text>
          <Text style={themeStyles.cardText}>Support Mode: {item.support_mode}</Text>
          <Text style={[themeStyles.cardText, { marginBottom: 10 }]}>
            Note: {item.note || "-"}
          </Text>

          {/* Status Indicator */}
          <Text
            style={{
              marginBottom: 10,
              fontWeight: "bold",
              color:
                item.status === "approved"
                  ? "#2ecc71"
                  : item.status === "rejected"
                  ? "#e74c3c"
                  : "#f1c40f",
            }}
          >
            Status: {item.status.toUpperCase()}
          </Text>

          {/* Show buttons only for pending items */}
          {item.status === "pending" && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#2ecc71",
                  padding: 10,
                  borderRadius: 8,
                }}
                onPress={() => approveShift(item.id)}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: "#e74c3c",
                  padding: 10,
                  borderRadius: 8,
                }}
                onPress={() => rejectShift(item.id)}
              >
                <Text style={{ color: "#fff", textAlign: "center" }}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={
        <Text style={[themeStyles.smallText, { textAlign: "center", marginTop: 20 }]}>
          No approvals
        </Text>
      }
    />
  );
}


// ---------------------------
// WEEKLY ACTIVITY TAB (pull-to-refresh)
// ---------------------------
function EmployeeActivityTab({ themeStyles }) {
  const [chartData, setChartData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}weekly-activity.php?nocache=${Date.now()}`);
      if (res.data?.data) {
        setChartData({
          labels: res.data.data.labels,
          datasets: [{ data: res.data.data.data }],
        });
      }
    } catch (e) {
      console.log("Activity fetch error", e);
      Alert.alert("Error", "Failed to fetch activity");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchActivity(); }, []);

  if (loading) return <ActivityIndicator size="large" color={themeStyles.accent} style={{ marginTop: 50 }} />;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16 }}
      data={[1]} // single item to allow RefreshControl + scrollability
      keyExtractor={() => "chart"}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchActivity(); }} />}
      renderItem={() => (
        <>
          <Text style={[themeStyles.cardTitle, { marginBottom: 10 }]}>Weekly Employee Activity</Text>
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 32}
            height={220}
            chartConfig={{
              backgroundColor: themeStyles.bg,
              backgroundGradientFrom: themeStyles.bg,
              backgroundGradientTo: themeStyles.cardBg,
              decimalPlaces: 0,
              color: (opacity = 1) => `${themeStyles.accentRgb} ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
            }}
            style={{ borderRadius: 16 }}
          />
        </>
      )}
    />
  );
}

// ---------------------------
// LOGOUT
// ---------------------------
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

// ---------------------------
// MAIN DASHBOARD (tabs + theme)
// ---------------------------
export default function AdminDashboard() {
  const { theme, toggle, styles: themeStyles, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Check-ins"
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: themeStyles.navBg },
        headerTintColor: themeStyles.text,
        tabBarActiveTintColor: themeStyles.accent,
        tabBarInactiveTintColor: themeStyles.tabInactive,
        tabBarStyle: { backgroundColor: themeStyles.tabBg },
        tabBarLabelStyle: { fontWeight: "700" },
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 12 }}>
            <Text style={{ color: themeStyles.text, marginRight: 8 }}>{isDark ? "Dark" : "Light"}</Text>
            <Switch value={isDark} onValueChange={toggle} />
            <TouchableOpacity onPress={() => handleLogout(navigation)} style={{ marginLeft: 12 }}>
              <Ionicons name="log-out-outline" size={22} color={themeStyles.accent} />
            </TouchableOpacity>
          </View>
        ),
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Check-ins") iconName = "person-outline";
          else if (route.name === "Customer") iconName = "people-outline";
          else if (route.name === "Approvals") iconName = "checkmark-done-outline";
          else if (route.name === "Weekly Activity") iconName = "bar-chart-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Check-ins">
        {() => <CheckinsTab themeStyles={themeStyles} />}
      </Tab.Screen>

      <Tab.Screen name="Customer">
        {() => <CustomerTab themeStyles={themeStyles} isDark={isDark} />}
      </Tab.Screen>

      <Tab.Screen name="Approvals">
        {() => <ApprovalsTab themeStyles={themeStyles} />}
      </Tab.Screen>

      <Tab.Screen name="Weekly Activity">
        {() => <EmployeeActivityTab themeStyles={themeStyles} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ---------------------------
// Styling factory (dark / light)
// ---------------------------
function getStyles(dark = true) {
  if (dark) {
    const accent = "#ff6ec7";
    return {
      dark: true,
      container: { flex: 1, backgroundColor: "#2d1b4e" },
      navBg: "#2d1b4e",
      tabBg: "#3f2a5a",
      cardBg: "#3f2a5a",
      card: "#3f2a5a",
      bg: "#2d1b4e",
      text: "#fff",
      smallText: { color: "#ddd" },
      placeholder: "#aaa",
      accent,
      accentRgb: "rgba(255,110,199,",
      icon: "#fff",
      cardTitle: { color: accent, fontWeight: "700", fontSize: 16 },
      cardText: { color: "#fff", marginTop: 4 },
      card: { backgroundColor: "#3f2a5a", padding: 16, borderRadius: 12, marginBottom: 12 },
      cardTitle: { color: accent, fontWeight: "700", fontSize: 16 },
      input: { borderBottomWidth: 1, borderBottomColor: accent, color: "#fff", paddingVertical: 8, fontSize: 16 },
      button: { backgroundColor: accent, padding: 12, borderRadius: 12, alignItems: "center" },
      buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
      buttonAlt: { backgroundColor: "#5a3b7a", padding: 12, borderRadius: 12, alignItems: "center" },
      buttonAltText: { color: "#fff", fontWeight: "700" },
      listItem: { backgroundColor: "#3a256a", padding: 14, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: accent },
      listTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
      modalWrap: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
      modal: { width: "90%", backgroundColor: "#241733", padding: 16, borderRadius: 12 },
      smallText: { color: "#ddd" },
      placeholder: "#aaa",
      tabInactive: "#bfb6c7",
    };
  } else {
    const accent = "#007AFF";
    return {
      dark: false,
      container: { flex: 1, backgroundColor: "#fff" },
      navBg: "#fff",
      tabBg: "#f6f6f6",
      cardBg: "#f8f8f8",
      card: "#fff",
      bg: "#fff",
      text: "#111",
      smallText: { color: "#333" },
      placeholder: "#666",
      accent,
      accentRgb: "rgba(0,122,255,",
      icon: "#111",
      cardTitle: { color: accent, fontWeight: "700", fontSize: 16 },
      cardText: { color: "#111", marginTop: 4 },
      card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#eee" },
      cardTitle: { color: accent, fontWeight: "700", fontSize: 16 },
      input: { borderBottomWidth: 1, borderBottomColor: "#ddd", color: "#111", paddingVertical: 8, fontSize: 16 },
      button: { backgroundColor: accent, padding: 12, borderRadius: 12, alignItems: "center" },
      buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
      buttonAlt: { backgroundColor: "#e6e6e6", padding: 12, borderRadius: 12, alignItems: "center" },
      buttonAltText: { color: "#111", fontWeight: "700" },
      listItem: { backgroundColor: "#fff", padding: 14, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: accent },
      listTitle: { color: "#111", fontSize: 16, fontWeight: "600" },
      modalWrap: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.25)" },
      modal: { width: "90%", backgroundColor: "#fff", padding: 16, borderRadius: 12 },
      smallText: { color: "#333" },
      placeholder: "#666",
      tabInactive: "#888",
    };
  }
}
