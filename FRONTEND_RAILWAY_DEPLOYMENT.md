# Frontend Deployment to Railway

This guide explains how to deploy the frontend to Railway and connect it to your backend API.

## Step 1: Get Your Backend URL

First, you need your Railway backend URL. After deploying the backend:

1. Go to your Railway backend service
2. Go to "Settings" tab
3. Under "Domains", you'll see your backend URL
4. Copy it (e.g., `https://your-backend-name.up.railway.app`)

## Step 2: Deploy Frontend to Railway

### Option A: Using Railway Dashboard

1. **Create New Service**
   - Go to your Railway project
   - Click "New Service"
   - Select "GitHub Repo"
   - Choose the same repository (`architect-moaaz/training-lms`)

2. **Configure Service**
   - Railway will detect it as a Node.js project
   - Go to "Settings" → "Root Directory"
   - Set root directory to: `frontend`

3. **Set Environment Variables**
   - Go to "Variables" tab
   - Add this variable:
     ```
     REACT_APP_API_URL=https://your-backend-name.up.railway.app/api
     ```
   - Replace `your-backend-name.up.railway.app` with your actual backend URL

4. **Deploy**
   - Railway will automatically build and deploy
   - Wait for deployment to complete
   - You'll get a frontend URL like: `https://your-frontend-name.up.railway.app`

### Option B: Using Railway CLI

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Set root directory
railway service

# Set environment variable
railway variables set REACT_APP_API_URL=https://your-backend-name.up.railway.app/api

# Deploy
railway up
```

## Step 3: Configure Backend CORS

After deploying the frontend, you need to update backend CORS to allow your frontend domain.

### Update Backend Environment Variables

In your Railway backend service:

1. Go to "Variables" tab
2. Add or update:
   ```
   FRONTEND_URL=https://your-frontend-name.up.railway.app
   ```

### Update backend/app.py

The CORS configuration should allow your frontend domain:

```python
# Update this line in backend/app.py
CORS(app, resources={
    r"/api/*": {
        "origins": [
            os.environ.get('FRONTEND_URL', 'http://localhost:3001'),
            "http://localhost:3001"  # Keep for local development
        ],
        "supports_credentials": True
    }
})
```

Then commit and push:
```bash
git add backend/app.py
git commit -m "Update CORS for Railway frontend"
git push origin main
```

Railway will automatically redeploy the backend.

## Step 4: Test the Deployment

1. **Access Frontend**
   - Open `https://your-frontend-name.up.railway.app`
   - You should see the login/register page

2. **Test Registration**
   - Create a new account
   - Check browser console for any errors

3. **Test Login**
   - Login with your account
   - Should redirect to dashboard

4. **Test Notebook Execution**
   - Navigate to Day 1
   - Open insight_agent notebook
   - Try running a cell
   - Verify it executes on the backend

## Troubleshooting

### Issue: "Network Error" or CORS Error

**Solution:** 
1. Check `REACT_APP_API_URL` is set correctly
2. Verify backend CORS configuration includes frontend URL
3. Check browser console for exact error

### Issue: API Calls Fail

**Solution:**
1. Verify backend is running: `curl https://your-backend.up.railway.app/health`
2. Check backend logs in Railway dashboard
3. Ensure environment variables are set

### Issue: Build Fails

**Solution:**
1. Check Railway build logs
2. Verify `frontend/Procfile` exists
3. Ensure `serve` is in dependencies

### Issue: Notebook Execution Fails

**Solution:**
1. Check backend has sufficient resources
2. Verify Jupyter kernel is starting (check backend logs)
3. Consider upgrading Railway plan for more memory

## Complete Deployment URLs

After successful deployment, you'll have:

- **Backend API:** `https://your-backend-name.up.railway.app/api`
- **Frontend UI:** `https://your-frontend-name.up.railway.app`
- **Health Check:** `https://your-backend-name.up.railway.app/health`

## Custom Domain (Optional)

### For Backend:
1. Go to backend service → Settings → Domains
2. Click "Custom Domain"
3. Add your domain (e.g., `api.yourdomain.com`)
4. Update DNS records as instructed

### For Frontend:
1. Go to frontend service → Settings → Domains
2. Click "Custom Domain"
3. Add your domain (e.g., `lms.yourdomain.com`)
4. Update DNS records as instructed
5. Update `REACT_APP_API_URL` to use custom backend domain

## Environment Variables Summary

### Backend Service
```
SECRET_KEY=<your-secret-key>
JWT_SECRET_KEY=<your-jwt-secret>
FLASK_ENV=production
PUBLIC_FOLDER=../public
PORT=5000
FRONTEND_URL=https://your-frontend-name.up.railway.app
```

### Frontend Service
```
REACT_APP_API_URL=https://your-backend-name.up.railway.app/api
```

## Monitoring

### Backend Logs
```bash
railway logs --service backend
```

### Frontend Logs
```bash
railway logs --service frontend
```

### Metrics
- Go to Railway dashboard
- Select each service
- View "Metrics" tab for CPU, memory, network usage

## Cost Optimization

1. **Use Shared Database:** Share PostgreSQL between services
2. **Optimize Bundle Size:** Remove unused dependencies
3. **Enable Compression:** Railway serves static files compressed
4. **CDN:** Use Railway's built-in CDN for static assets

## Next Steps

1. Set up PostgreSQL database for production
2. Configure custom domains
3. Set up monitoring and alerts
4. Add SSL certificates (automatic with Railway)
5. Configure backup strategy

## Support

- Railway Docs: https://docs.railway.app
- GitHub Issues: https://github.com/architect-moaaz/training-lms/issues
