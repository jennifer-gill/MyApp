import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CreateUserScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create User Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#2d1b4e" },
  text: { color: "#ff6ec7", fontSize: 20, fontWeight: "700" },
});
