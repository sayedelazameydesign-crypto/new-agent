
const API_BASE_URL = 'http://localhost:8000';

export const apiService = {
  async listJobs(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/jobs`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  async createJob(task: string, repoUrl?: string): Promise<{ job_id: string }> {
    const res = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, repo_url: repoUrl }),
    });
    if (!res.ok) throw new Error('Failed to create job');
    return res.json();
  },

  async getJob(jobId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    if (!res.ok) throw new Error('Failed to fetch job details');
    return res.json();
  },

  async getStatus(jobId: string): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`);
    if (!res.ok) throw new Error('Failed to fetch job status');
    return res.json();
  },

  async deleteJob(jobId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete job');
  },

  getDownloadUrl(jobId: string, filename: string): string {
    return `${API_BASE_URL}/jobs/${jobId}/download/${filename}`;
  }
};
