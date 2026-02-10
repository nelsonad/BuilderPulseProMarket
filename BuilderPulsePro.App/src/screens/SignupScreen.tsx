import React from 'react';
import {View} from 'react-native';
import {Button, Card, Text, TextInput} from 'react-native-paper';
import {styles} from '../styles';

type SignupScreenProps = {
  email: string;
  password: string;
  confirmPassword: string;
  emailError: string;
  passwordError: string;
  confirmError: string;
  message: string;
  messageTone: 'success' | 'error' | 'none';
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  onSubmit: () => void;
  onLogin: () => void;
  onBack: () => void;
};

const SignupScreen = ({
  email,
  password,
  confirmPassword,
  emailError,
  passwordError,
  confirmError,
  message,
  messageTone,
  onEmailChange,
  onPasswordChange,
  onConfirmChange,
  onSubmit,
  onLogin,
  onBack,
}: SignupScreenProps) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.kicker}>Get started</Text>
      <Text style={styles.title}>Create your BuilderPulse Pro account</Text>
      <Text style={styles.body}>Join to post projects or bid on the right jobs.</Text>
      <View style={styles.form}>
        <TextInput
          mode="outlined"
          label="Email address"
          style={styles.input}
          value={email}
          onChangeText={onEmailChange}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
        <TextInput
          mode="outlined"
          label="Password"
          style={styles.input}
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry
        />
        {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
        <TextInput
          mode="outlined"
          label="Confirm password"
          style={styles.input}
          value={confirmPassword}
          onChangeText={onConfirmChange}
          secureTextEntry
        />
        {confirmError ? <Text style={styles.error}>{confirmError}</Text> : null}
        <Button mode="contained" onPress={onSubmit}>
          Create account
        </Button>
        {messageTone !== 'none' ? (
          <Text style={messageTone === 'success' ? styles.success : styles.error}>
            {message}
          </Text>
        ) : null}
      </View>
      <View style={styles.linkRow}>
        <Button mode="text" onPress={onLogin}>
          Already have an account? Log in
        </Button>
      </View>
    </Card.Content>
  </Card>
);

export default SignupScreen;
