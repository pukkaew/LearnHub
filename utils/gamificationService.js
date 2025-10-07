const { poolPromise } = require('../config/database');

class GamificationService {
    constructor() {
        this.pointsConfig = {
            // Course actions
            COURSE_ENROLLMENT: 10,
            COURSE_COMPLETION: 100,
            LESSON_COMPLETION: 20,

            // Test actions
            TEST_ATTEMPT: 5,
            TEST_PASS: 50,
            TEST_PERFECT_SCORE: 100,
            FIRST_ATTEMPT_PASS: 25,

            // Article actions
            ARTICLE_READ: 5,
            ARTICLE_LIKE: 2,
            ARTICLE_SHARE: 5,

            // Social actions
            FORUM_POST: 10,
            FORUM_HELPFUL_ANSWER: 20,
            PROFILE_COMPLETE: 30,

            // Streak bonuses
            DAILY_LOGIN: 5,
            WEEKLY_STREAK: 50,
            MONTHLY_STREAK: 200,

            // Special achievements
            EARLY_BIRD: 15, // Complete before deadline
            NIGHT_OWL: 10, // Complete after 10 PM
            WEEKEND_WARRIOR: 20, // Complete on weekends
        };

        this.levelThresholds = [
            { level: 1, minPoints: 0, title: 'ผู้เริ่มต้น', badge: 'fas fa-seedling', color: '#10b981' },
            { level: 2, minPoints: 100, title: 'ผู้เรียนรู้', badge: 'fas fa-book', color: '#3b82f6' },
            { level: 3, minPoints: 300, title: 'ผู้ฝึกฝน', badge: 'fas fa-dumbbell', color: '#8b5cf6' },
            { level: 4, minPoints: 600, title: 'ผู้เชี่ยวชาญ', badge: 'fas fa-star', color: '#f59e0b' },
            { level: 5, minPoints: 1000, title: 'ผู้เชี่ยวชาญชั้นสูง', badge: 'fas fa-crown', color: '#ef4444' },
            { level: 6, minPoints: 1500, title: 'ผู้นำ', badge: 'fas fa-medal', color: '#06b6d4' },
            { level: 7, minPoints: 2200, title: 'ผู้เชี่ยวชาญแห่งยุค', badge: 'fas fa-trophy', color: '#8b5cf6' },
            { level: 8, minPoints: 3000, title: 'ตำนาน', badge: 'fas fa-gem', color: '#ec4899' },
            { level: 9, minPoints: 4000, title: 'ปรมาจารย์', badge: 'fas fa-fire', color: '#f97316' },
            { level: 10, minPoints: 5500, title: 'ผู้ยิ่งใหญ่', badge: 'fas fa-dragon', color: '#dc2626' }
        ];

        this.achievements = [
            // Learning achievements
            {
                id: 'first_course',
                name: 'เริ่มต้นการเรียนรู้',
                description: 'ลงทะเบียนหลักสูตรแรก',
                icon: 'fas fa-play',
                points: 25,
                condition: { type: 'course_enrollment', count: 1 }
            },
            {
                id: 'course_collector',
                name: 'นักสะสมหลักสูตร',
                description: 'ลงทะเบียน 5 หลักสูตร',
                icon: 'fas fa-layer-group',
                points: 100,
                condition: { type: 'course_enrollment', count: 5 }
            },
            {
                id: 'course_master',
                name: 'เซียนหลักสูตร',
                description: 'เรียนจบ 10 หลักสูตร',
                icon: 'fas fa-graduation-cap',
                points: 300,
                condition: { type: 'course_completion', count: 10 }
            },

            // Test achievements
            {
                id: 'first_test',
                name: 'การทดสอบครั้งแรก',
                description: 'ทำแบบทดสอบครั้งแรก',
                icon: 'fas fa-clipboard-check',
                points: 20,
                condition: { type: 'test_attempt', count: 1 }
            },
            {
                id: 'perfect_score',
                name: 'คะแนนเต็ม',
                description: 'ได้คะแนนเต็มในการทดสอบ',
                icon: 'fas fa-bullseye',
                points: 150,
                condition: { type: 'perfect_score', count: 1 }
            },
            {
                id: 'test_marathon',
                name: 'นักวิ่งมาราธอน',
                description: 'ผ่านการทดสอบ 25 ครั้ง',
                icon: 'fas fa-running',
                points: 500,
                condition: { type: 'test_pass', count: 25 }
            },

            // Streak achievements
            {
                id: 'week_warrior',
                name: 'นักรบแห่งสัปดาห์',
                description: 'เข้าระบบติดต่อกัน 7 วัน',
                icon: 'fas fa-calendar-week',
                points: 100,
                condition: { type: 'login_streak', count: 7 }
            },
            {
                id: 'month_master',
                name: 'นายเดือน',
                description: 'เข้าระบบติดต่อกัน 30 วัน',
                icon: 'fas fa-calendar-alt',
                points: 300,
                condition: { type: 'login_streak', count: 30 }
            },

            // Special achievements
            {
                id: 'early_bird',
                name: 'นกตัวแรก',
                description: 'ส่งงานก่อนกำหนด 10 ครั้ง',
                icon: 'fas fa-sun',
                points: 200,
                condition: { type: 'early_submission', count: 10 }
            },
            {
                id: 'night_owl',
                name: 'นกฮูก',
                description: 'เรียนหลังเที่ยงคืน 20 ครั้ง',
                icon: 'fas fa-moon',
                points: 150,
                condition: { type: 'night_study', count: 20 }
            },
            {
                id: 'social_butterfly',
                name: 'ผีเสื้อสังคม',
                description: 'โพสต์ในฟอรั่ม 50 ครั้ง',
                icon: 'fas fa-comments',
                points: 250,
                condition: { type: 'forum_posts', count: 50 }
            },
            {
                id: 'helper',
                name: 'ผู้ช่วยเหลือ',
                description: 'ตอบคำถามที่เป็นประโยชน์ 10 ครั้ง',
                icon: 'fas fa-hands-helping',
                points: 200,
                condition: { type: 'helpful_answers', count: 10 }
            }
        ];
    }

