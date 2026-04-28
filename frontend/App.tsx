import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useState } from "react";
import { I18nManager } from "react-native";
import { SplashScreen } from "./src/screens/auth/splash-screen";
import type { RootStackParamList } from "./src/navigation/root-stack";
import { MainTabs } from "./src/navigation/main-tabs";
import { queryClient } from "./src/api/query-client";
import { TruckDetailsScreen } from "./src/screens/truck/truck-details-screen";
import { OwnerDashboardScreen } from "./src/screens/owner/owner-dashboard-screen";
import { AdminPanelScreen } from "./src/screens/admin/admin-panel-screen";
import { AuthScreen } from "./src/screens/auth/auth-screen";
import { OwnerOnboardingScreen } from "./src/screens/owner/owner-onboarding-screen";
import { CartScreen } from "./src/screens/cart/cart-screen";
import { CheckoutScreen } from "./src/screens/checkout/checkout-screen";
import { PaymentSuccessScreen } from "./src/screens/checkout/payment-success-screen";
import { OrderDetailsScreen } from "./src/screens/orders/order-details-screen";
console.log("ROOT LOADED");
const Stack = createNativeStackNavigator<RootStackParamList>();

I18nManager.allowRTL(true);

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#F5F7FB",
    card: "#FFFFFF",
    text: "#0E1B3D",
    border: "#E1E6EE",
    primary: "#FF6B00"
  }
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  console.log("APP COMPONENT RENDERED");

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {showSplash ? (
          <>
            <StatusBar style="dark" />
            <SplashScreen onContinue={() => setShowSplash(false)} />
          </>
        ) : (
          <NavigationContainer theme={theme}>
            <StatusBar style="dark" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                animationDuration: 240,
                contentStyle: { backgroundColor: "#F5F7FB" }
              }}
            >
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="TruckDetails" component={TruckDetailsScreen} />
              <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
              <Stack.Screen name="Cart" component={CartScreen} />
              <Stack.Screen name="Checkout" component={CheckoutScreen} />
              <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
              <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
              <Stack.Screen name="OwnerOnboarding" component={OwnerOnboardingScreen} />
              <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
