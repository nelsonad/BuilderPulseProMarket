import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {styles} from '../styles';
import {UserMode} from '../types';

type ChooseModeScreenProps = {
  onChooseMode: (mode: UserMode) => void;
  onBack: () => void;
};

const ChooseModeScreen = ({
  onChooseMode,
  onBack,
}: ChooseModeScreenProps) => (
  <View style={styles.card}>
    <Text style={styles.kicker}>Choose a mode</Text>
    <Text style={styles.title}>How will you use BuilderPulse Pro?</Text>
    <Text style={styles.body}>Select a role to tailor your experience.</Text>
    <View style={styles.buttonRow}>
      <Pressable style={styles.buttonPrimary} onPress={() => onChooseMode('client')}>
        <Text style={styles.buttonTextPrimary}>Client</Text>
      </Pressable>
      <Pressable
        style={styles.buttonSecondary}
        onPress={() => onChooseMode('contractor')}
      >
        <Text style={styles.buttonTextSecondary}>Contractor</Text>
      </Pressable>
    </View>
    <View style={styles.linkRow}>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>Back to landing</Text>
      </Pressable>
    </View>
  </View>
);

export default ChooseModeScreen;
