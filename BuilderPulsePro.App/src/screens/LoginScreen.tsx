import React from 'react';
import {View} from 'react-native';
import {Button, Card, Text, TextInput} from 'react-native-paper';
import {styles} from '../styles';

type LoginScreenProps = {
  email: string;
  password: string;
  emailError: string;
  passwordError: string;
  submitError: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onSignup: () => void;
  onBack: () => void;
};

const LoginScreen = ({
  email,
  password,
  emailError,
  passwordError,
  submitError,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSignup,
  onBack,
}: LoginScreenProps) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.kicker}>Welcome back</Text>
      <Text style={styles.title}>Log in to BuilderPulse Pro</Text>
      <Text style={styles.body}>Use your account to track jobs and coordinate.</Text>
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
        <Button mode="contained" onPress={onSubmit}>
          Log in
        </Button>
        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
      </View>
      <View style={styles.linkRow}>
        <Button mode="text" onPress={onSignup}>
          Need an account? Sign up
        </Button>
      </View>
    </Card.Content>
  </Card>
);

export default LoginScreen;
