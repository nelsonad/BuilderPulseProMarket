import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {styles} from '../styles';
import {UserMode} from '../types';

type LandingScreenProps = {
  mode: UserMode | null;
  onFindJob: () => void;
  onPostJob: () => void;
  onLogin: () => void;
  onSignup: () => void;
};

const LandingScreen = ({
  mode,
  onFindJob,
  onPostJob,
  onLogin,
  onSignup,
}: LandingScreenProps) => (
  <View style={styles.card}>
    <Text style={styles.badge}>BuilderPulse Pro</Text>
    <Text style={styles.title}>Build your next project connection</Text>
    <Text style={styles.subtitle}>
      Discover opportunities or post jobs for trusted contractors in minutes.
    </Text>
    {mode && <Text style={styles.meta}>Current mode: {mode}</Text>}
    <View style={styles.buttonRow}>
      <Pressable style={styles.buttonPrimary} onPress={onFindJob}>
        <Text style={styles.buttonTextPrimary}>Find a Job</Text>
      </Pressable>
      <Pressable style={styles.buttonSecondary} onPress={onPostJob}>
        <Text style={styles.buttonTextSecondary}>Post a Job</Text>
      </Pressable>
    </View>
    <View style={styles.linkRow}>
      <Pressable onPress={onLogin}>
        <Text style={styles.link}>Login</Text>
      </Pressable>
      <Pressable onPress={onSignup}>
        <Text style={styles.link}>Sign Up</Text>
      </Pressable>
    </View>
  </View>
);

export default LandingScreen;
