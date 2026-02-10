import React from 'react';
import {View} from 'react-native';
import {Button, Card, Chip, Text, TextInput} from 'react-native-paper';
import {styles} from '../styles';

type PostJobScreenProps = {
  title: string;
  trade: string;
  description: string;
  city: string;
  state: string;
  zip: string;
  message: string;
  error: string;
  onTitleChange: (value: string) => void;
  onTradeChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onZipChange: (value: string) => void;
  onSubmit: () => void;
  onBackToDashboard: () => void;
};

const PostJobScreen = ({
  title,
  trade,
  description,
  city,
  state,
  zip,
  message,
  error,
  onTitleChange,
  onTradeChange,
  onDescriptionChange,
  onCityChange,
  onStateChange,
  onZipChange,
  onSubmit,
  onBackToDashboard,
}: PostJobScreenProps) => (
  <Card style={styles.card}>
    <Card.Content>
      <Text style={styles.kicker}>Post a job</Text>
      <Text style={styles.title}>Share your next project</Text>
      <Text style={styles.body}>
        Add project details and connect with contractors.
      </Text>
      <View style={styles.form}>
        <TextInput
          mode="outlined"
          label="Title"
          style={styles.input}
          value={title}
          onChangeText={onTitleChange}
        />
        <Text style={styles.label}>Trade</Text>
        <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
          {[
            'Cabinetry',
            'Carpentry',
            'Concrete',
            'Doors',
            'Drywall',
            'Electrical',
            'Excavating',
            'Flooring',
            'Foundation',
            'Framing',
            'General Contracting',
            'Glass',
            'HVAC',
            'Landscaping',
            'Masonry',
            'Painting',
            'Plumbing',
            'Remodeling',
            'Roofing',
            'Siding',
            'Tiling',
            'Windows',
          ].map(option => (
            <Chip
              key={option}
              selected={trade === option}
              onPress={() => onTradeChange(option)}
              style={{marginBottom: 8, marginRight: 8}}>
              {option}
            </Chip>
          ))}
        </View>
        <TextInput
          mode="outlined"
          label="City"
          style={styles.input}
          value={city}
          onChangeText={onCityChange}
        />
        <TextInput
          mode="outlined"
          label="Description"
          style={styles.input}
          value={description}
          onChangeText={onDescriptionChange}
          multiline
        />
        <TextInput
          mode="outlined"
          label="State"
          style={styles.input}
          value={state}
          onChangeText={onStateChange}
        />
        <TextInput
          mode="outlined"
          label="Zip code"
          style={styles.input}
          value={zip}
          onChangeText={onZipChange}
        />
        <Button mode="contained" onPress={onSubmit}>
          Submit job
        </Button>
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.linkRow}>
        <Button mode="text" onPress={onBackToDashboard}>
          Back to dashboard
        </Button>
      </View>
    </Card.Content>
  </Card>
);

export default PostJobScreen;
