# Redis Setup for Railway

## Why Redis is Needed

The LMS now uses **4 Gunicorn workers** to support **200+ concurrent users**. Redis coordinates Jupyter kernel sessions across these workers, ensuring:
- Kernel state persistence within the same worker
- Efficient load distribution across workers
- Graceful handling when users' requests hit different workers

## Step 1: Add Redis to Railway

### Option A: Using Railway's Redis Template (Recommended)

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add Redis"**
3. Railway will automatically:
   - Create a Redis instance
   - Set the `REDIS_URL` environment variable
   - Connect it to your backend service

### Option B: Using Railway CLI

```bash
railway add redis
```

## Step 2: Verify Redis Connection

After adding Redis, check your backend service environment variables:

1. Go to Railway Dashboard → Your Backend Service → Variables
2. Verify `REDIS_URL` exists and looks like:
   ```
   redis://:password@redis.railway.internal:6379
   ```

## Step 3: Deploy and Test

1. Railway will automatically redeploy your backend with Redis
2. Check logs to verify workers are starting:
   ```
   [INFO] Booting worker with pid: 2
   [INFO] Booting worker with pid: 3
   [INFO] Booting worker with pid: 4
   [INFO] Booting worker with pid: 5
   RedisKernelManager initialized for worker 2
   RedisKernelManager initialized for worker 3
   RedisKernelManager initialized for worker 4
   RedisKernelManager initialized for worker 5
   ```

3. Test notebook execution:
   - Cell 1: `import os`
   - Cell 2: `print(os.name)`
   - Should work even if cells hit different workers!

## Expected Capacity

With 4 workers and Redis:
- **Fast requests** (API calls, page loads): 400-2000 requests/second
- **Notebook execution**: 40-80 concurrent cell executions
- **Total users**: 200+ concurrent users comfortably

## Troubleshooting

### Error: "Connection refused" or "REDIS_URL not found"

**Solution**: Redis service isn't running or REDIS_URL isn't set.

1. Verify Redis is added: Railway Dashboard → Services → Should see "Redis"
2. Restart backend service: Railway Dashboard → Backend → Deploy → Restart

### Error: "Worker creating new kernel every time"

**Expected behavior**: Due to load balancing, a user's cells might hit different workers. Redis tracks this but each worker maintains its own kernels. As long as execution works correctly, this is normal.

### Performance Issues

If you need more capacity:
- Scale to 6-8 workers (for 300-400 users)
- Upgrade Railway plan for more memory
- Consider dedicated Redis instance for larger scale

## Local Development

For local testing with Redis:

```bash
# Install Redis locally
brew install redis  # macOS
sudo apt install redis  # Ubuntu

# Start Redis
redis-server

# The app will connect to redis://localhost:6379 by default
```

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│          Railway Load Balancer              │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼───┐       ┌───▼───┐
   │Worker1│       │Worker2│
   │User A │       │User B │
   │Kernel │       │Kernel │
   └───┬───┘       └───┬───┘
       │                │
       └───────┬────────┘
               │
         ┌─────▼─────┐
         │   Redis   │
         │ Tracking  │
         └───────────┘
```

## Cost

Railway Redis pricing:
- **Hobby Plan**: $5/month (512 MB)
- **Pro Plan**: Scales with usage

For 200 users with moderate usage, the Hobby plan should suffice.
