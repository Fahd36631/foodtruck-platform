import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { HomeScreen } from "@/screens/home/home-screen";
import { CustomerMapScreen } from "@/screens/home/customer-map-screen";
import { OrdersScreen } from "@/screens/orders/orders-screen";
import { ProfileScreen } from "@/screens/auth/profile-screen";
import { OwnerOverviewScreen } from "@/screens/owner/owner-overview-screen";
import { OwnerIncomingOrdersScreen } from "@/screens/owner/owner-incoming-orders-screen";
import { AdminPanelScreen } from "@/screens/admin/admin-panel-screen";
import { useAuthStore } from "@/store/auth-store";
import { colors, shadows } from "@/theme/tokens";

export type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Orders: undefined;
  Profile: undefined;
  OwnerOverview: undefined;
  OwnerIncomingOrders: undefined;
  AdminOverview: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabs = () => {
  const roleCode = useAuthStore((s) => s.user?.roleCode);

  const commonScreenOptions = ({ route }: { route: { name: string } }) => ({
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      height: 78,
      paddingBottom: 12,
      paddingTop: 8,
      ...shadows.tabBar
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarLabelStyle: {
      fontWeight: "700" as const,
      fontSize: 12
    },
    tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
      const iconNameByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
        Home: focused ? "home" : "home-outline",
        Map: focused ? "map" : "map-outline",
        Orders: focused ? "receipt" : "receipt-outline",
        Profile: focused ? "person-circle" : "person-circle-outline",
        OwnerOverview: focused ? "speedometer" : "speedometer-outline",
        OwnerIncomingOrders: focused ? "list" : "list-outline",
        AdminOverview: focused ? "shield-checkmark" : "shield-checkmark-outline"
      };

      return <Ionicons name={iconNameByRoute[route.name] ?? "ellipse-outline"} size={size} color={color} />;
    }
  });

  if (roleCode === "truck_owner") {
    return (
      <Tab.Navigator screenOptions={commonScreenOptions} initialRouteName="OwnerOverview">
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "حسابي" }} />
        <Tab.Screen name="OwnerIncomingOrders" component={OwnerIncomingOrdersScreen} options={{ tabBarLabel: "طلبات الوارد" }} />
        <Tab.Screen name="OwnerOverview" component={OwnerOverviewScreen} options={{ tabBarLabel: "لوحة التشغيل" }} />
      </Tab.Navigator>
    );
  }

  if (roleCode === "admin") {
    return (
      <Tab.Navigator screenOptions={commonScreenOptions} initialRouteName="AdminOverview">
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "حسابي" }} />
        <Tab.Screen name="AdminOverview" component={AdminPanelScreen} options={{ tabBarLabel: "الإدارة" }} />
      </Tab.Navigator>
    );
  }

  return (
    <Tab.Navigator screenOptions={commonScreenOptions} initialRouteName="Home">
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "الحساب" }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ tabBarLabel: "الطلبات" }} />
      <Tab.Screen name="Map" component={CustomerMapScreen} options={{ tabBarLabel: "الخريطة" }} />
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "الرئيسية" }} />
    </Tab.Navigator>
  );
};
