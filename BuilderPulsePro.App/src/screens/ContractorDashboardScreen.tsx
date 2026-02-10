import React from 'react';
import {View} from 'react-native';
import {Button, Card, Text} from 'react-native-paper';
import {styles} from '../styles';
import {ContractorProfile, RecommendedJob} from '../types';

type ContractorDashboardScreenProps = {
  profile: ContractorProfile | null;
  jobs: RecommendedJob[];
  isLoading: boolean;
  errorMessage: string;
  onCreateProfile: () => void;
  onEditProfile: () => void;
  onViewJob: (jobId: string) => void;
};

const ContractorDashboardScreen = ({
  profile,
  jobs,
  isLoading,
  errorMessage,
  onCreateProfile,
  onEditProfile,
  onViewJob,
}: ContractorDashboardScreenProps) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.kicker}>Contractor dashboard</Text>
      <Text style={styles.title}>Recommended jobs near you</Text>
      {profile ? (
        <Text style={styles.body}>Trades: {profile.trades.join(', ')}</Text>
      ) : (
        <Text style={styles.body}>
          Create your contractor profile to get personalized job matches.
        </Text>
      )}
      {!profile ? (
        <Button mode="contained" onPress={onCreateProfile}>
          Create profile
        </Button>
      ) : (
        <Button mode="outlined" onPress={onEditProfile}>
          Edit profile
        </Button>
      )}
      {isLoading ? (
        <Text style={styles.body}>Loading recommended jobs...</Text>
      ) : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {profile && !isLoading && !errorMessage ? (
        <View style={styles.list}>
          {jobs.length === 0 ? (
            <Text style={styles.body}>No recommended jobs yet.</Text>
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
                    <Text style={styles.listMeta}>
                      {Math.round(job.distanceMeters)} m away
                    </Text>
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

export default ContractorDashboardScreen;
