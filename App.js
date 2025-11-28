import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./screens/LoginScreen";
import AdminDashboard from "./screens/AdminDashboard";
import CreateUserScreen from "./screens/CreateUserScreen";
import CreateCustomerScreen from "./screens/CreateCustomerScreen";
import ApprovalScreen from "./screens/ApprovalScreen";
import EngineerDashboard from "./screens/EngineerDashboard";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="EngineerDashboard" component={EngineerDashboard} />
          <Stack.Screen name="CreateUser" component={CreateUserScreen} />
          <Stack.Screen name="CreateCustomer" component={CreateCustomerScreen} />
          <Stack.Screen name="Approval" component={ApprovalScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