    // Award points to user
    async awardPoints(userId, action, metadata = {}) {
        try {
            const points = this.pointsConfig[action];
            if (!points) {
                console.warn(`Unknown gamification action: ${action}`);
                return null;
            }

            const pool = await poolPromise;

            // Get current user points
            const userResult = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT totalPoints, currentLevel, lastLevelUp
                    FROM user_profiles
                    WHERE userId = @userId
                `);

            const currentPoints = userResult.recordset[0]?.totalPoints || 0;
            const currentLevel = userResult.recordset[0]?.currentLevel || 1;
            const newPoints = currentPoints + points;

            // Calculate new level
            const newLevel = this.calculateLevel(newPoints);
            const leveledUp = newLevel > currentLevel;

            // Update user points and level
            await pool.request()
                .input('userId', userId)
                .input('totalPoints', newPoints)
                .input('currentLevel', newLevel)
                .input('lastLevelUp', leveledUp ? new Date() : userResult.recordset[0]?.lastLevelUp)
                .query(`
                    UPDATE user_profiles
                    SET totalPoints = @totalPoints,
                        currentLevel = @currentLevel,
                        lastLevelUp = @lastLevelUp,
                        updatedAt = GETDATE()
                    WHERE userId = @userId

                    IF @@ROWCOUNT = 0
                    INSERT INTO user_profiles (userId, totalPoints, currentLevel, lastLevelUp, createdAt)
                    VALUES (@userId, @totalPoints, @currentLevel, @lastLevelUp, GETDATE())
                `);

            // Record points transaction
            await pool.request()
                .input('userId', userId)
                .input('action', action)
                .input('points', points)
                .input('metadata', JSON.stringify(metadata))
                .query(`
                    INSERT INTO points_transactions (userId, action, points, metadata, createdAt)
                    VALUES (@userId, @action, @points, @metadata, GETDATE())
                `);

            // Check for achievements
            const unlockedAchievements = await this.checkAchievements(userId);

            const result = {
                pointsAwarded: points,
                totalPoints: newPoints,
                previousLevel: currentLevel,
                currentLevel: newLevel,
                leveledUp,
                unlockedAchievements
            };

            // Broadcast real-time update if Socket.io is available
            this.broadcastPointsUpdate(userId, result);

            return result;

        } catch (error) {
            console.error('Error awarding points:', error);
            throw error;
        }
    }

    // Calculate user level based on points
    calculateLevel(points) {
        for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
            if (points >= this.levelThresholds[i].minPoints) {
                return this.levelThresholds[i].level;
            }
        }
        return 1;
    }

    // Get level info
    getLevelInfo(level) {
        return this.levelThresholds.find(l => l.level === level) || this.levelThresholds[0];
    }

    // Check and unlock achievements
    async checkAchievements(userId) {
        try {
            const pool = await poolPromise;
            const unlockedAchievements = [];

            // Get user stats
            const statsResult = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT
                        (SELECT COUNT(*) FROM UserCourses WHERE userId = @userId) as courseEnrollments,
                        (SELECT COUNT(*) FROM UserCourses WHERE userId = @userId AND status = 'completed') as courseCompletions,
                        (SELECT COUNT(*) FROM TestResults WHERE userId = @userId) as testAttempts,
                        (SELECT COUNT(*) FROM TestResults WHERE userId = @userId AND passed = 1) as testPasses,
                        (SELECT COUNT(*) FROM TestResults WHERE userId = @userId AND score = totalScore) as perfectScores,
                        (SELECT COUNT(*) FROM ForumPosts WHERE userId = @userId) as forumPosts,
                        (SELECT COUNT(*) FROM ForumPosts WHERE userId = @userId AND isHelpful = 1) as helpfulAnswers,
                        (SELECT MAX(loginStreak) FROM user_profiles WHERE userId = @userId) as maxLoginStreak
                `);

            const stats = statsResult.recordset[0];

            // Get already unlocked achievements
            const unlockedResult = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT achievementId FROM user_achievements WHERE userId = @userId
                `);

            const unlockedIds = unlockedResult.recordset.map(r => r.achievementId);

            // Check each achievement
            for (const achievement of this.achievements) {
                if (unlockedIds.includes(achievement.id)) {continue;}

                let unlocked = false;

                switch (achievement.condition.type) {
                case 'course_enrollment':
                    unlocked = stats.courseEnrollments >= achievement.condition.count;
                    break;
                case 'course_completion':
                    unlocked = stats.courseCompletions >= achievement.condition.count;
                    break;
                case 'test_attempt':
                    unlocked = stats.testAttempts >= achievement.condition.count;
                    break;
                case 'test_pass':
                    unlocked = stats.testPasses >= achievement.condition.count;
                    break;
                case 'perfect_score':
                    unlocked = stats.perfectScores >= achievement.condition.count;
                    break;
                case 'forum_posts':
                    unlocked = stats.forumPosts >= achievement.condition.count;
                    break;
                case 'helpful_answers':
                    unlocked = stats.helpfulAnswers >= achievement.condition.count;
                    break;
                case 'login_streak':
                    unlocked = stats.maxLoginStreak >= achievement.condition.count;
                    break;
                }

                if (unlocked) {
                    // Unlock achievement
                    await pool.request()
                        .input('userId', userId)
                        .input('achievementId', achievement.id)
                        .query(`
                            INSERT INTO user_achievements (userId, achievementId, unlockedAt)
                            VALUES (@userId, @achievementId, GETDATE())
                        `);

                    // Award achievement points
                    await this.awardPoints(userId, 'ACHIEVEMENT_UNLOCK', {
                        achievementId: achievement.id,
                        achievementName: achievement.name
                    });

                    unlockedAchievements.push(achievement);
                }
            }

            return unlockedAchievements;

        } catch (error) {
            console.error('Error checking achievements:', error);
            return [];
        }
    }

    // Get user gamification profile
    async getUserProfile(userId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT
                        up.totalPoints,
                        up.currentLevel,
                        up.lastLevelUp,
                        up.loginStreak,
                        up.lastLoginDate,
                        u.firstName,
                        u.lastName,
                        u.profileImage
                    FROM user_profiles up
                    INNER JOIN Users u ON up.userId = u.userId
                    WHERE up.userId = @userId
                `);

