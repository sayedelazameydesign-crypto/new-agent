
"""
Celia AI Agent - Database Module
SQLite database operations for job management
"""

import sqlite3
import json
import logging
import datetime
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)

class Database:
    """
    Database handler for Celia AI Agent
    Uses SQLite for persistent storage
    """
    
    def __init__(self, db_path: str = "./celia.db"):
        self.db_path = db_path
        self._init_db()
        logger.info(f"Database initialized at {db_path}")
    
    def _init_db(self):
        """Initialize database schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                task TEXT NOT NULL,
                repo_url TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                logs TEXT DEFAULT '',
                files TEXT DEFAULT '[]',
                error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON jobs(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON jobs(created_at DESC)')
        
        conn.commit()
        conn.close()

    def create_job(self, job_id: str, task: str, repo_url: Optional[str] = None):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        now = datetime.datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO jobs (job_id, task, repo_url, status, logs, created_at, updated_at)
            VALUES (?, ?, ?, 'pending', ?, ?, ?)
        ''', (job_id, task, repo_url, f"[{now}] Job created\n", now, now))
        
        conn.commit()
        conn.close()
        return job_id

    def update_job_status(self, job_id: str, status: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE jobs 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE job_id = ?
        ''', (status, job_id))
        conn.commit()
        conn.close()

    def set_error(self, job_id: str, error_msg: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE jobs 
            SET status = 'failed', error = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE job_id = ?
        ''', (error_msg, job_id))
        conn.commit()
        conn.close()
        self.append_log(job_id, f"[ERROR] {error_msg}")

    def append_log(self, job_id: str, message: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        log_line = f"[{timestamp}] {message}\n"
        
        cursor.execute('''
            UPDATE jobs 
            SET logs = logs || ?, updated_at = CURRENT_TIMESTAMP 
            WHERE job_id = ?
        ''', (log_line, job_id))
        
        conn.commit()
        conn.close()

    def add_file(self, job_id: str, file_path: str):
        job = self.get_job(job_id)
        if job:
            files = job['files']
            if file_path not in files:
                files.append(file_path)
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE jobs 
                    SET files = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE job_id = ?
                ''', (json.dumps(files), job_id))
                conn.commit()
                conn.close()

    def get_job(self, job_id: str) -> Optional[dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM jobs WHERE job_id = ?', (job_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            job = dict(row)
            job['files'] = json.loads(job['files']) if job['files'] else []
            return job
        return None

    def list_jobs(self, limit: int = 50) -> List[dict]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?', (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        jobs = []
        for row in rows:
            job = dict(row)
            job['files'] = json.loads(job['files']) if job['files'] else []
            jobs.append(job)
        return jobs

    def delete_job(self, job_id: str):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM jobs WHERE job_id = ?', (job_id,))
        conn.commit()
        conn.close()

    def get_stats(self) -> Dict:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT status, COUNT(*) as count FROM jobs GROUP BY status')
        status_counts = {row['status']: row['count'] for row in cursor.fetchall()}
        
        cursor.execute('SELECT COUNT(*) as total FROM jobs')
        total = cursor.fetchone()['total']
        
        conn.close()
        return {
            'total_jobs': total,
            'by_status': status_counts
        }

    def cleanup_old_jobs(self, days: int = 30) -> int:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM jobs WHERE created_at < datetime('now', '-' || ? || ' days')", (days,))
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        logger.info(f"Cleaned up {deleted_count} jobs older than {days} days")
        return deleted_count
