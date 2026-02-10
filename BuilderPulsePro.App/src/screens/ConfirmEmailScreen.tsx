import React from 'react';
import {View} from 'react-native';
import {Button, Card, Text, TextInput} from 'react-native-paper';
import {styles} from '../styles';

type ConfirmEmailScreenProps = {
  userId: string;
  token: string;
  message: string;
  error: string;
  onUserIdChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onConfirm: () => void;
  onLoadLatest: () => void;
  onLogin: () => void;
  onBack: () => void;
};

const ConfirmEmailScreen = ({
  userId,
  token,
  message,
  error,
  onUserIdChange,
  onTokenChange,
  onConfirm,
  onLoadLatest,
  onLogin,
  onBack,
}: ConfirmEmailScreenProps) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.kicker}>Email confirmation</Text>
      <Text style={styles.title}>Confirm your email</Text>
      <Text style={styles.body}>
        Paste the user id and confirmation token from the email.
      </Text>
      <View style={styles.form}>
        <TextInput
          mode="outlined"
          label="User ID"
          style={styles.input}
          value={userId}
          onChangeText={onUserIdChange}
        />
        <TextInput
          mode="outlined"
          label="Token"
          style={styles.input}
          value={token}
          onChangeText={onTokenChange}
        />
        <Button mode="contained" onPress={onConfirm}>
          Confirm email
        </Button>
        <Button mode="outlined" onPress={onLoadLatest}>
          Load latest dev email
        </Button>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.linkRow}>
        <Button mode="text" onPress={onLogin}>
          Go to login
        </Button>
      </View>
    </Card.Content>
  </Card>
);

export default ConfirmEmailScreen;
