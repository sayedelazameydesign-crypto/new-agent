
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
from enum import Enum
from datetime import datetime

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class JobCreate(BaseModel):
    task: str
    repo_url: Optional[str] = None

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    created_at: str

class JobDetail(BaseModel):
    id: str
    task: str
    repo_url: Optional[str] = None
    status: JobStatus
    logs: str
    files: List[str]
    created_at: str
