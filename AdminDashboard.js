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
  ScrollView
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LineChart,PieChart } from "react-native-chart-kit";
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


const CheckinsTab = ({ themeStyles }) => {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch all check-ins
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

  // Get unique employees
  const employees = [...new Map(checkins.map(c => [c.user_id, c])).values()];

// Calculate weekly total time for an employee (Monday to Sunday)
const getWeeklyTotal = (employee) => {
  if (!employee) return "0h 0m 0s";

  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  // Calculate Monday of current week
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  // Calculate Sunday of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const userCheckins = checkins.filter(
    c =>
      c.user_id === employee.user_id &&
      new Date(c.check_in_time) >= monday &&
      new Date(c.check_in_time) <= sunday
  );

  if (userCheckins.length === 0) return "0h 0m 0s";

  const totalSeconds = userCheckins.reduce((acc, item) => {
    const checkIn = new Date(item.check_in_time);
    const checkOut = item.check_out_time ? new Date(item.check_out_time) : new Date();
    return acc + Math.floor((checkOut - checkIn) / 1000);
  }, 0);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
};


  const renderEmployee = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedEmployee(item);
        setModalVisible(true);
      }}
      style={[
        themeStyles.card,
        { marginBottom: 12, padding: 16, borderRadius: 12 }
      ]}
    >
      <Text style={{ fontSize: 18, fontWeight: "600", color: themeStyles.text }}>
        {item.user_name || item.name}
      </Text>
    </TouchableOpacity>
  );

  // Render check-in cards inside modal
const renderCheckinItem = ({ item }) => {
  const checkIn = new Date(item.check_in_time);
  const checkOut = item.check_out_time ? new Date(item.check_out_time) : new Date();
  const diffSeconds = Math.floor((checkOut - checkIn) / 1000);
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;
  const totalTime = `${hours}h ${minutes}m ${seconds}s`;

  // Format day, date, month, year and time
  const formatDate = (date) => {
    const day = date.toLocaleDateString("en-US", { weekday: "short" }); // Mon
    const dateNum = date.getDate(); // 25
    const month = date.toLocaleDateString("en-US", { month: "short" }); // Nov
    const year = date.getFullYear(); // 2025
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return { formattedDate: `${day}, ${dateNum} ${month} ${year}`, time };
  };

  const checkInFormatted = formatDate(checkIn);
  const checkOutFormatted = formatDate(checkOut);

  return (
    <View
      style={{
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#2c3e50", marginBottom: 4 }}>
        Client: {item.client}
      </Text>
      <Text style={{ fontSize: 14, color: "#7f8c8d" }}>
        Service: {item.service_type}
      </Text>
      <Text style={{ fontSize: 14, color: "#7f8c8d" }}>
        Mode: {item.support_mode}
      </Text>
      {item.note && item.note.trim() !== "" && (
        <Text style={{ fontSize: 14, color: "#7f8c8d", marginTop: 4 }}>
          Note: {item.note}
        </Text>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
        <Ionicons name="location-sharp" size={16} color="#e74c3c" />
        <Text style={{ marginLeft: 6, fontSize: 13, color: "#34495e" }}>
          {item.location_text || "Location not available"}
        </Text>
      </View>

      {/* Check-In */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
        <Text style={{ fontSize: 13, marginRight: 6 }}>⏱️ Check-In:</Text>
        <View style={{ backgroundColor: "#dcd6f7", borderRadius: 6, paddingHorizontal: 6, marginRight: 4, marginBottom: 4 }}>
          <Text style={{ fontWeight: "700", color: "#6f51ba" }}>{checkInFormatted.formattedDate}</Text>
        </View>
        <View style={{ backgroundColor: "#f0f0f0", borderRadius: 6, paddingHorizontal: 6, marginBottom: 4 }}>
          <Text style={{ fontWeight: "500", color: "#2c3e50" }}>{checkInFormatted.time}</Text>
        </View>
      </View>

      {/* Check-Out */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
        <Text style={{ fontSize: 13, marginRight: 6 }}>🏁 Check-Out:</Text>
        {item.check_out_time ? (
          <>
            <View style={{ backgroundColor: "#dcd6f7", borderRadius: 6, paddingHorizontal: 6, marginRight: 4, marginBottom: 4 }}>
              <Text style={{ fontWeight: "700", color: "#6f51ba" }}>{checkOutFormatted.formattedDate}</Text>
            </View>
            <View style={{ backgroundColor: "#f0f0f0", borderRadius: 6, paddingHorizontal: 6, marginBottom: 4 }}>
              <Text style={{ fontWeight: "500", color: "#2c3e50" }}>{checkOutFormatted.time}</Text>
            </View>
          </>
        ) : (
          <Text style={{ fontSize: 13, color: "#34495e" }}>—</Text>
        )}
      </View>

      {/* Total Time */}
      <Text style={{ fontSize: 13, color: "#34495e", marginTop: 4 }}>
        ⏳ Total Time: {totalTime}
      </Text>
    </View>
  );
};


  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={employees}
        keyExtractor={(item) => String(item.user_id)}
        renderItem={renderEmployee}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchCheckins(); }}
            tintColor={themeStyles.accent}
          />
        }
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20, color: themeStyles.text }}>
            No employees found
          </Text>
        }
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 16, backgroundColor: themeStyles.bg }}>
 <TouchableOpacity
  onPress={() => setModalVisible(false)}
  style={{ marginBottom: 12, alignSelf: "flex-end" }}
>
  <Ionicons name="close-circle" size={28} color={themeStyles.accent} />
