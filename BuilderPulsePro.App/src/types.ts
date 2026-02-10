export type Screen =
  | 'landing'
  | 'login'
  | 'signup'
  | 'confirmEmail'
  | 'chooseMode'
  | 'clientDashboard'
  | 'contractorDashboard'
  | 'contractorProfile'
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

export type ContractorProfile = {
  displayName: string;
  trades: string[];
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  lat: number;
  lng: number;
  serviceRadiusMeters: number;
  isAvailable: boolean;
  unavailableReason?: string | null;
  updatedAt: string;
};

export type RecommendedJob = Job & {
  distanceMeters: number;
  hasBidByMe: boolean;
};
