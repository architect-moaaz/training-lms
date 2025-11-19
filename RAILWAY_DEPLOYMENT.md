# Railway Deployment Guide

This guide will help you deploy the Learning Management System to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. GitHub repository set up (already done)
3. Railway CLI (optional, for local deployment)

## Deployment Steps

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Click "New Project"

2. **Deploy from GitHub**
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub account
   - Select the `architect-moaaz/training-lms` repository

3. **Configure Environment Variables**
   Click on your service, go to "Variables" tab, and add:
   
   ```
   SECRET_KEY=your-secret-key-here
   JWT_SECRET_KEY=your-jwt-secret-key-here
   FLASK_ENV=production
   PUBLIC_FOLDER=../public
   PORT=5000
   ```

   To generate secure keys, you can use:
   ```python
   import secrets
   print(secrets.token_hex(32))
   ```

4. **Deploy**
   - Railway will automatically detect the Procfile and deploy
   - Wait for the deployment to complete
   - You'll get a public URL like: `https://your-app.up.railway.app`

5. **Update Frontend Configuration**
   - Go to your frontend/.env file locally
   - Update `REACT_APP_API_URL` to your Railway backend URL
   - Rebuild and deploy frontend (see Frontend Deployment below)

### Option 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set SECRET_KEY=your-secret-key
   railway variables set JWT_SECRET_KEY=your-jwt-secret
   railway variables set FLASK_ENV=production
   railway variables set PUBLIC_FOLDER=../public
   railway variables set PORT=5000
   ```

5. **Deploy**
   ```bash
   railway up
   ```

## Frontend Deployment

The frontend needs to be deployed separately. Options:

### Option 1: Vercel (Recommended for React)

1. Go to https://vercel.com
2. Import your GitHub repository
3. Set root directory to `frontend`
4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-railway-backend-url.up.railway.app/api
   ```
5. Deploy

### Option 2: Netlify

1. Go to https://netlify.com
2. Import your GitHub repository
3. Set:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-railway-backend-url.up.railway.app/api
   ```
5. Deploy

### Option 3: Railway (Static Site)

1. Create a new service in Railway
2. Select your repository
3. Set root directory to `frontend`
4. Add build command: `npm run build`
5. Add start command: `npx serve -s build -p $PORT`
6. Set environment variable:
   ```
   REACT_APP_API_URL=https://your-railway-backend-url.up.railway.app/api
   ```

## Database Configuration

By default, the app uses SQLite. For production on Railway, use PostgreSQL:

### Steps to Add PostgreSQL Database:

1. **Add PostgreSQL to Railway Project**
   - Go to your Railway project dashboard
   - Click **"+ New"** button
   - Select **"Database"**
   - Choose **"PostgreSQL"**
   - Railway will provision a PostgreSQL database

2. **Link Database to Backend Service**

   **Option A: Using Reference Variable (Recommended)**
   - Go to your **Backend Service** → **Variables** tab
   - Click **"+ New Variable"**
   - Click **"Reference"** tab
   - Select your PostgreSQL database
   - Choose **`DATABASE_URL`** from the dropdown
   - Click **"Add"**

   **Option B: Manual Configuration**
   - Go to PostgreSQL service → **Variables** tab
   - Copy the `DATABASE_URL` value
   - Go to Backend Service → **Variables** tab
   - Add new variable:
     - Name: `DATABASE_URL`
     - Value: (paste the copied URL)

3. **Verify Configuration**
   - The app is already configured to handle PostgreSQL!
   - `psycopg2-binary` driver is included in requirements.txt
   - Database URL conversion (postgres:// → postgresql://) is automatic
   - Tables will be created automatically on first deployment

4. **Redeploy Backend**
   - After adding DATABASE_URL, Railway will automatically redeploy
   - Check deployment logs to verify database connection
   - Look for: "Database tables created successfully"

## Post-Deployment Steps

1. **Test the API**
   ```bash
   curl https://your-app.up.railway.app/health
   ```
   
   Should return: `{"status": "healthy"}`

2. **Test Registration**
   ```bash
   curl -X POST https://your-app.up.railway.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
   ```

3. **Monitor Logs**
   - In Railway dashboard, click on your service
   - Go to "Deployments" tab
   - Click on latest deployment to view logs

4. **Set Up Custom Domain (Optional)**
   - In Railway dashboard, go to "Settings"
   - Under "Domains", click "Generate Domain" or add custom domain

## Troubleshooting

### Issue: Port Binding Error
**Solution:** Make sure PORT environment variable is set correctly

### Issue: Database Connection Error
**Solution:** Check DATABASE_URL is correctly set. For PostgreSQL, ensure psycopg2-binary is in requirements.txt

### Issue: CORS Error
**Solution:** Update CORS configuration in backend/app.py to include your frontend domain

### Issue: Module Not Found
**Solution:** Ensure all dependencies are in requirements.txt and deployment logs show successful installation

### Issue: Jupyter Kernel Errors
**Solution:** Railway's ephemeral filesystem may cause issues with Jupyter kernels. Consider:
- Using a persistent volume for kernel state
- Implementing kernel cleanup on restart
- Using a stateless execution model

## Environment Variables Reference

### Backend (Railway)
```
SECRET_KEY=<generate-with-secrets.token_hex(32)>
JWT_SECRET_KEY=<generate-with-secrets.token_hex(32)>
FLASK_ENV=production
PUBLIC_FOLDER=../public
PORT=5000
DATABASE_URL=<auto-set-by-railway-if-using-postgres>
```

### Frontend (Vercel/Netlify)
```
REACT_APP_API_URL=https://your-backend.up.railway.app/api
```

## Cost Estimation

**Railway Pricing:**
- Hobby Plan: $5/month + usage
- Estimated usage for small-scale LMS: $5-15/month

**Vercel Pricing:**
- Free tier available
- Suitable for frontend hosting

**Total Estimated Cost:** $5-20/month for small to medium usage

## Scaling Considerations

1. **Database**: Upgrade to Railway's Pro PostgreSQL for better performance
2. **Caching**: Add Redis for session management
3. **CDN**: Use Railway's CDN or Cloudflare for static assets
4. **Monitoring**: Set up Railway's monitoring and alerts

## Support

For Railway-specific issues:
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

For application issues:
- GitHub Issues: https://github.com/architect-moaaz/training-lms/issues