</TouchableOpacity>



          {selectedEmployee && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: themeStyles.text, marginBottom: 8 }}>
                {selectedEmployee.user_name || selectedEmployee.name}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: themeStyles.text, marginBottom: 12 }}>
                Total Weekly Time: {getWeeklyTotal(selectedEmployee)}
              </Text>

              <FlatList
                data={checkins.filter(c => c.user_id === selectedEmployee.user_id)}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderCheckinItem}
                scrollEnabled={false}
              />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};



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
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [shiftsToday, setShiftsToday] = useState(0);

  const [lineData, setLineData] = useState({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
  });
  const [pieData, setPieData] = useState([]);

  const [approvals, setApprovals] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      if (!refreshing) setLoading(true);

      const [empRes, custRes, shiftsRes] = await Promise.all([
        axios.get(`${API_BASE}get-engineers.php?nocache=${Date.now()}`),
        axios.get(`${API_BASE}get-customers.php?nocache=${Date.now()}`),
        axios.get(`${API_BASE}get-today-shifts.php?nocache=${Date.now()}`)
      ]);

      setTotalEmployees(empRes.data.count || 0);
      setTotalCustomers(custRes.data.data?.length || 0);
      setShiftsToday(shiftsRes.data.data?.length || 0);

      const chartRes = await axios.get(`${API_BASE}weekly-activity.php?nocache=${Date.now()}`);
      if (chartRes.data?.data) {
        setLineData({
          labels: chartRes.data.data.labels,
          datasets: [{ data: chartRes.data.data.data }],
        });

        const colors = ["#6f51ba","#8a63d6","#b598f0","#cdb4ff","#e6d9ff","#d1a3ff","#a175d1"];
        setPieData(chartRes.data.data.labels.map((l,i)=>({
          name: l,
          value: chartRes.data.data.data[i],
          color: colors[i],
          legendFontColor: "#333",
          legendFontSize: 12
        })));
      }

      const approvalsRes = await axios.get(`${API_BASE}approvals-list.php?nocache=${Date.now()}`);
      setApprovals(approvalsRes.data.data || []);

      const feedRes = await axios.get(`${API_BASE}activity-feed.php?nocache=${Date.now()}`);
      setActivityFeed(feedRes.data.data || []);

    } catch (e) {
      console.log("Fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <ActivityIndicator size="large" color={themeStyles.accent} style={{ marginTop: 50 }} />;

  const StatCard = ({ title, value, color }) => (
    <View style={{
      flex: 1,
      backgroundColor: color,
      padding: 16,
      borderRadius: 12,
      marginHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 }}>{title}</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>{value}</Text>
    </View>
  );

  return (
    <FlatList
      data={[1]}
      keyExtractor={() => "dashboard"}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true); fetchData();}} />
      }
      renderItem={() => (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* SUMMARY CARDS */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <StatCard title="Total Employees" value={totalEmployees} color="#8e44ad" />
            <StatCard title="Total Customers" value={totalCustomers} color="#9b59b6" />
            <StatCard title="Shifts Today" value={shiftsToday} color="#bb8fce" />
          </View>

          {/* LINE CHART */}
          <Text style={{ ...themeStyles.cardTitle, marginBottom: 10 }}>Weekly Employee Activity</Text>
          <LineChart
            data={lineData}
            width={Dimensions.get("window").width - 32}
            height={220}
            chartConfig={{
              backgroundColor: themeStyles.bg,
              backgroundGradientFrom: themeStyles.bg,
              backgroundGradientTo: themeStyles.cardBg,
              decimalPlaces:0,
              color:(opacity=1)=>`${themeStyles.accentRgb} ${opacity})`,
              labelColor:(opacity=1)=>`rgba(255,255,255,${opacity})`
            }}
            style={{ borderRadius: 16, marginBottom: 16 }}
          />

          {/* PIE CHART */}
          <Text style={{ ...themeStyles.cardTitle, marginBottom: 10 }}>Ticket Type Distribution</Text>
          <PieChart
            data={pieData}
            width={Dimensions.get("window").width - 32}
            height={220}
            chartConfig={{ backgroundColor: themeStyles.bg, color:(opacity=1)=>`rgba(0,0,0,${opacity})` }}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            style={{ marginBottom: 16 }}
          />

          {/* RECENT APPROVALS */}
          <Text style={{ ...themeStyles.cardTitle, marginBottom: 10 }}>Recent Approvals</Text>
          {approvals.length === 0 ? 
            <Text style={{ textAlign: 'center', color: '#7f8c8d' }}>No approvals</Text> :
            approvals.map((a,i)=>(
              <View key={i} style={{ ...themeStyles.card, padding: 12, marginBottom: 8 }}>
                <Text style={{ fontWeight: '700',color: '#fff' }}>{a.employee_name || a.engineer_id}</Text>
                <Text  style={{ color: '#fff' }}>{a.customer || a.customer_id}</Text>
                <Text  style={{ color: '#fff' }}>{new Date(a.start_time).toLocaleString()} - {new Date(a.end_time).toLocaleString()}</Text>
                <Text  style={{ color: '#fff' }}>Hours: {a.total_hours}</Text>
                <Text  style={{ color: '#fff' }}>Status: {a.status}</Text>
              </View>
            ))
          }

          {/* ACTIVITY FEED */}
          <Text style={{ ...themeStyles.cardTitle, marginBottom: 10, marginTop: 16 }}>Activity Feed</Text>
          {activityFeed.length === 0 ? 
            <Text style={{ textAlign: 'center', color: '#e4ebecff' }}>No recent activities</Text> :
            activityFeed.map((a,i)=>(
              <View key={i} style={{ ...themeStyles.card, padding: 12, marginBottom: 8 }}>
                <Text style={{ fontWeight: '700', color: '#fff' }}>{a.title}</Text>
                <Text style={{ fontSize: 12, color: '#fff' }}>{new Date(a.time).toLocaleString()}</Text>
              </View>
            ))
          }
        </ScrollView>
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
