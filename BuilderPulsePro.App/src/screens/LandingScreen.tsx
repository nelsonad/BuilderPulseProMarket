import React from 'react';
import {View} from 'react-native';
import {Button, Card, Text} from 'react-native-paper';
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
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.badge}>BuilderPulse Pro</Text>
      <Text style={styles.title}>Build your next project connection</Text>
      <Text style={styles.subtitle}>
        Discover opportunities or post jobs for trusted contractors in minutes.
      </Text>
      {mode && <Text style={styles.meta}>Current mode: {mode}</Text>}
      <View style={styles.buttonRow}>
        <Button mode="contained" onPress={onFindJob}>
          Find a Job
        </Button>
        <Button mode="outlined" onPress={onPostJob}>
          Post a Job
        </Button>
      </View>
      <View style={styles.linkRow}>
        <Button mode="text" onPress={onLogin}>
          Login
        </Button>
        <Button mode="text" onPress={onSignup}>
          Sign Up
        </Button>
      </View>
    </Card.Content>
  </Card>
);

export default LandingScreen;
