export type Screen =
  | 'landing'
  | 'login'
  | 'signup'
  | 'confirmEmail'
  | 'chooseMode'
  | 'clientDashboard'
  | 'contractorDashboard'
  | 'contractorProfile'
  | 'contractorJobDetails'
  | 'jobDetails'
  | 'postJob';

export type UserMode = 'client' | 'contractor';

export type Job = {
  id: string;
  title: string;
  trade: string;
  description?: string | null;
  status: string;
  createdAt: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
  hasBidByMe?: boolean;
};

export type JobAttachment = {
  id: string;
  jobId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url?: string | null;
  createdAt: string;
};

export type PendingAttachment = {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
};

export type ServiceAreaItem = {
  lat: number;
  lng: number;
  radiusMeters: number;
  label?: string | null;
  zip?: string | null;
};

export type ServiceAreaRequestItem = {
  zip: string;
  radiusMeters: number;
  label?: string | null;
};

export type ContractorProfile = {
  displayName: string;
  trades: string[];
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat: number;
  lng: number;
  serviceRadiusMeters: number;
  serviceAreas: ServiceAreaItem[];
  isAvailable: boolean;
  unavailableReason?: string | null;
  updatedAt: string;
};

export type RecommendedJob = Job & {
  distanceMeters: number;
  hasBidByMe: boolean;
};

