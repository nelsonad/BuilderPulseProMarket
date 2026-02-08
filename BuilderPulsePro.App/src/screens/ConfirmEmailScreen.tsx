import React from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
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
  <View style={styles.card}>
    <Text style={styles.kicker}>Email confirmation</Text>
    <Text style={styles.title}>Confirm your email</Text>
    <Text style={styles.body}>
      Paste the user id and confirmation token from the email.
    </Text>
    <View style={styles.form}>
      <Text style={styles.label}>User ID</Text>
      <TextInput
        style={styles.input}
        value={userId}
        onChangeText={onUserIdChange}
      />
      <Text style={styles.label}>Token</Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={onTokenChange}
      />
      <Pressable style={styles.buttonPrimary} onPress={onConfirm}>
        <Text style={styles.buttonTextPrimary}>Confirm email</Text>
      </Pressable>
      <Pressable style={styles.buttonSecondary} onPress={onLoadLatest}>
        <Text style={styles.buttonTextSecondary}>Load latest dev email</Text>
      </Pressable>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
    <View style={styles.linkRow}>
      <Pressable onPress={onLogin}>
        <Text style={styles.link}>Go to login</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>Back to landing</Text>
      </Pressable>
    </View>
  </View>
);

export default ConfirmEmailScreen;
