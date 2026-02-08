import React from 'react';
import {Pressable, Text, TextInput, View} from 'react-native';
import {styles} from '../styles';

type PostJobScreenProps = {
  title: string;
  trade: string;
  lat: string;
  lng: string;
  message: string;
  error: string;
  onTitleChange: (value: string) => void;
  onTradeChange: (value: string) => void;
  onLatChange: (value: string) => void;
  onLngChange: (value: string) => void;
  onSubmit: () => void;
  onBackToJobs: () => void;
  onBack: () => void;
};

const PostJobScreen = ({
  title,
  trade,
  lat,
  lng,
  message,
  error,
  onTitleChange,
  onTradeChange,
  onLatChange,
  onLngChange,
  onSubmit,
  onBackToJobs,
  onBack,
}: PostJobScreenProps) => (
  <View style={styles.card}>
    <Text style={styles.kicker}>Post a job</Text>
    <Text style={styles.title}>Share your next project</Text>
    <Text style={styles.body}>Add project details and connect with contractors.</Text>
    <View style={styles.form}>
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={onTitleChange} />
      <Text style={styles.label}>Trade</Text>
      <TextInput style={styles.input} value={trade} onChangeText={onTradeChange} />
      <Text style={styles.label}>Latitude</Text>
      <TextInput style={styles.input} value={lat} onChangeText={onLatChange} />
      <Text style={styles.label}>Longitude</Text>
      <TextInput style={styles.input} value={lng} onChangeText={onLngChange} />
      <Pressable style={styles.buttonPrimary} onPress={onSubmit}>
        <Text style={styles.buttonTextPrimary}>Submit job</Text>
      </Pressable>
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
    <View style={styles.linkRow}>
      <Pressable onPress={onBackToJobs}>
        <Text style={styles.link}>Browse jobs</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>Back to landing</Text>
      </Pressable>
    </View>
  </View>
);

export default PostJobScreen;
