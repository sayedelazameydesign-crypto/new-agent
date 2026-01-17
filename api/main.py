
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import os
import logging
from typing import List

from api.models import JobCreate, JobResponse, JobDetail
from api.database import Database
from agent.worker import AgentWorker

# Enhanced Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Database at a persistent path
DB_PATH = os.path.join(os.getcwd(), "data", "celia.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

db = Database(DB_PATH)
worker = AgentWorker(db)

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs('jobs', exist_ok=True)
    logger.info("Celia Backend Lifespan started.")
    yield
    logger.info("Celia Backend Lifespan shutting down.")

app = FastAPI(title="Celia AI Agent API", version="2.5.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error occurred.", "detail": str(exc)},
    )

@app.post("/jobs", response_model=JobResponse)
async def create_job(job_data: JobCreate, background_tasks: BackgroundTasks):
    try:
        job_id = worker.create_job(job_data.task, job_data.repo_url)
        background_tasks.add_task(worker.execute_job, job_id=job_id)
        job = db.get_job(job_id)
        return JobResponse(job_id=job_id, status=job['status'], created_at=job['created_at'])
    except Exception as e:
        logger.error(f"Failed to create job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/jobs", response_model=List[JobDetail])
async def list_jobs():
    return db.list_jobs()

@app.get("/jobs/{job_id}", response_model=JobDetail)
async def get_job(job_id: str):
    job = db.get_job(job_id)
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/jobs/{job_id}/status")
async def get_status(job_id: str):
    job = db.get_job(job_id)
    if not job: raise HTTPException(status_code=404, detail="Job not found")
    return {"status": job['status']}

@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    db.delete_job(job_id)
    return {"message": "Job deleted"}

@app.get("/jobs/{job_id}/download/{filename}")
async def download_file(job_id: str, filename: str):
    file_path = f"jobs/{job_id}/output/{filename}"
    if not os.path.exists(file_path):
        logger.warning(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, filename=filename)
