import {apiBaseUrl} from '../constants';
import {ContractorProfile, RecommendedJob, ServiceAreaItem, ServiceAreaRequestItem} from '../types';

type PagedResponse<T> = {
  total: number;
  items: T[];
};

type UpsertContractorProfileRequest = {
  displayName: string;
  trades: string[];
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat: number;
  lng: number;
  serviceRadiusMeters: number;
  serviceAreas?: ServiceAreaRequestItem[] | null;
  isAvailable?: boolean;
  unavailableReason?: string | null;
};

const buildError = async (response: Response) => {
  const text = await response.text();
  return text || `Request failed (${response.status})`;
};

export const getContractorProfile = async (token: string) => {
  const response = await fetch(`${apiBaseUrl}/contractor/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await buildError(response));
  }

  return (await response.json()) as ContractorProfile;
};

export const upsertContractorProfile = async (
  token: string,
  payload: UpsertContractorProfileRequest,
) => {
  const response = await fetch(`${apiBaseUrl}/contractor/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await buildError(response));
  }

  return (await response.json()) as ContractorProfile;
};

export const getRecommendedJobs = async (token: string, trade?: string) => {
  const params = new URLSearchParams();
  if (trade) {
    params.set('trade', trade);
  }

  const response = await fetch(
    `${apiBaseUrl}/contractor/jobs/recommended${
      params.toString() ? `?${params.toString()}` : ''
    }`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await buildError(response));
  }

  return (await response.json()) as PagedResponse<RecommendedJob>;
};
