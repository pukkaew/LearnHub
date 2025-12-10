const { poolPromise, sql } = require('./config/database');
const User = require('./models/User');

async function testArticleAccess() {
    try {
        // Simulate getting user data like the middleware does
        const userId = 17; // admin user
        const user = await User.findById(userId);

        console.log('=== User Object from User.findById() ===');
        console.log('Full user object:', JSON.stringify(user, null, 2));
        console.log('\n=== Key Properties ===');
        console.log('user.role:', user?.role);
        console.log('user.role_name:', user?.role_name);
        console.log('user.role_id:', user?.role_id);

        // Simulate the check in articleController
        const userRole = user?.role || user?.role_name;
        console.log('\n=== Role Resolution ===');
        console.log('Resolved userRole (user.role || user.role_name):', userRole);

        const allowedRoles = ['Admin', 'Instructor', 'Learner'];
        console.log('Allowed roles:', allowedRoles);
        console.log('Is userRole in allowed list?', allowedRoles.includes(userRole));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testArticleAccess();
