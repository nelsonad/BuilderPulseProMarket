/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

/* eslint-disable prettier/prettier */

import React, {useEffect, useMemo, useState} from 'react';
import {SafeAreaView, ScrollView, View} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import {
  Appbar,
  Menu,
  Provider as PaperProvider,
  MD3LightTheme,
} from 'react-native-paper';
import {jobs} from './src/data/jobs';
import ChooseModeScreen from './src/screens/ChooseModeScreen';
import ClientDashboardScreen from './src/screens/ClientDashboardScreen';
import ConfirmEmailScreen from './src/screens/ConfirmEmailScreen';
import ContractorDashboardScreen from './src/screens/ContractorDashboardScreen';
import ContractorJobDetailsScreen from './src/screens/ContractorJobDetailsScreen';
import ContractorProfileScreen, {
  tradeOptions,
} from './src/screens/ContractorProfileScreen';
import JobDetailsScreen from './src/screens/JobDetailsScreen';
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import PostJobScreen from './src/screens/PostJobScreen';
import SignupScreen from './src/screens/SignupScreen';
import {confirmEmail, login, register} from './src/services/authService';
import {
  getContractorProfile,
  getRecommendedJobs,
  upsertContractorProfile,
} from './src/services/contractorService';
import {loadLatestEmail} from './src/services/devService';
import {
  createJob,
  getJobAttachments,
  getMyJobs,
  uploadJobAttachments,
} from './src/services/jobsService';
import {getUserMode, setUserMode} from './src/services/storageService';
import {styles} from './src/styles';
import {
  ContractorProfile,
  Job,
  JobAttachment,
  PendingAttachment,
  RecommendedJob,
  Screen,
  UserMode,
} from './src/types';
import {
  allowedAttachmentExtensionsDisplay,
  isAllowedAttachmentFileName,
} from './src/utils/attachments';
import {isValidEmail} from './src/utils/validation';
import {lookupZip} from './src/utils/zipLookup';

