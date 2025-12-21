/**
 * Database Configuration for SQL Server
 * Uses mssql package for connection
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'LearnHub',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
        enableArithAbort: true
    },
    pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        min: parseInt(process.env.DB_POOL_MIN || '0', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10)
    }
};

// Create connection pool
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to SQL Server database');
        return pool;
    })
    .catch(err => {
        console.error('Database Connection Failed!', err);
        throw err;
    });

/**
 * Get database connection
 * @returns {Promise<sql.ConnectionPool>}
 */
async function getConnection() {
    return poolPromise;
}

/**
 * Execute a query with parameters
 * @param {string} query - SQL query string
 * @param {Object} params - Query parameters
 * @returns {Promise<sql.IResult>}
 */
async function executeQuery(query, params = {}) {
    const pool = await poolPromise;
    const request = pool.request();

    // Add parameters
    for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
    }

    return request.query(query);
}

/**
 * Execute a stored procedure
 * @param {string} procedureName - Stored procedure name
 * @param {Object} params - Procedure parameters
 * @returns {Promise<sql.IProcedureResult>}
 */
async function executeProcedure(procedureName, params = {}) {
    const pool = await poolPromise;
    const request = pool.request();

    // Add parameters
    for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
    }

    return request.execute(procedureName);
}

/**
 * Begin a transaction
 * @returns {Promise<sql.Transaction>}
 */
async function beginTransaction() {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    return transaction;
}

module.exports = {
    sql,
    poolPromise,
    config,
    getConnection,
    executeQuery,
    executeProcedure,
    beginTransaction
};
