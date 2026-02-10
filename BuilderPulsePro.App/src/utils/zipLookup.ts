export type ZipLookupResult = {
  city: string;
  state: string;
  lat: number;
  lng: number;
};

const zipLookup: Record<string, ZipLookupResult> = {
  '98101': {city: 'Seattle', state: 'WA', lat: 47.6101, lng: -122.3344},
  '94103': {city: 'San Francisco', state: 'CA', lat: 37.7739, lng: -122.4312},
  '10001': {city: 'New York', state: 'NY', lat: 40.7506, lng: -73.9972},
};

export const lookupZip = (zip: string) => zipLookup[zip] ?? null;
