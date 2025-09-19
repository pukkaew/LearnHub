# MSSQL Database Setup for Ruxchai LearnHub

This guide explains how to set up Microsoft SQL Server for the Ruxchai LearnHub application.

## Prerequisites

1. **SQL Server Installation**
   - Install Microsoft SQL Server (Express, Standard, or Enterprise)
   - Install SQL Server Management Studio (SSMS) for database management

2. **Database Configuration**
   - Ensure SQL Server is running
   - Enable SQL Server Authentication (mixed mode)
   - Create a dedicated database user for the application

## Setup Instructions

### 1. Create Database and User

Connect to SQL Server using SSMS or command line and run:

```sql
-- Create the database
CREATE DATABASE LearnHub;

-- Switch to the new database
USE LearnHub;

-- Create a login for the application
CREATE LOGIN learnhub_user WITH PASSWORD = 'YourSecurePassword123!';

-- Create a user in the database
CREATE USER learnhub_user FOR LOGIN learnhub_user;

-- Grant necessary permissions
ALTER ROLE db_owner ADD MEMBER learnhub_user;
```

### 2. Run Database Schema

Execute the complete database file to create all tables, stored procedures, and initial data:

```bash
# Navigate to the project directory
cd D:\App\LearnHub

# Run the database file using sqlcmd (if available)
sqlcmd -S localhost -d LearnHub -U learnhub_user -P YourSecurePassword123! -i database\learnhub_database.sql

# Or use SQL Server Management Studio:
# 1. Open SSMS
# 2. Connect to your SQL Server instance
# 3. Open the file: database/learnhub_database.sql
# 4. Execute the script
```

**Note:** The `learnhub_database.sql` file includes:
- All core tables (Users, Courses, Tests, etc.)
- JWT Authentication tables (RefreshTokens, ApiKeys, SecurityPolicies)
- Gamification system (Points, Badges, Leaderboards, Achievements)
- Proctoring system (Sessions, Violations, Screenshots, Reports)
- System settings and audit logs
- Stored procedures for leaderboards and integrity scoring
- Initial default data and security policies

### 3. Configure Environment Variables

Create or update your `.env` file with the following MSSQL configuration:

```env
# Database Configuration (MSSQL)
DB_SERVER=localhost
DB_DATABASE=LearnHub
DB_USER=learnhub_user
DB_PASSWORD=YourSecurePassword123!
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# JWT Secret
JWT_SECRET=your-jwt-secret-key-here

# Encryption Key
ENCRYPTION_KEY=your-encryption-key-here

# Session Secret
SESSION_SECRET=your-session-secret-here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Application Settings
NODE_ENV=development
PORT=3000

# File Upload Settings
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### 4. Install Dependencies

Install the required Node.js packages:

```bash
npm install
```

### 5. Start the Application

**Note:** The database already includes initial data from `learnhub_database.sql`, so no separate seeding is required.

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Default Login Credentials

The database script includes a default admin account:

- **Admin**: `admin` / `admin123` (change immediately after first login)

Additional default roles are created:
- SuperAdmin - Full system access
- Admin - System administration
- Instructor - Course and test management
- Student - Course access and test taking
- HR - HR management functions
- Viewer - Limited view access

## Database Connection Troubleshooting

### Common Issues and Solutions

1. **Connection refused**
   - Ensure SQL Server is running
   - Check if TCP/IP is enabled in SQL Server Configuration Manager
   - Verify the port number (default: 1433)

2. **Login failed**
   - Verify username and password
   - Ensure SQL Server Authentication is enabled (mixed mode)
   - Check user permissions

3. **Certificate errors**
   - Set `DB_TRUST_SERVER_CERTIFICATE=true` in .env file
   - For production, use proper SSL certificates

4. **Firewall issues**
   - Ensure port 1433 is open in Windows Firewall
   - Check network firewall settings

### SQL Server Configuration

Enable TCP/IP protocol:
1. Open SQL Server Configuration Manager
2. Go to "SQL Server Network Configuration" → "Protocols for MSSQLSERVER"
3. Enable "TCP/IP"
4. Restart SQL Server service

Enable SQL Server Authentication:
1. Connect to SQL Server with SSMS
2. Right-click server → Properties
3. Go to Security tab
4. Select "SQL Server and Windows Authentication mode"
5. Restart SQL Server service

## Performance Optimization

For better performance, consider:

1. **Indexes**: The database includes optimized indexes for all major tables
2. **Memory**: Allocate sufficient memory to SQL Server
3. **Backup**: Set up regular database backups
4. **Monitoring**: Use SQL Server Profiler for query optimization
5. **Stored Procedures**: Use included stored procedures for complex operations:
   - `sp_UpdateLeaderboards` - Update gamification leaderboards
   - `sp_CalculateIntegrityScore` - Calculate proctoring integrity scores
6. **Views**: Use the `vw_ProctoringDashboard` view for monitoring test sessions

## Security Considerations

1. Use strong passwords for database users
2. Enable encryption for data in transit
3. Regularly update SQL Server
4. Limit database user permissions to only what's needed
5. Use connection pooling to manage database connections efficiently

## Production Deployment

For production environments:

1. Use a dedicated SQL Server instance
2. Set up SSL/TLS encryption
3. Configure backup and recovery procedures
4. Monitor database performance
5. Set up connection pooling with appropriate limits
6. Use environment-specific configuration files

## Support

If you encounter issues:

1. Check the application logs
2. Check SQL Server error logs
3. Verify network connectivity
4. Ensure all environment variables are correctly set
5. Verify database schema is properly created

The application uses connection pooling and parameterized queries to ensure optimal performance and security.