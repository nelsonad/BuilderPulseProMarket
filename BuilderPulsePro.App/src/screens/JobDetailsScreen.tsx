import React from 'react';
import {View} from 'react-native';
import {Button, Card, Text} from 'react-native-paper';
import AttachmentViewer from '../components/AttachmentViewer';
import {styles} from '../styles';
import {Job, JobAttachment} from '../types';

type JobDetailsScreenProps = {
  job: Job | null;
  attachments: JobAttachment[];
  onBack: () => void;
  onPostJob: () => void;
};

const JobDetailsScreen = ({
  job,
  attachments,
  onBack,
  onPostJob,
}: JobDetailsScreenProps) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.kicker}>Job details</Text>
      <Text style={styles.title}>{job?.title ?? 'Job details'}</Text>
      {job ? (
        <View style={styles.detailGrid}>
          <Text style={styles.detailText}>Trade: {job.trade}</Text>
          <Text style={styles.detailText}>Status: {job.status}</Text>
          <Text style={styles.detailText}>Created: {job.createdAt}</Text>
          {job.description ? (
            <Text style={styles.detailText}>Description: {job.description}</Text>
          ) : null}
          <Text style={styles.detailText}>
            Location: {job.lat.toFixed(4)}, {job.lng.toFixed(4)}
          </Text>
        </View>
      ) : (
        <Text style={styles.body}>Select a job to view details.</Text>
      )}
      <AttachmentViewer attachments={attachments} />
      <View style={styles.linkRow}>
        <Button mode="text" onPress={onBack}>
          Back to dashboard
        </Button>
        <Button mode="text" onPress={onPostJob}>
          Post another job
        </Button>
      </View>
    </Card.Content>
  </Card>
);

export default JobDetailsScreen;
