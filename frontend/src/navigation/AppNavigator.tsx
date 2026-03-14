import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import SubAppScreen from '../screens/SubAppScreen';

export type RootStackParamList = {
  Home: undefined;
  SubApp: { slug: string; name: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Playground' }}
      />
      <Stack.Screen
        name="SubApp"
        component={SubAppScreen}
        options={({ route }) => ({ title: route.params.name })}
      />
    </Stack.Navigator>
  );
}
