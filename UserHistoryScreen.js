import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserHistoryScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.text}>User History</Text>
      <Text style={styles.subText}>Here admin can see full user activity logs.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#2d1b4e" },
  text: { fontSize: 22, color: "#fff", fontWeight: "700" },
  subText: { fontSize: 16, color: "#fff", marginTop: 10 },
});
