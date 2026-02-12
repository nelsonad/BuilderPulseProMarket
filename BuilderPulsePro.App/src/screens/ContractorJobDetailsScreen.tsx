import React, {useState} from 'react';
import {View} from 'react-native';
import {Button, Card, SegmentedButtons, Text} from 'react-native-paper';
import AttachmentViewer from '../components/AttachmentViewer';
import {styles} from '../styles';
import {Job, JobAttachment} from '../types';

type ContractorJobDetailsScreenProps = {
  job: Job | null;
  attachments: JobAttachment[];
  onBack: () => void;
};

const ContractorJobDetailsScreen = ({
  job,
  attachments,
  onBack,
}: ContractorJobDetailsScreenProps) => (
}: ContractorJobDetailsScreenProps) => {
  const [activeTab, setActiveTab] = useState('details');

  const formattedCreatedAt = job?.createdAt
    ? new Date(job.createdAt).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.kicker}>Job details</Text>
        <Text style={styles.title}>{job?.title ?? 'Job details'}</Text>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {value: 'details', label: 'Details'},
            {value: 'messages', label: 'Messages'},
            {value: 'bids', label: 'Bids'},
          ]}
        />
        {activeTab === 'details' ? (
          job ? (
            <View style={styles.detailGrid}>
              <Text style={styles.detailText}>Trade: {job.trade}</Text>
              <Text style={styles.detailText}>
                Created: {formattedCreatedAt || job.createdAt}
              </Text>
              {job.description ? (
                <Text style={styles.detailText}>Description: {job.description}</Text>
              ) : null}
              <Text style={styles.detailText}>
                Location: {job.lat.toFixed(4)}, {job.lng.toFixed(4)}
              </Text>
            </View>
          ) : (
            <Text style={styles.body}>Select a job to view details.</Text>
          )
        ) : (
          <Text style={styles.body}>
            {activeTab === 'messages'
              ? 'Messages will appear here once available.'
              : 'Bids will appear here once available.'}
          </Text>
        )}
        <AttachmentViewer attachments={attachments} />
        <View style={styles.linkRow}>
          <Button mode="text" onPress={onBack}>
            Back to dashboard
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

export default ContractorJobDetailsScreen;
