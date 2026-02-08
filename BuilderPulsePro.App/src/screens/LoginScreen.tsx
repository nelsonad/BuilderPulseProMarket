import React from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
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
  <View style={styles.card}>
    <Text style={styles.kicker}>Welcome back</Text>
    <Text style={styles.title}>Log in to BuilderPulse Pro</Text>
    <Text style={styles.body}>Use your account to track jobs and coordinate.</Text>
    <View style={styles.form}>
      <Text style={styles.label}>Email address</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={onEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
      />
      {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
      <Pressable style={styles.buttonPrimary} onPress={onSubmit}>
        <Text style={styles.buttonTextPrimary}>Log in</Text>
      </Pressable>
      {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
    </View>
    <View style={styles.linkRow}>
      <Pressable onPress={onSignup}>
        <Text style={styles.link}>Need an account? Sign up</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>Back to landing</Text>
      </Pressable>
    </View>
  </View>
);

export default LoginScreen;
