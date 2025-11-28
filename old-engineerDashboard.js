import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const API_BASE = "https://activ-io.com/Crm/engineer-tracker/";

export default function EngineerDashboard({ navigation }) {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [supportMode, setSupportMode] = useState("");
  const [note, setNote] = useState("");
  const [checkedInClient, setCheckedInClient] = useState(null);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await Location.getCurrentPositionAsync({});
    setCurrentLocation(loc.coords);
    return loc.coords;
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(0);
    setCheckedInClient(null);
  };

  const fetchCheckins = async () => {
    try {
      const res = await axios.get(`${API_BASE}checkins-list.php?user_id=${user.id}`);
      if (res.data?.data) setCheckins(res.data.data.reverse());
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!client || !serviceType || !supportMode || !note)
      return Alert.alert("Please complete all fields");
    const loc = await getLocation();
    if (!loc) return Alert.alert("Location permission required");
    const res = await axios.post(`${API_BASE}checkin.php`, {
      user_id: user.id,
      name: user.name,
      client,
      service_type: serviceType,
      support_mode: supportMode,
      note,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    if (res.data.status === "success") {
      Alert.alert("Checked In Successfully");
      setCheckedInClient(client);
      startTimer();
      fetchCheckins();
    } else Alert.alert("Check-in failed");
  };

  const handleCheckOut = async () => {
    if (!checkedInClient) return Alert.alert("No active check-in");
    const loc = await getLocation();
    const res = await axios.post(`${API_BASE}checkout.php`, {
      user_id: user.id,
      client: checkedInClient,
      service_type: serviceType,
      support_mode: supportMode,
      note,
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    if (res.data.status === "success") {
      Alert.alert("Checked Out Successfully");
      stopTimer();
      fetchCheckins();
    } else Alert.alert("Check-out failed");
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("user");
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  useEffect(() => {
    const init = async () => {
      const raw = await AsyncStorage.getItem("user");
      const u = raw ? JSON.parse(raw) : null;
      if (!u) return navigation.replace("Login");
      setUser(u);
      await fetchCheckins();
      await getLocation();
    };
    init();
    return () => clearInterval(timerRef.current);
  }, []);

  if (loading || !user)
    return (
      <SafeAreaView style={styles.screen}>
        <ActivityIndicator size="large" color="#ff6ec7" />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={{ padding: 16 }}>
        <View style={styles.header}>
          <Text style={styles.h2}>Welcome, {user.name}</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {!checkedInClient && (
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Client Name"
              placeholderTextColor="#aaa"
              value={client}
              onChangeText={setClient}
            />

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
              style={styles.input}
              placeholder="Note"
              placeholderTextColor="#aaa"
              value={note}
              onChangeText={setNote}
            />
          </View>
        )}

        {checkedInClient && (
          <Text style={styles.timerText}>
            Active: {checkedInClient} | {Math.floor(timer / 60)}m {timer % 60}s
          </Text>
        )}

        <TouchableOpacity
          onPress={checkedInClient ? handleCheckOut : handleCheckIn}
          style={[styles.button, { backgroundColor: checkedInClient ? "#e74c3c" : "#9b59b6" }]}
        >
          <Text style={styles.buttonText}>{checkedInClient ? "Check Out" : "Check In"}</Text>
        </TouchableOpacity>

        {currentLocation && (
          <View style={[styles.card, { height: 250, marginTop: 16 }]}>
            <MapView
              style={{ flex: 1 }}
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
                  coordinate={{ latitude: parseFloat(c.latitude), longitude: parseFloat(c.longitude) }}
                  title={`${c.client}`}
                  description={`${c.service_type} | ${c.support_mode}`}
                />
              ))}
            </MapView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#2d1b4e", paddingTop: Platform.OS === "android" ? 25 : 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  h2: { fontSize: 22, fontWeight: "700", color: "#fff" },
  card: { backgroundColor: "#3f2a5a", padding: 16, borderRadius: 16, marginBottom: 16 },
  input: { color: "#fff", borderBottomWidth: 1, borderBottomColor: "#ff6ec7", marginVertical: 8, paddingVertical: 6 },
  label: { color: "#fff", marginTop: 10, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap" },
  option: { borderWidth: 1, borderColor: "#ff6ec7", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 6 },
  optionSelected: { backgroundColor: "#ff6ec7" },
  timerText: { color: "#fff", textAlign: "center", marginVertical: 12, fontWeight: "600" },
  button: { marginTop: 16, height: 48, borderRadius: 25, justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