const App = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<UserMode | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState('');
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [myJobsLoading, setMyJobsLoading] = useState(false);
  const [myJobsError, setMyJobsError] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const [contractorProfile, setContractorProfile] =
    useState<ContractorProfile | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState('');
  const [jobAttachments, setJobAttachments] = useState([] as JobAttachment[]);

  const [contractorName, setContractorName] = useState('');
  const [contractorCity, setContractorCity] = useState('');
  const [contractorState, setContractorState] = useState('');
  const [contractorZip, setContractorZip] = useState('');
  const [contractorTrades, setContractorTrades] = useState<string[]>([]);
  const [contractorRadius, setContractorRadius] = useState('16093');
  const [contractorIsAvailable, setContractorIsAvailable] = useState(true);
  const [contractorUnavailableReason, setContractorUnavailableReason] =
    useState('');
  const [contractorMessage, setContractorMessage] = useState('');
  const [contractorError, setContractorError] = useState('');

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
  const [postDescription, setPostDescription] = useState('');
  const [postCity, setPostCity] = useState('');
  const [postState, setPostState] = useState('');
  const [postZip, setPostZip] = useState('');
  const [postMessage, setPostMessage] = useState('');
  const [postError, setPostError] = useState('');
  const [postAttachments, setPostAttachments] = useState<PendingAttachment[]>(
    [],
  );

  useEffect(() => {
    const loadMode = async () => {
      try {
        const stored = await getUserMode();
        setMode(stored);
      } catch {
        setMode(null);
      }
    };
    loadMode();
  }, []);

  const handlePickAttachments = async () => {
    setPostError('');

    try {
      const results = await DocumentPicker.pick({
        allowMultiSelection: true,
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const allowed = results
        .map(result => ({
          uri: result.fileCopyUri ?? result.uri,
          name: result.name,
          type: result.type ?? 'application/octet-stream',
          size: result.size ?? null,
        }))
        .filter(result => isAllowedAttachmentFileName(result.name));

      const skipped = results.length - allowed.length;
      if (skipped > 0) {
        setPostError(
          `Some files were skipped. Allowed types: ${allowedAttachmentExtensionsDisplay}.`,
        );
      }

      if (allowed.length > 0) {
        setPostAttachments(current => [...current, ...allowed]);
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return;
      }

      setPostError('Unable to pick attachments.');
    }
  };

  const handleClearAttachments = () => {
    setPostAttachments([]);
  };

  const handleSignOut = () => {
    setAuthToken('');
    setProfileMenuOpen(false);
    setPendingScreen(null);
    setScreen('landing');
  };

  const handleChangeMode = () => {
    setProfileMenuOpen(false);
    setScreen('chooseMode');
  };

  const handleFindJob = () => {
    if (mode === 'client') return navigateTo('clientDashboard');
    if (mode === 'contractor') return navigateTo('contractorDashboard');
    navigateTo('chooseMode');
  };

  const navigateTo = (target: Screen) => {
    if (
      !authToken &&
      (target === 'clientDashboard' ||
        target === 'contractorDashboard' ||
        target === 'contractorProfile' ||
        target === 'contractorJobDetails' ||
        target === 'postJob' ||
        target === 'jobDetails')
    ) {
      setPendingScreen(target);
      setScreen('login');
      return;
    }
    setScreen(target);
  };

  const selectedJob = useMemo(() => {
    if (!selectedJobId) {
      return null;
    }

    return (
      recommendedJobs.find(job => job.id === selectedJobId) ??
      myJobs.find(job => job.id === selectedJobId) ??
      jobs.find(job => job.id === selectedJobId) ??
      null
    );
  }, [selectedJobId, myJobs, recommendedJobs]);

  useEffect(() => {
    if (screen !== 'clientDashboard') {
      return;
    }

    if (!authToken) {
      setMyJobsError('Log in to view your jobs.');
      setMyJobs([]);
      return;
    }

    let isActive = true;

    const loadMyJobs = async () => {
      setMyJobsLoading(true);
      setMyJobsError('');

      try {
        const payload = await getMyJobs(authToken);
        if (isActive) {
          setMyJobs(payload);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load jobs.';
        if (isActive) {
          setMyJobsError(message);
          setMyJobs([]);
        }
      } finally {
        if (isActive) {
          setMyJobsLoading(false);
        }
      }
    };

    loadMyJobs();

    return () => {
      isActive = false;
    };
  }, [screen, authToken]);

  useEffect(() => {
    if (
      (screen !== 'jobDetails' && screen !== 'contractorJobDetails') ||
      !selectedJobId
    ) {
      setJobAttachments([]);
      return;
    }

    let isActive = true;

    const loadAttachments = async () => {
      try {
        const attachments = await getJobAttachments(selectedJobId);
        if (isActive) {
          setJobAttachments(attachments ?? []);
        }
      } catch {
        if (isActive) {
          setJobAttachments([]);
        }
      }
    };

    loadAttachments();

    return () => {
      isActive = false;
    };
  }, [screen, selectedJobId]);

  useEffect(() => {
    if (screen !== 'contractorProfile') {
      return;
    }

    if (!authToken) {
      setContractorError('Log in to edit your profile.');
      return;
    }

    let isActive = true;

    const loadProfile = async () => {
      try {
        const profile = await getContractorProfile(authToken);
        if (!profile || !isActive) {
          return;
        }

        setContractorProfile(profile);
        setContractorName(profile.displayName);
        setContractorCity(profile.city ?? '');
        setContractorState(profile.state ?? '');
        setContractorZip(profile.zip ?? '');
        setContractorTrades(profile.trades);
        setContractorRadius(profile.serviceRadiusMeters.toString());
        setContractorIsAvailable(profile.isAvailable);
        setContractorUnavailableReason(profile.unavailableReason ?? '');
      } catch (error) {
        if (!isActive) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load contractor profile.';
        setContractorError(message);
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [screen, authToken]);

  useEffect(() => {
    if (screen !== 'contractorDashboard') {
      return;
    }

    if (!authToken) {
      setRecommendedError('Log in to view recommended jobs.');
      setRecommendedJobs([]);
      return;
    }

    let isActive = true;

    const loadContractorData = async () => {
      setRecommendedLoading(true);
      setRecommendedError('');

      try {
        const profile = await getContractorProfile(authToken);
        if (!profile) {
          if (isActive) {
            setContractorProfile(null);
            setScreen('contractorProfile');
          }
          return;
        }

        if (isActive) {
          setContractorProfile(profile);
          setContractorName(profile.displayName);
          setContractorCity(profile.city ?? '');
          setContractorState(profile.state ?? '');
          setContractorZip(profile.zip ?? '');
          const tradeLookup = new Map(
            tradeOptions.map(trade => [trade.toLowerCase(), trade]),
          );
          const normalizedTrades = profile.trades
            .map(trade => tradeLookup.get(trade.trim().toLowerCase()))
            .filter((trade): trade is string => Boolean(trade));
          setContractorTrades(normalizedTrades);
          setContractorRadius(profile.serviceRadiusMeters.toString());
          setContractorIsAvailable(profile.isAvailable);
          setContractorUnavailableReason(profile.unavailableReason ?? '');
        }

        const recommended = await getRecommendedJobs(authToken);
        if (isActive) {
          setRecommendedJobs(recommended.items);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load recommended jobs.';
        if (isActive) {
          setRecommendedError(message);
          setRecommendedJobs([]);
        }
      } finally {
        if (isActive) {
          setRecommendedLoading(false);
        }
      }
    };

    loadContractorData();

    return () => {
      isActive = false;
    };
  }, [screen, authToken]);

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
      const payload = await login(trimmed, loginPassword);
      setAuthToken(payload.accessToken);
      if (pendingScreen) {
        setScreen(pendingScreen);
        setPendingScreen(null);
      } else if (mode === 'client') {
        setScreen('clientDashboard');
      } else if (mode === 'contractor') {
        setScreen('contractorDashboard');
      } else {
        setScreen('chooseMode');
      }
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
      await register(trimmed, signupPassword);

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
      await confirmEmail(confirmUserId, confirmToken);

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
      const data = await loadLatestEmail();
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
    await setUserMode(nextMode);
    setMode(nextMode);
    navigateTo(
      nextMode === 'client' ? 'clientDashboard' : 'contractorDashboard',
    );
  };

  const handleSaveContractorProfile = async () => {
    setContractorError('');
    setContractorMessage('');

    if (!authToken) {
      setContractorError('Log in to save your profile.');
      return;
    }

    if (!contractorName.trim()) {
      setContractorError('Display name is required.');
      return;
    }

    const tradeLookup = new Map(
      tradeOptions.map(trade => [trade.toLowerCase(), trade]),
    );
    const normalizedTrades = contractorTrades
      .map(trade => tradeLookup.get(trade.trim().toLowerCase()))
      .filter((trade): trade is string => Boolean(trade));

    if (normalizedTrades.length === 0) {
      setContractorError('Add at least one trade.');
      return;
    }

    const radiusValue = Number(contractorRadius);
    if (!contractorZip.trim()) {
      setContractorError('Zip code is required.');
      return;
    }

    if (Number.isNaN(radiusValue) || radiusValue <= 0) {
      setContractorError('Service radius must be greater than zero.');
      return;
    }

    try {
      const profile = await upsertContractorProfile(authToken, {
        displayName: contractorName.trim(),
        trades: normalizedTrades,
        city: contractorCity.trim() || null,
        state: contractorState.trim() || null,
        zip: contractorZip.trim() || null,
        lat: 0,
        lng: 0,
        serviceRadiusMeters: radiusValue,
        isAvailable: contractorIsAvailable,
        unavailableReason: contractorIsAvailable
          ? null
          : contractorUnavailableReason.trim() || null,
      });

      setContractorProfile(profile);
      setContractorMessage('Profile saved.');
      setScreen('contractorDashboard');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save profile.';
      setContractorError(message);
    }
  };

  const handlePostJob = async () => {
    setPostMessage('');
    setPostError('');

    if (!postTitle.trim() || !postTrade.trim()) {
      setPostError('Title and trade are required.');
      return;
    }

    const resolvedZip = postZip.trim();
    if (!resolvedZip) {
      setPostError('Zip code is required.');
      return;
    }

    const zipMatch = lookupZip(resolvedZip);
    if (!zipMatch) {
      setPostError('Zip code not found in lookup table.');
      return;
    }

    if (!authToken) {
      setPostError('Log in to post a job.');
      return;
    }

    try {
      const job = await createJob(authToken, {
        title: postTitle.trim(),
        trade: postTrade.trim(),
        description: postDescription.trim() || null,
        city: postCity.trim() || null,
        state: postState.trim() || null,
        zip: resolvedZip || null,
        lat: 0,
        lng: 0,
      });

      if (postAttachments.length > 0) {
        await uploadJobAttachments(authToken, job.id, postAttachments);
      }

      setPostMessage('Job submitted.');
      setPostTitle('');
      setPostTrade('');
      setPostDescription('');
      setPostCity('');
      setPostState('');
      setPostZip('');
      setPostAttachments([]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to post job.';
      setPostError(message);
    }
  };
  const renderScreenContent = () => {
    switch (screen) {
      case 'landing':
        return (
          <LandingScreen
            mode={mode}
            onFindJob={handleFindJob}
            onPostJob={() => navigateTo('postJob')}
            onLogin={() => navigateTo('login')}
            onSignup={() => navigateTo('signup')}
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
            onSignup={() => navigateTo('signup')}
            onBack={() => navigateTo('landing')}
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
            onLogin={() => navigateTo('login')}
            onBack={() => navigateTo('landing')}
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
            onLogin={() => navigateTo('login')}
            onBack={() => navigateTo('landing')}
          />
        );
      case 'chooseMode':
        return (
          <ChooseModeScreen
            onChooseMode={handleChooseMode}
            onBack={() => navigateTo('landing')}
          />
        );
      case 'clientDashboard':
        return (
          <ClientDashboardScreen
            jobs={myJobs}
            isLoading={myJobsLoading}
            errorMessage={myJobsError}
            onCreateJob={() => navigateTo('postJob')}
            onViewJob={jobId => {
              setSelectedJobId(jobId);
              navigateTo('jobDetails');
            }}
          />
        );
      case 'contractorDashboard':
        return (
          <ContractorDashboardScreen
            profile={contractorProfile}
            jobs={recommendedJobs}
            isLoading={recommendedLoading}
            errorMessage={recommendedError}
            onCreateProfile={() => navigateTo('contractorProfile')}
            onEditProfile={() => navigateTo('contractorProfile')}
            onViewJob={jobId => {
              setSelectedJobId(jobId);
              navigateTo('contractorJobDetails');
            }}
          />
        );
      case 'contractorProfile':
        return (
          <ContractorProfileScreen
            displayName={contractorName}
            city={contractorCity}
            state={contractorState}
            zip={contractorZip}
            trades={contractorTrades}
            radius={contractorRadius}
            isAvailable={contractorIsAvailable}
            unavailableReason={contractorUnavailableReason}
            error={contractorError}
            message={contractorMessage}
            onDisplayNameChange={setContractorName}
            onCityChange={setContractorCity}
            onStateChange={setContractorState}
            onZipChange={(value) =>
              setContractorZip(value.replace(/\D/g, '').slice(0, 5))
            }
            onTradesChange={setContractorTrades}
            onRadiusChange={setContractorRadius}
            onAvailabilityChange={setContractorIsAvailable}
            onUnavailableReasonChange={setContractorUnavailableReason}
            onSubmit={handleSaveContractorProfile}
            onBack={() => navigateTo('contractorDashboard')}
          />
        );
      case 'jobDetails':
        return (
          <JobDetailsScreen
            job={selectedJob}
            attachments={jobAttachments}
            onBack={() => navigateTo('clientDashboard')}
            onPostJob={() => navigateTo('postJob')}
          />
        );
      case 'contractorJobDetails':
        return (
          <ContractorJobDetailsScreen
            job={selectedJob}
            attachments={jobAttachments}
            onBack={() => navigateTo('contractorDashboard')}
          />
        );
      case 'postJob':
      default:
        return (
          <PostJobScreen
            title={postTitle}
            trade={postTrade}
            description={postDescription}
            city={postCity}
            state={postState}
            zip={postZip}
            message={postMessage}
            error={postError}
            attachments={postAttachments}
            onTitleChange={setPostTitle}
            onTradeChange={setPostTrade}
            onDescriptionChange={setPostDescription}
            onCityChange={setPostCity}
            onStateChange={setPostState}
            onZipChange={setPostZip}
            onAddAttachments={handlePickAttachments}
            onClearAttachments={handleClearAttachments}
            onSubmit={handlePostJob}
            onBackToDashboard={() => navigateTo('clientDashboard')}
          />
        );
    }
  };
  const screenContent = renderScreenContent();

  return (
    <PaperProvider theme={MD3LightTheme}>
      <SafeAreaView style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title="BuilderPulsePro" />
          <Menu
            visible={profileMenuOpen}
            onDismiss={() => setProfileMenuOpen(false)}
            anchor={
              <Appbar.Action
                icon="account-circle"
                onPress={() => setProfileMenuOpen(true)}
              />
            }
          >
            <Menu.Item onPress={handleChangeMode} title="Change Mode" />
            {authToken ? (
              <Menu.Item onPress={handleSignOut} title="Sign Out" />
            ) : (
              <Menu.Item
                onPress={() => {
                  setProfileMenuOpen(false);
                  setScreen('login');
                }}
                title="Log In"
              />
            )}
          </Menu>
        </Appbar.Header>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View style={styles.shell}>{screenContent}</View>
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
};

export default App;

/* eslint-enable prettier/prettier */
