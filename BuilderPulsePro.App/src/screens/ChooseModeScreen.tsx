import React from 'react';
import {View} from 'react-native';
import {Button, Card, Text} from 'react-native-paper';
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
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.kicker}>Choose a mode</Text>
      <Text style={styles.title}>How will you use BuilderPulse Pro?</Text>
      <Text style={styles.body}>Select a role to tailor your experience.</Text>
      <View style={styles.buttonRow}>
        <Button mode="contained" onPress={() => onChooseMode('client')}>
          Client
        </Button>
        <Button mode="outlined" onPress={() => onChooseMode('contractor')}>
          Contractor
        </Button>
      </View>
    </Card.Content>
  </Card>
);

export default ChooseModeScreen;
