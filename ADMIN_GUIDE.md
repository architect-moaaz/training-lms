# Admin System Guide

## Overview

The LMS now includes a comprehensive admin system for user management and analytics.

## Admin User Creation

### Creating the Admin User

```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python create_admin.py
```

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@lms.local`

**IMPORTANT**: Change the password after first login!

## Admin Features

### 1. User Management

Admins can:
- View all registered users with detailed statistics
- View individual user details including:
  - Registration information (IP, location, date)
  - Total time spent on platform
  - Pages visited
  - Progress through course days
- Reset user passwords
- Delete user accounts

### 2. Location Tracking

When users register, the system automatically captures:
- **IP Address**: The user's IP address
- **Country**: Determined from IP using ip-api.com
- **City**: Determined from IP using ip-api.com

### 3. Page Time Tracking

The system tracks:
- Pages visited by each user
- Time spent on each page (in seconds)
- Number of visits to each page
- Last visit timestamp

## API Endpoints

### Admin Endpoints (Require Admin Token)

#### Get All Users
```http
GET /api/admin/users
Authorization: Bearer <admin_jwt_token>
```

**Response**:
```json
{
  "users": [
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "is_admin": false,
      "created_at": "2025-11-19T12:00:00",
      "last_login": "2025-11-19T14:30:00",
      "registration_ip": "203.0.113.45",
      "registration_country": "United States",
      "registration_city": "New York",
      "total_pages_visited": 15,
      "total_time_spent": 3600,
      "total_days_progress": 5,
      "completed_days": 2
    }
  ],
  "total_users": 10
}
```

#### Get User Details
```http
GET /api/admin/users/:user_id
Authorization: Bearer <admin_jwt_token>
```

**Response**:
```json
{
  "id": 2,
  "username": "jane_smith",
  "email": "jane@example.com",
  "is_admin": false,
  "registration_ip": "198.51.100.23",
  "registration_country": "Canada",
  "registration_city": "Toronto",
  "page_tracking": [
    {
      "page_url": "/dashboard",
      "page_title": "Dashboard",
      "time_spent": 450,
      "visit_count": 5,
      "last_visited": "2025-11-19T15:00:00"
    }
  ],
  "total_pages_visited": 10,
  "total_time_spent": 2400,
  "progress": [
    {
      "day_number": 1,
      "completed": true,
      "time_spent": 600,
      "last_accessed": "2025-11-19T13:00:00"
    }
  ]
}
```

#### Reset User Password
```http
POST /api/admin/users/:user_id/reset-password
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "new_password": "newpassword123"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### Delete User
```http
DELETE /api/admin/users/:user_id
Authorization: Bearer <admin_jwt_token>
```

**Response**:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Note**: Admins cannot delete themselves.

### Page Tracking Endpoints (User)

#### Track Page Time
```http
POST /api/track/page
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "page_url": "/dashboard",
  "page_title": "Dashboard",
  "time_spent": 45
}
```

**Response**:
```json
{
  "success": true,
  "tracking": {
    "page_url": "/dashboard",
    "page_title": "Dashboard",
    "time_spent": 45,
    "visit_count": 1,
    "last_visited": "2025-11-19T15:30:00"
  }
}
```

#### Get User's Page Tracking
```http
GET /api/track/pages
Authorization: Bearer <jwt_token>
```

**Response**:
```json
{
  "tracking": [
    {
      "page_url": "/dashboard",
      "time_spent": 450,
      "visit_count": 5
    }
  ],
  "total_pages": 10,
  "total_time": 2400
}
```

## Database Schema

### User Model

```python
class User:
    id: Integer (Primary Key)
    username: String(80) (Unique)
    email: String(120) (Unique)
    password_hash: String(255)
    is_admin: Boolean (Default: False)
    created_at: DateTime
    last_login: DateTime
    registration_ip: String(45)
    registration_country: String(100)
    registration_city: String(100)
```

### PageTimeTracking Model

```python
class PageTimeTracking:
    id: Integer (Primary Key)
    user_id: Integer (Foreign Key)
    page_url: String(255)
    page_title: String(255)
    time_spent: Integer (seconds)
    visit_count: Integer
    last_visited: DateTime
    created_at: DateTime
```

## Security Considerations

1. **Admin Access**: Only users with `is_admin=True` can access admin endpoints
2. **IP Geolocation**: Uses free ip-api.com service (45 requests/minute limit)
3. **Password Reset**: Minimum 6 characters required
4. **Self-Protection**: Admins cannot delete their own accounts
5. **JWT Required**: All endpoints require valid JWT authentication

## Railway Deployment

### Creating Admin User on Railway

1. **Via Railway CLI**:
```bash
railway run python backend/create_admin.py
```

2. **Via Railway Dashboard**:
   - Go to your backend service
   - Open the deployment
   - Run command: `python backend/create_admin.py`

### Environment Variables

No additional environment variables are required for the admin system. It uses the existing:
- `DATABASE_URL` - For database connection
- `JWT_SECRET_KEY` - For JWT token verification

## Usage Examples

### Login as Admin

```bash
curl -X POST https://your-api.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "admin",
    "password": "admin123"
  }'
```

### Get All Users (Admin)

```bash
curl https://your-api.railway.app/api/admin/users \
  -H "Authorization: Bearer <admin_token>"
```

### Track Page Time

```bash
curl -X POST https://your-api.railway.app/api/track/page \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "page_url": "/day/1",
    "page_title": "Day 1: Introduction",
    "time_spent": 120
  }'
```

## Best Practices

1. **Change Default Password**: Immediately after creating the admin account
2. **Regular Monitoring**: Check user activity and time spent regularly
3. **Privacy**: User location data is for analytics only, handle responsibly
4. **Backup**: Regularly backup the database containing user data
5. **Rate Limiting**: Consider implementing rate limiting for API endpoints

## Troubleshooting

### Admin user not created
- Ensure database is accessible
- Check that database tables are created
- Run `db.create_all()` if needed

### Cannot access admin endpoints
- Verify JWT token is valid
- Ensure user has `is_admin=True` in database
- Check Authorization header format: `Bearer <token>`

### Location not tracking
- ip-api.com might be rate-limited (45 req/min)
- Local IPs (127.0.0.1, 192.168.x.x) show as "Local"
- Network issues may prevent geolocation lookup
