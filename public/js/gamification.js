// Gamification UI Components
class GamificationUI {
    constructor() {
        this.currentUser = null;
        this.socket = null;
        this.pointsAnimationQueue = [];
        this.isAnimating = false;

        this.init();
    }

    async init() {
        // Initialize Socket.io connection for real-time updates
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.setupSocketListeners();
        }

        // Load user's gamification data
        await this.loadUserProfile();

        // Setup UI event listeners
        this.setupEventListeners();

        // Initialize components
        this.initializeComponents();
    }

    setupSocketListeners() {
        if (!this.socket) {return;}

        // Listen for points updates
        this.socket.on('points-update', (data) => {
            this.handlePointsUpdate(data);
        });

        // Listen for level up
        this.socket.on('level-up', (data) => {
            this.handleLevelUp(data);
        });

        // Listen for achievement unlocks
        this.socket.on('achievements-unlocked', (achievements) => {
            this.handleAchievementsUnlocked(achievements);
        });

        // Join user room for personal notifications
        if (window.currentUser) {
            this.socket.emit('join-user-room', window.currentUser.userId);
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/gamification/profile');
            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUI();
            }
        } catch (error) {
            console.error('Error loading gamification profile:', error);
        }
    }

    setupEventListeners() {
        // Points animation click
        document.addEventListener('click', '.points-display', () => {
            this.animatePointsDisplay();
        });

        // Achievement hover effects
        document.addEventListener('mouseenter', '.achievement-item', (e) => {
            this.showAchievementTooltip(e.target);
        });

        document.addEventListener('mouseleave', '.achievement-item', () => {
            this.hideAchievementTooltip();
        });
    }

    initializeComponents() {
        this.createPointsDisplay();
        this.createLevelIndicator();
        this.createProgressBar();
        this.createAchievementsList();
        this.createLeaderboardWidget();
    }

    createPointsDisplay() {
        if (!this.currentUser) {return;}

        const pointsContainer = document.querySelector('#points-display');
        if (!pointsContainer) {return;}

        pointsContainer.innerHTML = `
            <div class="points-widget bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-semibold mb-2">คะแนนของคุณ</h3>
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-coins text-yellow-300 text-2xl"></i>
                            <span class="points-value text-3xl font-bold" id="current-points">
                                ${this.currentUser.totalPoints.toLocaleString()}
                            </span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="level-badge bg-white bg-opacity-20 rounded-full px-4 py-2">
                            <i class="${this.currentUser.levelInfo.badge} text-xl mr-2"></i>
                            <span class="font-semibold">Level ${this.currentUser.currentLevel}</span>
                        </div>
                        <p class="text-sm mt-2 opacity-80">${this.currentUser.levelInfo.title}</p>
                    </div>
                </div>
            </div>
        `;
    }

    createLevelIndicator() {
        if (!this.currentUser) {return;}

        const levelContainer = document.querySelector('#level-indicator');
        if (!levelContainer) {return;}

        const progressPercentage = this.currentUser.nextLevelInfo ?
            Math.max(0, 100 - (this.currentUser.pointsToNextLevel / (this.currentUser.nextLevelInfo.minPoints - this.currentUser.levelInfo.minPoints)) * 100) : 100;

        levelContainer.innerHTML = `
            <div class="level-progress-card bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-lg font-semibold text-gray-800">ความก้าวหน้าระดับ</h4>
                    <span class="text-sm text-gray-600">
                        ${this.currentUser.nextLevelInfo ?
        `อีก ${this.currentUser.pointsToNextLevel.toLocaleString()} คะแนน` :
        'ระดับสูงสุด'}
                    </span>
                </div>

                <div class="level-visual mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <div class="level-current">
                            <div class="w-12 h-12 rounded-full flex items-center justify-center"
                                 style="background: ${this.currentUser.levelInfo.color}">
                                <i class="${this.currentUser.levelInfo.badge} text-white"></i>
                            </div>
                            <p class="text-xs text-center mt-1 font-medium">${this.currentUser.currentLevel}</p>
                        </div>

                        <div class="flex-1 mx-4">
                            <div class="progress-bar bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                <div class="progress-fill h-full rounded-full transition-all duration-500"
                                     style="width: ${progressPercentage}%; background: linear-gradient(90deg, ${this.currentUser.levelInfo.color}, ${this.currentUser.nextLevelInfo?.color || this.currentUser.levelInfo.color})">
                                </div>
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <span class="text-xs font-medium text-gray-700">${Math.round(progressPercentage)}%</span>
                                </div>
                            </div>
                        </div>

                        ${this.currentUser.nextLevelInfo ? `
                            <div class="level-next opacity-50">
                                <div class="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                                    <i class="${this.currentUser.nextLevelInfo.badge} text-gray-400"></i>
                                </div>
                                <p class="text-xs text-center mt-1 font-medium">${this.currentUser.nextLevelInfo.level}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="level-info text-center">
                    <p class="text-sm text-gray-600 mb-2">${this.currentUser.levelInfo.title}</p>
                    ${this.currentUser.nextLevelInfo ?
        `<p class="text-xs text-gray-500">ถัดไป: ${this.currentUser.nextLevelInfo.title}</p>` :
        '<p class="text-xs text-gray-500">คุณมาถึงระดับสูงสุดแล้ว!</p>'}
                </div>
            </div>
        `;
    }

    createProgressBar() {
        if (!this.currentUser) {return;}

        const progressContainer = document.querySelector('#progress-summary');
        if (!progressContainer) {return;}

        progressContainer.innerHTML = `
            <div class="progress-summary-card bg-white rounded-lg shadow-md p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4">สรุปความก้าวหน้า</h4>

                <div class="stats-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="stat-item text-center">
                        <div class="stat-icon w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <i class="fas fa-fire text-blue-600 text-xl"></i>
                        </div>
                        <div class="stat-value text-2xl font-bold text-gray-800">${this.currentUser.loginStreak}</div>
                        <div class="stat-label text-sm text-gray-600">วันติดต่อกัน</div>
                    </div>

                    <div class="stat-item text-center">
                        <div class="stat-icon w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <i class="fas fa-trophy text-green-600 text-xl"></i>
                        </div>
                        <div class="stat-value text-2xl font-bold text-gray-800">${this.currentUser.achievements.length}</div>
                        <div class="stat-label text-sm text-gray-600">ความสำเร็จ</div>
                    </div>

                    <div class="stat-item text-center">
                        <div class="stat-icon w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <i class="fas fa-star text-purple-600 text-xl"></i>
                        </div>
                        <div class="stat-value text-2xl font-bold text-gray-800">${this.currentUser.currentLevel}</div>
                        <div class="stat-label text-sm text-gray-600">ระดับ</div>
                    </div>

                    <div class="stat-item text-center">
                        <div class="stat-icon w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <i class="fas fa-coins text-yellow-600 text-xl"></i>
                        </div>
                        <div class="stat-value text-2xl font-bold text-gray-800">${this.currentUser.totalPoints.toLocaleString()}</div>
                        <div class="stat-label text-sm text-gray-600">คะแนนรวม</div>
                    </div>
                </div>
            </div>
        `;
    }

    createAchievementsList() {
        if (!this.currentUser) {return;}

        const achievementsContainer = document.querySelector('#achievements-list');
        if (!achievementsContainer) {return;}

        const recentAchievements = this.currentUser.achievements.slice(0, 6);

        achievementsContainer.innerHTML = `
            <div class="achievements-card bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-lg font-semibold text-gray-800">ความสำเร็จล่าสุด</h4>
                    <a href="/achievements" class="text-blue-600 hover:text-blue-800 text-sm font-medium">ดูทั้งหมด</a>
                </div>

                <div class="achievements-grid grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${recentAchievements.map(achievement => `
                        <div class="achievement-item bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 text-center hover:shadow-md transition-all duration-200 cursor-pointer"
                             data-achievement-id="${achievement.id}">
                            <div class="achievement-icon w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <i class="${achievement.icon} text-yellow-600 text-xl"></i>
                            </div>
                            <h5 class="achievement-name text-sm font-semibold text-gray-800 mb-1">${achievement.name}</h5>
                            <p class="achievement-desc text-xs text-gray-600">${achievement.description}</p>
                            <div class="achievement-points text-xs text-blue-600 mt-2 font-medium">+${achievement.points} คะแนน</div>
                        </div>
                    `).join('')}
                </div>

                ${this.currentUser.achievements.length === 0 ? `
                    <div class="empty-state text-center py-8">
                        <i class="fas fa-medal text-gray-300 text-4xl mb-4"></i>
                        <p class="text-gray-500">ยังไม่มีความสำเร็จ</p>
                        <p class="text-sm text-gray-400">เริ่มเรียนเพื่อปลดล็อคความสำเร็จแรกของคุณ!</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async createLeaderboardWidget() {
        const leaderboardContainer = document.querySelector('#leaderboard-widget');
        if (!leaderboardContainer) {return;}

        try {
            const response = await fetch('/api/gamification/leaderboard?limit=5');
            if (!response.ok) {return;}

            const leaderboard = await response.json();

            leaderboardContainer.innerHTML = `
                <div class="leaderboard-card bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="text-lg font-semibold text-gray-800">ลีดเดอร์บอร์ด</h4>
                        <a href="/leaderboard" class="text-blue-600 hover:text-blue-800 text-sm font-medium">ดูทั้งหมด</a>
                    </div>

                    <div class="leaderboard-list space-y-3">
                        ${leaderboard.map(user => `
                            <div class="leaderboard-item flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div class="flex items-center space-x-3">
                                    <div class="rank-badge w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                                ${user.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
        user.rank === 2 ? 'bg-gray-100 text-gray-800' :
            user.rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}">
                                        ${user.rank}
                                    </div>
                                    <img src="${user.profileImage || '/images/default-avatar.png'}"
                                         alt="${user.firstName}"
                                         class="w-8 h-8 rounded-full">
                                    <div>
                                        <p class="font-medium text-gray-800">${user.firstName} ${user.lastName}</p>
                                        <p class="text-xs text-gray-600">Level ${user.currentLevel}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="font-semibold text-gray-800">${user.totalPoints.toLocaleString()}</p>
                                    <p class="text-xs text-gray-600">คะแนน</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading leaderboard:', error);
        }
    }

    // Real-time update handlers
    handlePointsUpdate(data) {
        this.currentUser.totalPoints = data.totalPoints;
        this.currentUser.currentLevel = data.currentLevel;

        // Update points display
        const pointsElement = document.querySelector('#current-points');
        if (pointsElement) {
            this.animateNumber(pointsElement, data.totalPoints);
        }

        // Show points gained animation
        this.showPointsGainedAnimation(data.pointsAwarded);

        // Update progress if level changed
        if (data.leveledUp) {
            this.updateLevelDisplay();
        }
    }

    handleLevelUp(data) {
        this.showLevelUpAnimation(data);
        this.updateLevelDisplay();
    }

    handleAchievementsUnlocked(achievements) {
        achievements.forEach(achievement => {
            this.showAchievementUnlockedAnimation(achievement);
        });

        // Update achievements list
        this.currentUser.achievements = [...achievements, ...this.currentUser.achievements];
        this.createAchievementsList();
    }

    // Animation methods
    animateNumber(element, targetValue) {
        const startValue = parseInt(element.textContent.replace(/,/g, ''));
        const duration = 1000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);

            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    showPointsGainedAnimation(points) {
        const pointsDisplay = document.querySelector('.points-widget');
        if (!pointsDisplay) {return;}

        const animation = document.createElement('div');
        animation.className = 'points-gained-animation absolute text-green-400 font-bold text-lg pointer-events-none z-50';
        animation.textContent = `+${points}`;
        animation.style.left = '50%';
        animation.style.top = '20%';
        animation.style.transform = 'translateX(-50%)';

        pointsDisplay.style.position = 'relative';
        pointsDisplay.appendChild(animation);

        // Animate upward and fade out
        animation.animate([
            { transform: 'translateX(-50%) translateY(0)', opacity: 1 },
            { transform: 'translateX(-50%) translateY(-30px)', opacity: 0 }
        ], {
            duration: 2000,
            easing: 'ease-out'
        }).onfinish = () => {
            animation.remove();
        };
    }

    showLevelUpAnimation(data) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-yellow-100 to-orange-100 opacity-50"></div>
                <div class="relative z-10">
                    <div class="mb-4">
                        <i class="fas fa-trophy text-yellow-500 text-6xl"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">ยินดีด้วย!</h2>
                    <p class="text-lg text-gray-700 mb-4">คุณเลื่อนขั้นสู่ระดับ ${data.newLevel} แล้ว!</p>
                    <div class="level-badge inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold mb-4">
                        <i class="${data.levelInfo.badge} mr-2"></i>
                        ${data.levelInfo.title}
                    </div>
                    <button class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            onclick="this.closest('.fixed').remove()">
                        เยี่ยมมาก!
                    </button>
                </div>

                <!-- Confetti animation -->
                <div class="confetti absolute inset-0 pointer-events-none">
                    ${Array(20).fill(0).map(() => `
                        <div class="confetti-piece absolute w-2 h-2 bg-yellow-400 transform rotate-45"></div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Animate confetti
        modal.querySelectorAll('.confetti-piece').forEach((piece, index) => {
            piece.style.left = Math.random() * 100 + '%';
            piece.style.animationDelay = (index * 100) + 'ms';
            piece.style.animation = 'confetti-fall 3s ease-out forwards';
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 5000);
    }

    showAchievementUnlockedAnimation(achievement) {
        // Create notification toast
        const toast = document.createElement('div');
        toast.className = 'achievement-toast fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300';
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="achievement-icon w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <i class="${achievement.icon} text-yellow-600 text-xl"></i>
                </div>
                <div class="flex-1">
                    <p class="font-semibold text-gray-800">ปลดล็อคความสำเร็จ!</p>
                    <p class="text-sm text-gray-600">${achievement.name}</p>
                    <p class="text-xs text-blue-600">+${achievement.points} คะแนน</p>
                </div>
                <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.achievement-toast').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Slide in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }

    updateLevelDisplay() {
        this.createLevelIndicator();
        this.createProgressBar();
    }

    updateUI() {
        this.createPointsDisplay();
        this.createLevelIndicator();
        this.createProgressBar();
        this.createAchievementsList();
    }
}

// CSS Animations
const style = document.createElement('style');
style.textContent = `
    @keyframes confetti-fall {
        to {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
        }
    }

    .achievement-toast {
        animation: slideInRight 0.3s ease-out;
    }

    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .points-display:hover {
        transform: scale(1.02);
        transition: transform 0.2s ease;
    }

    .achievement-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
`;
document.head.appendChild(style);

// Initialize gamification UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gamificationUI = new GamificationUI();
});

// Export for external use
window.GamificationUI = GamificationUI;