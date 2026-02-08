export type Screen =
  | 'landing'
  | 'login'
  | 'signup'
  | 'confirmEmail'
  | 'chooseMode'
  | 'jobs'
  | 'jobDetails'
  | 'postJob';

export type UserMode = 'client' | 'contractor';

export type Job = {
  id: string;
  title: string;
  trade: string;
  status: string;
  createdAt: string;
  lat: number;
  lng: number;
};
