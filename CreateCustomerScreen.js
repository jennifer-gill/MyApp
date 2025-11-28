import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl
} from "react-native";
import axios from "axios";

const API_BASE = "https://activ-io.com/Crm/engineer-tracker/";

export default function CreateCustomerScreen() {
  const [customerName, setCustomerName] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE}get-customers.php?nocache=${Date.now()}`);

      console.log("API Response =", res.data);

      // API: { status: "success", data: [...] }
      if (res.data?.status === "success" && Array.isArray(res.data.data)) {
        setCustomers(res.data.data);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.log("Fetch Customers Error:", error);
      Alert.alert("Error", "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const saveCustomer = async () => {
    if (!customerName.trim()) {
      return Alert.alert("Error", "Please enter a customer name");
    }

    try {
      setSaveLoading(true);
      const res = await axios.post(
        `${API_BASE}create-customer.php`,
        { name: customerName },
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data?.status === "success") {
        Alert.alert("Success", "Customer added");
        setCustomerName("");
        fetchCustomers();
      } else {
        Alert.alert("Error", res.data?.message || "Failed to save");
      }
    } catch (e) {
      console.log("Save error:", e);
      Alert.alert("Error", "Failed to save customer");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Customer 1</Text>

      <TextInput
        placeholder="Enter customer name"
        placeholderTextColor="#aaa"
        style={styles.input}
        value={customerName}
        onChangeText={setCustomerName}
      />

      <TouchableOpacity
        style={[styles.button, saveLoading && { opacity: 0.7 }]}
        onPress={saveCustomer}
        disabled={saveLoading}
      >
        <Text style={styles.buttonText}>
          {saveLoading ? "Saving..." : "Save Customer"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.listTitle}>
        Customer List ({customers.length})
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#ff6ec7" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchCustomers} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardText}>
                {item.id}. {item.name}
              </Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No customers found</Text>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2d1b4e",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ff6ec7",
    color: "#fff",
    marginBottom: 20,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#ff6ec7",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 25,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  listTitle: {
    color: "#fff",
    fontSize: 20,
    marginBottom: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#3a256a",
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
  },
  cardText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
  },
});