            if (result.recordset.length === 0) {
                return null;
            }

            const profile = result.recordset[0];
            const levelInfo = this.getLevelInfo(profile.currentLevel);
            const nextLevelInfo = this.getLevelInfo(profile.currentLevel + 1);

            // Get achievements
            const achievementsResult = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT ua.achievementId, ua.unlockedAt
                    FROM user_achievements ua
                    WHERE ua.userId = @userId
                    ORDER BY ua.unlockedAt DESC
                `);

            const userAchievements = achievementsResult.recordset.map(ua => {
                const achievement = this.achievements.find(a => a.id === ua.achievementId);
                return {
                    ...achievement,
                    unlockedAt: ua.unlockedAt
                };
            });

            // Get recent points transactions
            const transactionsResult = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT TOP 10 action, points, metadata, createdAt
                    FROM points_transactions
                    WHERE userId = @userId
                    ORDER BY createdAt DESC
                `);

            return {
                userId,
                name: `${profile.firstName} ${profile.lastName}`,
                profileImage: profile.profileImage,
                totalPoints: profile.totalPoints || 0,
                currentLevel: profile.currentLevel || 1,
                levelInfo,
                nextLevelInfo,
                pointsToNextLevel: nextLevelInfo ? nextLevelInfo.minPoints - profile.totalPoints : 0,
                loginStreak: profile.loginStreak || 0,
                lastLoginDate: profile.lastLoginDate,
                achievements: userAchievements,
                recentTransactions: transactionsResult.recordset
            };

        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }

    // Get leaderboard
    async getLeaderboard(type = 'points', limit = 10, departmentId = null) {
        try {
            const pool = await poolPromise;

            let query = '';
            let orderBy = '';

            switch (type) {
            case 'points':
                orderBy = 'up.totalPoints DESC';
                break;
            case 'level':
                orderBy = 'up.currentLevel DESC, up.totalPoints DESC';
                break;
            case 'streak':
                orderBy = 'up.loginStreak DESC';
                break;
            case 'achievements':
                orderBy = 'achievementCount DESC';
                break;
            }

            query = `
                SELECT TOP ${limit}
                    u.userId,
                    u.firstName,
                    u.lastName,
                    u.profileImage,
                    u.departmentId,
                    d.name as departmentName,
                    up.totalPoints,
                    up.currentLevel,
                    up.loginStreak,
                    up.lastLoginDate,
                    (SELECT COUNT(*) FROM user_achievements WHERE userId = u.userId) as achievementCount
                FROM Users u
                INNER JOIN user_profiles up ON u.userId = up.userId
                LEFT JOIN Departments d ON u.departmentId = d.departmentId
                WHERE u.isActive = 1
                ${departmentId ? 'AND u.departmentId = @departmentId' : ''}
                ORDER BY ${orderBy}
            `;

            const request = pool.request();
            if (departmentId) {
                request.input('departmentId', departmentId);
            }

            const result = await request.query(query);

            return result.recordset.map((user, index) => ({
                rank: index + 1,
                ...user,
                levelInfo: this.getLevelInfo(user.currentLevel)
            }));

        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    // Update login streak
    async updateLoginStreak(userId) {
        try {
            const pool = await poolPromise;

            const result = await pool.request()
                .input('userId', userId)
                .query(`
                    SELECT loginStreak, lastLoginDate
                    FROM user_profiles
                    WHERE userId = @userId
                `);

            const profile = result.recordset[0];
            const today = new Date();
            const lastLogin = profile?.lastLoginDate ? new Date(profile.lastLoginDate) : null;

            let newStreak = 1;

            if (lastLogin) {
                const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

                if (daysDiff === 0) {
                    // Same day, no change
                    return profile.loginStreak || 1;
                } else if (daysDiff === 1) {
                    // Consecutive day
                    newStreak = (profile.loginStreak || 0) + 1;
                } else {
                    // Streak broken
                    newStreak = 1;
                }
            }

            // Update streak
            await pool.request()
                .input('userId', userId)
                .input('loginStreak', newStreak)
                .input('lastLoginDate', today)
                .query(`
                    UPDATE user_profiles
                    SET loginStreak = @loginStreak,
                        lastLoginDate = @lastLoginDate,
                        updatedAt = GETDATE()
                    WHERE userId = @userId

                    IF @@ROWCOUNT = 0
                    INSERT INTO user_profiles (userId, loginStreak, lastLoginDate, createdAt)
                    VALUES (@userId, @loginStreak, @lastLoginDate, GETDATE())
                `);

            // Award streak bonuses
            if (newStreak >= 7 && newStreak % 7 === 0) {
                await this.awardPoints(userId, 'WEEKLY_STREAK', { streak: newStreak });
            }

            if (newStreak >= 30 && newStreak % 30 === 0) {
                await this.awardPoints(userId, 'MONTHLY_STREAK', { streak: newStreak });
            }

            return newStreak;

        } catch (error) {
            console.error('Error updating login streak:', error);
            throw error;
        }
    }

    // Broadcast real-time updates
    broadcastPointsUpdate(userId, data) {
        // This will be called by Socket.io if available
        if (global.io) {
            global.io.to(`user-${userId}`).emit('points-update', data);

            if (data.leveledUp) {
                global.io.to(`user-${userId}`).emit('level-up', {
                    newLevel: data.currentLevel,
                    levelInfo: this.getLevelInfo(data.currentLevel)
                });
            }

            if (data.unlockedAchievements.length > 0) {
                global.io.to(`user-${userId}`).emit('achievements-unlocked', data.unlockedAchievements);
            }
        }
    }

    // Get system stats
    async getSystemStats() {
        try {
            const pool = await poolPromise;

            const result = await pool.request().query(`
                SELECT
                    (SELECT COUNT(*) FROM user_profiles) as totalUsers,
                    (SELECT SUM(totalPoints) FROM user_profiles) as totalPointsAwarded,
                    (SELECT COUNT(*) FROM user_achievements) as totalAchievementsUnlocked,
                    (SELECT AVG(CAST(currentLevel AS FLOAT)) FROM user_profiles) as averageLevel,
                    (SELECT MAX(totalPoints) FROM user_profiles) as highestPoints,
                    (SELECT MAX(loginStreak) FROM user_profiles) as longestStreak
            `);

            return result.recordset[0];

        } catch (error) {
            console.error('Error getting system stats:', error);
            throw error;
        }
    }
}

// Export singleton instance
const gamificationService = new GamificationService();

module.exports = gamificationService;