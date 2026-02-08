import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {styles} from '../styles';
import {Job} from '../types';

type JobsScreenProps = {
  jobs: Job[];
  onSelectJob: (jobId: string) => void;
  onPostJob: () => void;
  onBack: () => void;
};

const JobsScreen = ({
  jobs,
  onSelectJob,
  onPostJob,
  onBack,
}: JobsScreenProps) => (
  <View style={styles.card}>
    <Text style={styles.kicker}>Jobs</Text>
    <Text style={styles.title}>Open roles ready for bids</Text>
    <View style={styles.list}>
      {jobs.map(job => (
        <View key={job.id} style={styles.listItem}>
          <View>
            <Text style={styles.listTitle}>{job.title}</Text>
            <Text style={styles.listMeta}>{job.trade}</Text>
          </View>
          <Pressable onPress={() => onSelectJob(job.id)}>
            <Text style={styles.link}>View details</Text>
          </Pressable>
        </View>
      ))}
    </View>
    <View style={styles.linkRow}>
      <Pressable onPress={onPostJob}>
        <Text style={styles.link}>Post a job</Text>
      </Pressable>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>Back to landing</Text>
      </Pressable>
    </View>
  </View>
);

export default JobsScreen;
