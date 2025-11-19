import os
import redis
import json
from threading import Lock
from notebook_executor import NotebookExecutor


class RedisKernelManager:
    """
    Manages Jupyter kernels across multiple Gunicorn workers using Redis.

    Architecture:
    - Each worker maintains its own local kernels in memory
    - Redis stores which worker owns which user's kernel
    - If a request lands on the wrong worker, it creates a new kernel
    - This is acceptable because notebook state is per-session, not persistent

    For 200 concurrent users with 4 workers:
    - Each worker handles ~50 users
    - Sticky session behavior through Redis tracking
    """

    def __init__(self):
        # Connect to Redis
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = redis.from_url(redis_url, decode_responses=True)

        # Local kernel storage (in-memory for this worker)
        self.local_kernels = {}
        self.lock = Lock()

        # Worker ID (unique per process)
        self.worker_id = os.getpid()

        print(f"RedisKernelManager initialized for worker {self.worker_id}")

    def get_kernel(self, user_id):
        """Get or create a kernel for a user"""
        with self.lock:
            # Check if we already have this kernel locally
            if user_id in self.local_kernels:
                print(f"Worker {self.worker_id}: Using existing local kernel for user {user_id}")
                return self.local_kernels[user_id]

            # Check Redis to see if another worker has this user's kernel
            redis_key = f"kernel:user:{user_id}"
            stored_worker = self.redis_client.get(redis_key)

            if stored_worker:
                if str(stored_worker) == str(self.worker_id):
                    # This worker should have it but doesn't (maybe restarted)
                    print(f"Worker {self.worker_id}: Recreating kernel for user {user_id}")
                else:
                    # Another worker has it, but we'll create our own
                    print(f"Worker {self.worker_id}: Creating new kernel for user {user_id} (was on worker {stored_worker})")
            else:
                print(f"Worker {self.worker_id}: Creating first kernel for user {user_id}")

            # Create new kernel
            kernel = NotebookExecutor()
            self.local_kernels[user_id] = kernel

            # Store in Redis that this worker owns this user's kernel
            self.redis_client.set(redis_key, self.worker_id, ex=3600)  # Expire after 1 hour

            return kernel

    def restart_kernel(self, user_id):
        """Restart a user's kernel"""
        with self.lock:
            if user_id in self.local_kernels:
                print(f"Worker {self.worker_id}: Restarting kernel for user {user_id}")
                self.local_kernels[user_id].restart_kernel()
            else:
                # Create new kernel
                print(f"Worker {self.worker_id}: Creating new kernel for user {user_id} (restart)")
                kernel = NotebookExecutor()
                self.local_kernels[user_id] = kernel

                # Update Redis
                redis_key = f"kernel:user:{user_id}"
                self.redis_client.set(redis_key, self.worker_id, ex=3600)

    def cleanup_user_kernel(self, user_id):
        """Clean up a user's kernel (called on logout or timeout)"""
        with self.lock:
            if user_id in self.local_kernels:
                print(f"Worker {self.worker_id}: Cleaning up kernel for user {user_id}")
                del self.local_kernels[user_id]

            # Remove from Redis
            redis_key = f"kernel:user:{user_id}"
            self.redis_client.delete(redis_key)

    def get_stats(self):
        """Get statistics about kernel usage"""
        with self.lock:
            return {
                'worker_id': self.worker_id,
                'local_kernels': len(self.local_kernels),
                'user_ids': list(self.local_kernels.keys())
            }
