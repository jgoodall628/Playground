import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getSubAppComponent } from '../sub-apps/registry';

type Props = NativeStackScreenProps<RootStackParamList, 'SubApp'>;

export default function SubAppScreen({ route }: Props) {
  const { slug } = route.params;
  const Component = getSubAppComponent(slug);

  if (!Component) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>App Not Available</Text>
        <Text style={styles.subtitle}>
          This sub-app requires an app update to run.
        </Text>
      </View>
    );
  }

  // eslint-disable-next-line react-hooks/static-components -- Component is a registry lookup, not created during render
  return <Component slug={slug} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});
