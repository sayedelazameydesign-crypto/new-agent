
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'process' | 'plan' | 'git' | 'brain' | 'tool' | 'search' | 'map';
}

export interface JobFile {
  name: string;
  path: string;
  size?: string;
}

export interface Job {
  id: string;
  task: string;
  persona?: string;
  use_search?: boolean;
  repo_url?: string;
  status: JobStatus;
  created_at: string;
  logs: string;
  files: (string | JobFile)[];
  error?: string;
  is_simulation?: boolean;
}

export interface JobDetail extends Job {}

export interface JobCreate {
  task: string;
  repo_url?: string;
  persona?: string;
  use_search?: boolean;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  created_at: string;
}

export interface MapPlace {
  title: string;
  uri: string;
  address?: string;
  rating?: number;
}
