import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {styles} from '../styles';
import {Job} from '../types';

type JobDetailsScreenProps = {
  job: Job | null;
  onBack: () => void;
  onPostJob: () => void;
};

const JobDetailsScreen = ({
  job,
  onBack,
  onPostJob,
}: JobDetailsScreenProps) => (
  <View style={styles.card}>
    <Text style={styles.kicker}>Job details</Text>
    <Text style={styles.title}>{job?.title ?? 'Job details'}</Text>
    {job ? (
      <View style={styles.detailGrid}>
        <Text style={styles.detailText}>Trade: {job.trade}</Text>
        <Text style={styles.detailText}>Status: {job.status}</Text>
        <Text style={styles.detailText}>Created: {job.createdAt}</Text>
        <Text style={styles.detailText}>
          Location: {job.lat.toFixed(4)}, {job.lng.toFixed(4)}
        </Text>
      </View>
    ) : (
      <Text style={styles.body}>Select a job to view details.</Text>
    )}
    <View style={styles.linkRow}>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>Back to jobs</Text>
      </Pressable>
      <Pressable onPress={onPostJob}>
        <Text style={styles.link}>Post another job</Text>
      </Pressable>
    </View>
  </View>
);

export default JobDetailsScreen;
