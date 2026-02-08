/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useMemo, useState} from 'react';
import {SafeAreaView, ScrollView, View} from 'react-native';
import {apiBaseUrl, modeStorageKey} from './src/constants';
import {jobs} from './src/data/jobs';
import ChooseModeScreen from './src/screens/ChooseModeScreen';
import ConfirmEmailScreen from './src/screens/ConfirmEmailScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import JobsScreen from './src/screens/JobsScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import PostJobScreen from './src/screens/PostJobScreen';
import SignupScreen from './src/screens/SignupScreen';
import {styles} from './src/styles';
import {Screen, UserMode} from './src/types';
import {isValidEmail} from './src/utils/validation';

const App = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<UserMode | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginEmailError, setLoginEmailError] = useState('');
  const [loginPasswordError, setLoginPasswordError] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [signupEmailError, setSignupEmailError] = useState('');
  const [signupPasswordError, setSignupPasswordError] = useState('');
  const [signupConfirmError, setSignupConfirmError] = useState('');
  const [signupMessage, setSignupMessage] = useState('');
  const [signupMessageTone, setSignupMessageTone] = useState<
    'success' | 'error' | 'none'
  >('none');

  const [confirmUserId, setConfirmUserId] = useState('');
  const [confirmToken, setConfirmToken] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const [postTitle, setPostTitle] = useState('');
  const [postTrade, setPostTrade] = useState('');
  const [postLat, setPostLat] = useState('');
  const [postLng, setPostLng] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [postError, setPostError] = useState('');

  useEffect(() => {
    const loadMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(modeStorageKey);
        if (stored === 'client' || stored === 'contractor') {
          setMode(stored);
        }
      } catch {
        setMode(null);
      }
    };

    loadMode();
  }, []);

  const selectedJob = useMemo(
    () => jobs.find(job => job.id === selectedJobId) ?? null,
    [selectedJobId],
  );

  const handleLogin = async () => {
    setLoginError('');
    const trimmed = loginEmail.trim();

    let isValid = true;
    if (!trimmed) {
      setLoginEmailError('Email is required.');
      isValid = false;
    } else if (!isValidEmail(trimmed)) {
      setLoginEmailError('Enter a valid email address.');
      isValid = false;
    } else {
      setLoginEmailError('');
    }

    if (!loginPassword) {
      setLoginPasswordError('Password is required.');
      isValid = false;
    } else {
      setLoginPasswordError('');
    }

    if (!isValid) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: trimmed, password: loginPassword}),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      const payload = (await response.json()) as {accessToken: string};
      setAuthToken(payload.accessToken);
      setScreen('chooseMode');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to log in.';
      setLoginError(message);
    }
  };

  const handleSignup = async () => {
    const trimmed = signupEmail.trim();
    let isValid = true;
    setSignupMessage('');
    setSignupMessageTone('none');

    if (!trimmed) {
      setSignupEmailError('Email is required.');
      isValid = false;
    } else if (!isValidEmail(trimmed)) {
      setSignupEmailError('Enter a valid email address.');
      isValid = false;
    } else {
      setSignupEmailError('');
    }

    if (!signupPassword) {
      setSignupPasswordError('Password is required.');
      isValid = false;
    } else {
      setSignupPasswordError('');
    }

    if (!signupConfirm) {
      setSignupConfirmError('Confirm your password.');
      isValid = false;
    } else if (signupConfirm !== signupPassword) {
      setSignupConfirmError('Passwords do not match.');
      isValid = false;
    } else {
      setSignupConfirmError('');
    }

    if (!isValid) {
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: trimmed, password: signupPassword}),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      setSignupMessage(
        'Account created. Check your email to confirm your account.',
      );
      setSignupMessageTone('success');
      setConfirmUserId('');
      setConfirmToken('');
      setScreen('confirmEmail');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to register.';
      setSignupMessage(message);
      setSignupMessageTone('error');
    }
  };

  const handleConfirmEmail = async () => {
    setConfirmMessage('');
    setConfirmError('');

    if (!confirmUserId || !confirmToken) {
      setConfirmError('Enter the user id and confirmation token.');
      return;
    }

    try {
      const response = await fetch(
        `${apiBaseUrl}/auth/confirm-email?userId=${encodeURIComponent(
          confirmUserId,
        )}&token=${encodeURIComponent(confirmToken)}`,
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      setConfirmMessage('Email confirmed. You can log in now.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to confirm email.';
      setConfirmError(message);
    }
  };

  const handleLoadLatestEmail = async () => {
    setConfirmMessage('');
    setConfirmError('');

    try {
      const response = await fetch(`${apiBaseUrl}/dev/emails/latest`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      const data = (await response.json()) as {body?: string};
      const body = data.body ?? '';
      const match = body.match(
        /confirm-email\?userId=([^&\s]+)&token=([^\s]+)/,
      );
      if (!match) {
        throw new Error('Confirmation link not found in email body.');
      }

      setConfirmUserId(decodeURIComponent(match[1]));
      setConfirmToken(decodeURIComponent(match[2]));
      setConfirmMessage('Loaded confirmation details from the latest email.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load email.';
      setConfirmError(message);
    }
  };

  const handleChooseMode = async (nextMode: UserMode) => {
    await AsyncStorage.setItem(modeStorageKey, nextMode);
    setMode(nextMode);
    setScreen('landing');
  };

  const handlePostJob = async () => {
    setPostMessage('');
    setPostError('');

    if (!postTitle.trim() || !postTrade.trim()) {
      setPostError('Title and trade are required.');
      return;
    }

    const latValue = Number(postLat);
    const lngValue = Number(postLng);
    if (Number.isNaN(latValue) || Number.isNaN(lngValue)) {
      setPostError('Lat and Lng must be numbers.');
      return;
    }

    if (!authToken) {
      setPostError('Log in to post a job.');
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: postTitle.trim(),
          trade: postTrade.trim(),
          lat: latValue,
          lng: lngValue,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      setPostMessage('Job submitted.');
      setPostTitle('');
      setPostTrade('');
      setPostLat('');
      setPostLng('');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to post job.';
      setPostError(message);
    }
  };

  const screenContent = (() => {
    switch (screen) {
      case 'landing':
        return (
          <LandingScreen
            mode={mode}
            onFindJob={() => setScreen('jobs')}
            onPostJob={() => setScreen('postJob')}
            onLogin={() => setScreen('login')}
            onSignup={() => setScreen('signup')}
          />
        );
      case 'login':
        return (
          <LoginScreen
            email={loginEmail}
            password={loginPassword}
            emailError={loginEmailError}
            passwordError={loginPasswordError}
            submitError={loginError}
            onEmailChange={setLoginEmail}
            onPasswordChange={setLoginPassword}
            onSubmit={handleLogin}
            onSignup={() => setScreen('signup')}
            onBack={() => setScreen('landing')}
          />
        );
      case 'signup':
        return (
          <SignupScreen
            email={signupEmail}
            password={signupPassword}
            confirmPassword={signupConfirm}
            emailError={signupEmailError}
            passwordError={signupPasswordError}
            confirmError={signupConfirmError}
            message={signupMessage}
            messageTone={signupMessageTone}
            onEmailChange={setSignupEmail}
            onPasswordChange={setSignupPassword}
            onConfirmChange={setSignupConfirm}
            onSubmit={handleSignup}
            onLogin={() => setScreen('login')}
            onBack={() => setScreen('landing')}
          />
        );
      case 'confirmEmail':
        return (
          <ConfirmEmailScreen
            userId={confirmUserId}
            token={confirmToken}
            message={confirmMessage}
            error={confirmError}
            onUserIdChange={setConfirmUserId}
            onTokenChange={setConfirmToken}
            onConfirm={handleConfirmEmail}
            onLoadLatest={handleLoadLatestEmail}
            onLogin={() => setScreen('login')}
            onBack={() => setScreen('landing')}
          />
        );
      case 'chooseMode':
        return (
          <ChooseModeScreen
            onChooseMode={handleChooseMode}
            onBack={() => setScreen('landing')}
          />
        );
      case 'jobs':
        return (
          <JobsScreen
            jobs={jobs}
            onSelectJob={jobId => {
              setSelectedJobId(jobId);
              setScreen('jobDetails');
            }}
            onPostJob={() => setScreen('postJob')}
            onBack={() => setScreen('landing')}
          />
        );
      case 'jobDetails':
        return (
          <JobDetailsScreen
            job={selectedJob}
            onBack={() => setScreen('jobs')}
            onPostJob={() => setScreen('postJob')}
          />
        );
      case 'postJob':
      default:
        return (
          <PostJobScreen
            title={postTitle}
            trade={postTrade}
            lat={postLat}
            lng={postLng}
            message={postMessage}
            error={postError}
            onTitleChange={setPostTitle}
            onTradeChange={setPostTrade}
            onLatChange={setPostLat}
            onLngChange={setPostLng}
            onSubmit={handlePostJob}
            onBackToJobs={() => setScreen('jobs')}
            onBack={() => setScreen('landing')}
          />
        );
    }
  })();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.shell}>{screenContent}</View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
