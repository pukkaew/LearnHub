// Test MSSQL database connection
require('dotenv').config();
const { poolPromise, sql } = require('./config/database');

async function testConnection() {
    try {
        console.log('Testing MSSQL database connection...');

        const pool = await poolPromise;
        console.log('✅ Successfully connected to MSSQL database');

        // Test basic query
        const result = await pool.request().query('SELECT GETDATE() as current_time, @@VERSION as version');
        console.log('✅ Database query test successful');
        console.log('Current time:', result.recordset[0].current_time);
        console.log('SQL Server version:', result.recordset[0].version.substring(0, 50) + '...');

        // Test if tables exist
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);

        if (tablesResult.recordset.length > 0) {
            console.log('✅ Database tables found:');
            tablesResult.recordset.forEach(table => {
                console.log(`  - ${table.TABLE_NAME}`);
            });
        } else {
            console.log('⚠️  No tables found. You may need to run the schema creation script.');
            console.log('   Use: sqlcmd -S localhost -d LearnHub -U your_user -P your_pass -i database/schema.sql');
        }

        console.log('\n🎉 Database connection test completed successfully!');

    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error('Error:', error.message);

        if (error.code === 'ELOGIN') {
            console.error('\n💡 Troubleshooting tips:');
            console.error('1. Check your DB_USER and DB_PASSWORD in .env file');
            console.error('2. Ensure SQL Server Authentication is enabled');
            console.error('3. Verify the user has access to the database');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Troubleshooting tips:');
            console.error('1. Ensure SQL Server is running');
            console.error('2. Check DB_SERVER and DB_PORT in .env file');
            console.error('3. Verify TCP/IP is enabled in SQL Server Configuration');
        } else if (error.code === 'ESOCKET') {
            console.error('\n💡 Troubleshooting tips:');
            console.error('1. Check network connectivity to SQL Server');
            console.error('2. Verify firewall settings');
            console.error('3. Ensure the server name/IP is correct');
        }

        console.error('\n📋 Current configuration:');
        console.error(`Server: ${process.env.DB_SERVER || 'localhost'}`);
        console.error(`Database: ${process.env.DB_DATABASE || 'LearnHub'}`);
        console.error(`User: ${process.env.DB_USER || 'not set'}`);
        console.error(`Port: ${process.env.DB_PORT || 1433}`);

        process.exit(1);
    }
}

// Run the test
testConnection();