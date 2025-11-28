import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";

const API_BASE = "https://activ-io.com/Crm/engineer-tracker/";

export default function ApprovalScreen() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}approvals-list.php`);
      if (res.data?.data) setApprovals(res.data.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.post(`${API_BASE}approve-reject.php`, { id, action });
      fetchApprovals();
    } catch (e) { console.log(e); }
  };

  useEffect(() => { fetchApprovals(); }, []);

  if (loading) return <ActivityIndicator size="large" color="#ff6ec7" style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.screen}>
      {approvals.map((a) => (
        <View key={a.id} style={styles.card}>
          <Text style={{ color: "#ff6ec7", fontWeight: "700" }}>{a.name}</Text>
          <Text style={{ color: "#fff" }}>{a.detail}</Text>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(a.id, 'approve')}>
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(a.id, 'reject')}>
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#2d1b4e", padding: 16 },
  card: { backgroundColor: "#3f2a5a", padding: 16, borderRadius: 12, marginBottom: 12 },
  approveBtn: { backgroundColor: "#4caf50", padding: 8, borderRadius: 8, marginRight: 8 },
  rejectBtn: { backgroundColor: "#f44336", padding: 8, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
});
