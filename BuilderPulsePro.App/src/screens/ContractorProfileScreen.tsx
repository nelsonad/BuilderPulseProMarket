import React from 'react';
import {View} from 'react-native';
import {
  Button,
  Card,
  Chip,
  Switch,
  Text,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import {styles} from '../styles';

type ContractorProfileScreenProps = {
  displayName: string;
  city: string;
  state: string;
  zip: string;
  trades: string[];
  radius: string;
  isAvailable: boolean;
  unavailableReason: string;
  error: string;
  message: string;
  onDisplayNameChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onZipChange: (value: string) => void;
  onTradesChange: (value: string[]) => void;
  onRadiusChange: (value: string) => void;
  onAvailabilityChange: (value: boolean) => void;
  onUnavailableReasonChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

const ContractorProfileScreen = ({
  displayName,
  city,
  state,
  zip,
  trades,
  radius,
  isAvailable,
  unavailableReason,
  error,
  message,
  onDisplayNameChange,
  onCityChange,
  onStateChange,
  onZipChange,
  onTradesChange,
  onRadiusChange,
  onAvailabilityChange,
  onUnavailableReasonChange,
  onSubmit,
  onBack,
}: ContractorProfileScreenProps) => {
  const chipStyle = {marginBottom: 8, marginRight: 8};

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.kicker}>Contractor profile</Text>
        <Text style={styles.title}>Tell us about your services</Text>
        <Text style={styles.body}>
          Add your trades and location to get recommended jobs.
        </Text>
        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Display name"
            style={styles.input}
            value={displayName}
            onChangeText={onDisplayNameChange}
          />
          <TextInput
            mode="outlined"
            label="City"
            style={styles.input}
            value={city}
            onChangeText={onCityChange}
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
            keyboardType="number-pad"
            maxLength={5}
            onChangeText={onZipChange}
          />
          <Text style={styles.label}>Trades</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {tradeOptions.map(option => (
              <Chip
                key={option}
                selected={trades.includes(option)}
                onPress={() =>
                  onTradesChange(
                    trades.includes(option)
                      ? trades.filter(trade => trade !== option)
                      : [...trades, option],
                  )
                }
                style={chipStyle}>
                {option}
              </Chip>
            ))}
          </View>
          <Text style={styles.label}>Service radius</Text>
          <SegmentedButtons
            value={radius}
            onValueChange={onRadiusChange}
            buttons={radiusOptions}
          />
          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 16}}>
            <Switch value={isAvailable} onValueChange={onAvailabilityChange} />
            <Text style={{marginLeft: 8}}>
              {isAvailable ? 'Available for new jobs' : 'Unavailable for new jobs'}
            </Text>
          </View>
          {!isAvailable ? (
            <TextInput
              mode="outlined"
              label="Unavailable reason"
              style={styles.input}
              value={unavailableReason}
              onChangeText={onUnavailableReasonChange}
            />
          ) : null}
          <Button mode="contained" onPress={onSubmit}>
            Save profile
          </Button>
          {message ? <Text style={styles.success}>{message}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <View style={styles.linkRow}>
          <Button mode="text" onPress={onBack}>
            Back
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

export const tradeOptions = [
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
];

const radiusOptions = [
  {value: '8047', label: '5 mi'},
  {value: '16093', label: '10 mi'},
  {value: '32187', label: '20 mi'},
  {value: '40234', label: '25 mi'},
  {value: '80467', label: '50 mi'},
  {value: '160934', label: '100 mi'},
  {value: '321869', label: '200 mi'},
];

export default ContractorProfileScreen;
