import React from 'react';
import {View} from 'react-native';
import {Button, Card, Text} from 'react-native-paper';
import {styles} from '../styles';
import {Job} from '../types';

type ClientDashboardScreenProps = {
  jobs: Job[];
  isLoading: boolean;
  errorMessage: string;
  onCreateJob: () => void;
  onViewJob: (jobId: string) => void;
};

const ClientDashboardScreen = ({
  jobs,
  isLoading,
  errorMessage,
  onCreateJob,
  onViewJob,
}: ClientDashboardScreenProps) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.kicker}>Client dashboard</Text>
      <Text style={styles.title}>Your active jobs</Text>
      <Text style={styles.body}>
        Track jobs you have posted and manage new requests.
      </Text>
      <Button mode="contained" onPress={onCreateJob}>
        Create new job
      </Button>
      {isLoading ? <Text style={styles.body}>Loading your jobs...</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {!isLoading && !errorMessage ? (
        <View style={styles.list}>
          {jobs.length === 0 ? (
            <Text style={styles.body}>No jobs yet. Create your first job.</Text>
          ) : (
            jobs.map(job => (
              <Card key={job.id} style={styles.listItem}>
                <Card.Content
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <View>
                    <Text style={styles.listTitle}>{job.title}</Text>
                    <Text style={styles.listMeta}>{job.trade}</Text>
                  </View>
                  <Button mode="text" onPress={() => onViewJob(job.id)}>
                    View
                  </Button>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      ) : null}
    </Card.Content>
  </Card>
);

export default ClientDashboardScreen;
