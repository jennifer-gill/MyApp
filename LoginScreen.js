import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const API_BASE = "https://activ-io.com/Crm/engineer-tracker/";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = async () => {
    if (!email || !password) return Alert.alert("Please fill both fields");

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}login.php`,
        { email, password }, 
        { headers: { "Content-Type": "application/json" } } 
      );

      console.log("Login response:", res.data);

      if (res.data?.status === "success") {
        await AsyncStorage.setItem("user", JSON.stringify(res.data.user));

        if (res.data.user.role === "superadmin" || res.data.user.role === "admin") {
          navigation.replace("AdminDashboard");
        } else {
          navigation.replace("EngineerDashboard");
        }
      } else {
        Alert.alert("Error", res.data?.message || "Invalid credentials");
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#6f51ba', '#ff6ec7']} style={styles.container}>
      <Text style={styles.title}>Engineer Tracker</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#fff" style={styles.inputIcon} />
        <TextInput
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.7)"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#fff" style={styles.inputIcon} />
        <TextInput
          placeholder="Password"
          placeholderTextColor="rgba(255,255,255,0.7)"
          style={[styles.input, { flex: 1 }]}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={24}
            color="rgba(255,255,255,0.9)"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={login} disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 50,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 20,
    width: "100%",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    color: "#fff",
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: "#ff6ec7",
    fontWeight: "bold",
    fontSize: 18,
  },
});
