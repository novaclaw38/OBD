import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScanScreen from '../screens/ScanScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DtcScreen from '../screens/DtcScreen';
import VehicleInfoScreen from '../screens/VehicleInfoScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type RootStackParamList = {
  Scan: undefined;
  Dashboard: undefined;
  Dtc: undefined;
  VehicleInfo: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0B0F14', card: '#0B0F14' },
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen
          name="Dtc"
          component={DtcScreen}
          options={{ headerShown: true, title: 'Trouble Codes' }}
        />
        <Stack.Screen
          name="VehicleInfo"
          component={VehicleInfoScreen}
          options={{ headerShown: true, title: 'Vehicle Info' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
