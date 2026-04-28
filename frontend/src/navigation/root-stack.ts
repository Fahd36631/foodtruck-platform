import type { NavigatorScreenParams } from "@react-navigation/native";
import type { MainTabParamList } from "./main-tabs";

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Auth:
    | {
        initialMode?: "login" | "register";
        redirectTo?: "Checkout";
      }
    | undefined;
  OwnerDashboard: undefined;
  OwnerOnboarding: { flow?: "register" | "update" } | undefined;
  AdminPanel: undefined;
  TruckDetails: {
    truckId: number;
    truckName: string;
  };
  OrderDetails: {
    orderId: number;
  };
  Cart: undefined;
  Checkout: undefined;
  PaymentSuccess: {
    orderId: number;
    paymentStatus: "pending" | "paid";
    paymentMethod: "card" | "apple_pay" | "mada" | "stc_pay";
  };
};
