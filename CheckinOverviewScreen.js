import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";

const API_BASE = "https://activ-io.com/Crm/engineer-tracker/";

export default function CheckinOverviewScreen() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckins = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}checkins-list.php`);
      if (res.data?.data) setCheckins(res.data.data.reverse());
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCheckins(); }, []);

  if (loading) return <ActivityIndicator size="large" color="#ff6ec7" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.screen}>
      {checkins.map(c => (
        <View key={c.id} style={styles.card}>
          <Text style={{ color: "#ff6ec7", fontWeight: "700" }}>{c.name}</Text>
          <Text style={{ color: "#fff" }}>
            {c.client} • {c.type.toUpperCase()} • {c.service_type} • {c.support_mode}
          </Text>
          <Text style={{ color: "#aaa", marginTop: 4 }}>
            {c.check_in_time} {c.check_out_time ? `→ ${c.check_out_time}` : ""}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#2d1b4e", padding: 16 },
  card: { backgroundColor: "#3f2a5a", padding: 16, borderRadius: 12, marginBottom: 12 },
});
