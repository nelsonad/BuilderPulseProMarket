import React from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
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
  <View style={styles.card}>
    <Text style={styles.kicker}>Get started</Text>
    <Text style={styles.title}>Create your BuilderPulse Pro account</Text>
    <Text style={styles.body}>Join to post projects or bid on the right jobs.</Text>
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
      <Text style={styles.label}>Confirm password</Text>
      <TextInput
        style={styles.input}
        value={confirmPassword}
        onChangeText={onConfirmChange}
        secureTextEntry
      />
      {confirmError ? <Text style={styles.error}>{confirmError}</Text> : null}
      <Pressable style={styles.buttonPrimary} onPress={onSubmit}>
        <Text style={styles.buttonTextPrimary}>Create account</Text>
      </Pressable>
      {messageTone !== 'none' ? (
        <Text style={messageTone === 'success' ? styles.success : styles.error}>
          {message}
        </Text>
      ) : null}
    </View>
    <View style={styles.linkRow}>
      <Pressable onPress={onLogin}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>Back to landing</Text>
      </Pressable>
    </View>
  </View>
);

export default SignupScreen;
