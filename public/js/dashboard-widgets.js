// Enhanced Dashboard Widgets with Real-time Updates
class DashboardManager {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.widgets = {};
        this.refreshIntervals = {};
        this.init();
    }

    init() {
        this.setupSocketConnection();
        this.initializeWidgets();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.loadUserStats();
    }

    setupSocketConnection() {
        // Connect to Socket.io server
        if (typeof io !== 'undefined') {
            this.socket = io('/dashboard', {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });

            this.socket.on('connect', () => {
                console.log('Dashboard connected to real-time updates');
                this.showNotification('เชื่อมต่อระบบสำเร็จ', 'success');
            });

            this.socket.on('disconnect', () => {
                console.log('Dashboard disconnected from real-time updates');
            });

            // Real-time event listeners
            this.socket.on('stats-update', (data) => this.updateStats(data));
            this.socket.on('new-notification', (data) => this.handleNewNotification(data));
            this.socket.on('course-progress', (data) => this.updateCourseProgress(data));
            this.socket.on('achievement-unlocked', (data) => this.showAchievement(data));
            this.socket.on('leaderboard-update', (data) => this.updateLeaderboard(data));
        }
    }

    initializeWidgets() {
        // Initialize all dashboard widgets
        this.widgets = {
            stats: new StatsWidget(),
            progress: new ProgressWidget(),
            calendar: new CalendarWidget(),
            notifications: new NotificationsWidget(),
            leaderboard: new LeaderboardWidget(),
            activities: new ActivitiesWidget(),
            achievements: new AchievementsWidget(),
            analytics: new AnalyticsWidget()
        };

        // Initialize charts
        this.initCharts();
    }

    initCharts() {
        // Learning Progress Chart
        const progressCtx = document.getElementById('progressChart');
        if (progressCtx) {
            this.charts.progress = new Chart(progressCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'ความคืบหน้าการเรียน',
                        data: [],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }

        // Activity Heatmap
        const heatmapCtx = document.getElementById('activityHeatmap');
        if (heatmapCtx) {
            this.charts.heatmap = new Chart(heatmapCtx, {
                type: 'matrix',
                data: {
                    datasets: [{
                        label: 'กิจกรรมการเรียน',
                        data: [],
                        backgroundColor(context) {
                            const value = context.dataset.data[context.dataIndex].v;
                            const alpha = value / 10;
                            return `rgba(59, 130, 246, ${alpha})`;
                        },
                        borderColor: 'rgb(255, 255, 255)',
                        borderWidth: 1,
                        width: 20,
                        height: 20
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title() {
                                    return '';
                                },
                                label(context) {
                                    return `${context.raw.v} กิจกรรม`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'category',
                            labels: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'],
                            offset: true,
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            type: 'category',
                            offset: true,
                            reverse: true,
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // Performance Radar Chart
        const radarCtx = document.getElementById('performanceRadar');
        if (radarCtx) {
            this.charts.radar = new Chart(radarCtx, {
                type: 'radar',
                data: {
                    labels: ['การเข้าเรียน', 'คะแนนสอบ', 'การส่งงาน', 'การมีส่วนร่วม', 'ความก้าวหน้า'],
                    datasets: [{
                        label: 'ประสิทธิภาพ',
                        data: [0, 0, 0, 0, 0],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(59, 130, 246)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: {
                                display: false
                            },
                            suggestedMin: 0,
                            suggestedMax: 100
                        }
                    }
                }
            });
        }
    }

    async loadUserStats() {
        try {
            const response = await fetch('/api/dashboard/stats');
            const data = await response.json();

            if (data.success) {
                this.updateStats(data.data);
            }
        } catch (error) {
            console.error('Error loading user stats:', error);
        }
    }

    updateStats(data) {
        // Update stat cards
        this.animateNumber('user-level', data.level || 1);
        this.animateNumber('user-points', data.points || 0);
        this.animateNumber('courses-enrolled', data.coursesEnrolled || 0);
        this.animateNumber('courses-completed', data.coursesCompleted || 0);
        this.animateNumber('tests-passed', data.testsPassed || 0);
        this.animateNumber('articles-written', data.articlesWritten || 0);
        this.animateNumber('total-hours', data.totalHours || 0);
        this.animateNumber('current-streak', data.currentStreak || 0);

        // Update progress bars
        this.updateProgressBar('overall-progress', data.overallProgress || 0);
        this.updateProgressBar('weekly-goal', data.weeklyGoalProgress || 0);
        this.updateProgressBar('monthly-target', data.monthlyTargetProgress || 0);

        // Update charts
        if (this.charts.progress && data.progressHistory) {
            this.updateProgressChart(data.progressHistory);
        }

        if (this.charts.heatmap && data.activityHeatmap) {
            this.updateHeatmapChart(data.activityHeatmap);
        }

        if (this.charts.radar && data.performanceMetrics) {
            this.updateRadarChart(data.performanceMetrics);
        }
    }

    animateNumber(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = Math.floor(startValue + (targetValue - startValue) * this.easeOutQuad(progress));
            element.textContent = this.formatNumber(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    easeOutQuad(t) {
        return t * (2 - t);
    }

    formatNumber(num) {
        return new Intl.NumberFormat('th-TH').format(num);
    }

    updateProgressBar(elementId, percentage) {
        const progressBar = document.querySelector(`#${elementId} .progress-fill`);
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;

            const label = progressBar.parentElement.querySelector('.progress-label');
            if (label) {
                label.textContent = `${percentage}%`;
            }

            // Change color based on percentage
            if (percentage >= 80) {
                progressBar.classList.add('bg-green-500');
                progressBar.classList.remove('bg-yellow-500', 'bg-red-500');
            } else if (percentage >= 50) {
                progressBar.classList.add('bg-yellow-500');
                progressBar.classList.remove('bg-green-500', 'bg-red-500');
            } else {
                progressBar.classList.add('bg-red-500');
                progressBar.classList.remove('bg-green-500', 'bg-yellow-500');
            }
        }
    }

    updateProgressChart(data) {
        const labels = data.map(d => d.date);
        const values = data.map(d => d.progress);

        this.charts.progress.data.labels = labels;
        this.charts.progress.data.datasets[0].data = values;
        this.charts.progress.update('none');
    }

    updateHeatmapChart(data) {
        const formattedData = [];
        data.forEach((week, weekIndex) => {
            week.forEach((value, dayIndex) => {
                formattedData.push({
                    x: dayIndex,
                    y: weekIndex,
                    v: value
                });
            });
        });

        this.charts.heatmap.data.datasets[0].data = formattedData;
        this.charts.heatmap.update('none');
    }

    updateRadarChart(metrics) {
        const data = [
            metrics.attendance || 0,
            metrics.testScores || 0,
            metrics.assignments || 0,
            metrics.participation || 0,
            metrics.progress || 0
        ];

        this.charts.radar.data.datasets[0].data = data;
        this.charts.radar.update('none');
    }

    handleNewNotification(notification) {
        // Add notification to widget
        if (this.widgets.notifications) {
            this.widgets.notifications.addNotification(notification);
        }

        // Show desktop notification if permitted
        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/images/logo.png',
                badge: '/images/badge.png',
                tag: notification.id,
                requireInteraction: notification.priority === 'high'
            });
        }

        // Play notification sound
        this.playNotificationSound(notification.type);

        // Update notification counter
        this.updateNotificationCounter();
    }

    updateCourseProgress(data) {
        const progressElement = document.querySelector(`[data-course-id="${data.courseId}"] .course-progress`);
        if (progressElement) {
            const progressBar = progressElement.querySelector('.progress-fill');
            const progressLabel = progressElement.querySelector('.progress-label');

            if (progressBar) {
                progressBar.style.width = `${data.progress}%`;
                progressBar.setAttribute('aria-valuenow', data.progress);
            }

            if (progressLabel) {
                progressLabel.textContent = `${data.progress}% เสร็จสิ้น`;
            }

            // Add completion animation if 100%
            if (data.progress === 100) {
                progressElement.classList.add('completed');
                this.showCompletionAnimation();
            }
        }
    }

    showAchievement(achievement) {
        const achievementModal = document.createElement('div');
        achievementModal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        achievementModal.innerHTML = `
            <div class="achievement-backdrop fixed inset-0 bg-black bg-opacity-50"></div>
            <div class="achievement-modal bg-white rounded-lg shadow-2xl p-8 max-w-md mx-auto relative transform scale-0 transition-transform duration-500">
                <div class="text-center">
                    <div class="achievement-icon mx-auto w-24 h-24 mb-4">
                        <img src="${achievement.icon}" alt="${achievement.name}" class="w-full h-full object-contain">
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">ปลดล็อคความสำเร็จ!</h3>
                    <h4 class="text-xl font-semibold text-blue-600 mb-2">${achievement.name}</h4>
                    <p class="text-gray-600 mb-4">${achievement.description}</p>
                    <div class="flex items-center justify-center space-x-2 mb-4">
                        <i class="fas fa-coins text-yellow-500"></i>
                        <span class="font-semibold">+${achievement.points} คะแนน</span>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        ยอดเยี่ยม!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(achievementModal);

        // Animate modal
        setTimeout(() => {
            achievementModal.querySelector('.achievement-modal').classList.remove('scale-0');
            achievementModal.querySelector('.achievement-modal').classList.add('scale-100');
        }, 100);

        // Play achievement sound
        this.playAchievementSound();

        // Auto close after 5 seconds
        setTimeout(() => {
            achievementModal.remove();
        }, 5000);
    }

    updateLeaderboard(data) {
        if (this.widgets.leaderboard) {
            this.widgets.leaderboard.update(data);
        }
    }

    setupEventListeners() {
        // Refresh button
        document.querySelectorAll('.widget-refresh').forEach(button => {
            button.addEventListener('click', (e) => {
                const widgetId = e.target.closest('[data-widget]').dataset.widget;
                this.refreshWidget(widgetId);
            });
        });

        // Widget settings
        document.querySelectorAll('.widget-settings').forEach(button => {
            button.addEventListener('click', (e) => {
                const widgetId = e.target.closest('[data-widget]').dataset.widget;
                this.openWidgetSettings(widgetId);
            });
        });

        // Notification permission
        if (Notification.permission === 'default') {
            this.requestNotificationPermission();
        }

        // Tab visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAutoRefresh();
            } else {
                this.resumeAutoRefresh();
            }
        });
    }

    refreshWidget(widgetId) {
        const widget = this.widgets[widgetId];
        if (widget && widget.refresh) {
            // Show loading state
            const widgetElement = document.querySelector(`[data-widget="${widgetId}"]`);
            if (widgetElement) {
                widgetElement.classList.add('loading');
            }

            widget.refresh().finally(() => {
                if (widgetElement) {
                    widgetElement.classList.remove('loading');
                }
            });
        }
    }

    openWidgetSettings(widgetId) {
        // Implementation for widget settings modal
        console.log('Opening settings for widget:', widgetId);
    }

    startAutoRefresh() {
        // Refresh different widgets at different intervals
        this.refreshIntervals.stats = setInterval(() => this.loadUserStats(), 60000); // 1 minute
        this.refreshIntervals.notifications = setInterval(() => this.widgets.notifications?.refresh(), 30000); // 30 seconds
        this.refreshIntervals.activities = setInterval(() => this.widgets.activities?.refresh(), 120000); // 2 minutes
        this.refreshIntervals.leaderboard = setInterval(() => this.widgets.leaderboard?.refresh(), 300000); // 5 minutes
    }

    pauseAutoRefresh() {
        Object.values(this.refreshIntervals).forEach(interval => clearInterval(interval));
    }

    resumeAutoRefresh() {
        this.startAutoRefresh();
    }

    requestNotificationPermission() {
        const banner = document.createElement('div');
        banner.className = 'fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50';
        banner.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="fas fa-bell text-blue-500 text-xl"></i>
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm text-gray-700">
                        อนุญาตให้แจ้งเตือนเพื่อรับข้อมูลการเรียนแบบ Real-time
                    </p>
                    <div class="mt-3 flex space-x-2">
                        <button onclick="dashboardManager.enableNotifications()" class="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                            อนุญาต
                        </button>
                        <button onclick="this.closest('.fixed').remove()" class="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
                            ไม่ใช่ตอนนี้
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(banner);
    }

    async enableNotifications() {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            this.showNotification('การแจ้งเตือนถูกเปิดใช้งาน', 'success');
        }
        document.querySelector('.fixed.bottom-4').remove();
    }

    playNotificationSound(type = 'default') {
        const audio = new Audio(`/sounds/notification-${type}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Could not play notification sound:', e));
    }

    playAchievementSound() {
        const audio = new Audio('/sounds/achievement.mp3');
        audio.volume = 0.7;
        audio.play().catch(e => console.log('Could not play achievement sound:', e));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        notification.classList.add(colors[type] || colors.info, 'text-white');
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation' : 'info'}-circle mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);

        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    updateNotificationCounter() {
        const counter = document.querySelector('.notification-counter');
        if (counter) {
            const currentCount = parseInt(counter.textContent) || 0;
            counter.textContent = currentCount + 1;
            counter.classList.remove('hidden');

            // Add pulse animation
            counter.classList.add('animate-pulse');
            setTimeout(() => counter.classList.remove('animate-pulse'), 1000);
        }
    }

    showCompletionAnimation() {
        // Confetti animation
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

        (function frame() {
            confetti({
                particleCount: 4,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 4,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < animationEnd) {
                requestAnimationFrame(frame);
            }
        }());
    }

    destroy() {
        // Clean up
        this.pauseAutoRefresh();
        if (this.socket) {
            this.socket.disconnect();
        }
        Object.values(this.charts).forEach(chart => chart.destroy());
        Object.values(this.widgets).forEach(widget => widget.destroy && widget.destroy());
    }
}

// Widget Classes
class StatsWidget {
    refresh() {
        return fetch('/api/dashboard/stats/quick')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.update(data.data);
                }
            });
    }

    update(data) {
        // Update stat cards
        Object.keys(data).forEach(key => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) {
                element.textContent = data[key];
            }
        });
    }
}

class ProgressWidget {
    refresh() {
        return fetch('/api/dashboard/progress')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.update(data.data);
                }
            });
    }

    update(data) {
        // Update progress indicators
        data.courses.forEach(course => {
            const element = document.querySelector(`[data-course-progress="${course.id}"]`);
            if (element) {
                const bar = element.querySelector('.progress-bar');
                if (bar) {
                    bar.style.width = `${course.progress}%`;
                }
            }
        });
    }
}

class CalendarWidget {
    constructor() {
        this.calendar = null;
        this.init();
    }

    init() {
        const calendarEl = document.getElementById('calendar-widget');
        if (calendarEl && typeof FullCalendar !== 'undefined') {
            this.calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                height: 'auto',
                headerToolbar: {
                    left: 'prev,next',
                    center: 'title',
                    right: 'dayGridMonth,listWeek'
                },
                events: '/api/dashboard/calendar/events',
                eventClick: this.handleEventClick.bind(this)
            });
            this.calendar.render();
        }
    }

    handleEventClick(info) {
        // Show event details
        console.log('Event clicked:', info.event);
    }

    refresh() {
        if (this.calendar) {
            this.calendar.refetchEvents();
        }
        return Promise.resolve();
    }

    destroy() {
        if (this.calendar) {
            this.calendar.destroy();
        }
    }
}

class NotificationsWidget {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        if (!notification.read) {
            this.unreadCount++;
        }
        this.render();
    }

    refresh() {
        return fetch('/api/notifications/recent')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.notifications = data.data;
                    this.unreadCount = data.unreadCount;
                    this.render();
                }
            });
    }

    render() {
        const container = document.getElementById('notifications-list');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-bell-slash text-4xl mb-2"></i>
                    <p>ไม่มีการแจ้งเตือน</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notif => `
            <div class="notification-item p-3 border-b hover:bg-gray-50 cursor-pointer ${!notif.read ? 'bg-blue-50' : ''}"
                 onclick="dashboardManager.widgets.notifications.markAsRead('${notif.id}')">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas fa-${this.getIcon(notif.type)} text-${this.getColor(notif.type)}-500"></i>
                    </div>
                    <div class="ml-3 flex-1">
                        <p class="text-sm font-medium text-gray-900">${notif.title}</p>
                        <p class="text-sm text-gray-500">${notif.message}</p>
                        <p class="text-xs text-gray-400 mt-1">${this.formatTime(notif.createdAt)}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    markAsRead(notificationId) {
        fetch(`/api/notifications/${notificationId}/read`, { method: 'POST' })
            .then(() => {
                const notif = this.notifications.find(n => n.id === notificationId);
                if (notif && !notif.read) {
                    notif.read = true;
                    this.unreadCount--;
                    this.render();
                }
            });
    }

    getIcon(type) {
        const icons = {
            'course': 'book',
            'test': 'clipboard-check',
            'achievement': 'trophy',
            'system': 'info-circle',
            'message': 'envelope'
        };
        return icons[type] || 'bell';
    }

    getColor(type) {
        const colors = {
            'course': 'blue',
            'test': 'green',
            'achievement': 'yellow',
            'system': 'gray',
            'message': 'purple'
        };
        return colors[type] || 'blue';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'เมื่อสักครู่';
        if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
        return date.toLocaleDateString('th-TH');
    }
}

class LeaderboardWidget {
    update(data) {
        const container = document.getElementById('leaderboard-list');
        if (!container) return;

        container.innerHTML = data.map((user, index) => `
            <div class="flex items-center justify-between p-3 hover:bg-gray-50">
                <div class="flex items-center">
                    <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${index < 3 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'} font-bold">
                        ${index + 1}
                    </div>
                    <img src="${user.avatar || '/images/default-avatar.png'}" alt="${user.name}" class="w-10 h-10 rounded-full ml-3">
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900">${user.name}</p>
                        <p class="text-xs text-gray-500">${user.department}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-sm font-semibold text-blue-600">${user.points} คะแนน</p>
                    <p class="text-xs text-gray-500">ระดับ ${user.level}</p>
                </div>
            </div>
        `).join('');
    }

    refresh() {
        return fetch('/api/dashboard/leaderboard')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.update(data.data);
                }
            });
    }
}

class ActivitiesWidget {
    refresh() {
        return fetch('/api/dashboard/activities/recent')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.render(data.data);
                }
            });
    }

    render(activities) {
        const container = document.getElementById('activities-timeline');
        if (!container) return;

        container.innerHTML = activities.map(activity => `
            <div class="activity-item flex items-start mb-4">
                <div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div class="ml-4 flex-1">
                    <p class="text-sm text-gray-900">${activity.description}</p>
                    <p class="text-xs text-gray-500 mt-1">${this.formatTime(activity.timestamp)}</p>
                </div>
            </div>
        `).join('');
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleString('th-TH', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

class AchievementsWidget {
    refresh() {
        return fetch('/api/dashboard/achievements')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    this.render(data.data);
                }
            });
    }

    render(achievements) {
        const container = document.getElementById('achievements-grid');
        if (!container) return;

        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-badge ${achievement.unlocked ? '' : 'locked'} text-center p-2">
                <img src="${achievement.icon}" alt="${achievement.name}" class="w-12 h-12 mx-auto mb-2 ${achievement.unlocked ? '' : 'grayscale opacity-50'}">
                <p class="text-xs font-medium ${achievement.unlocked ? 'text-gray-900' : 'text-gray-400'}">${achievement.name}</p>
            </div>
        `).join('');
    }
}

class AnalyticsWidget {
    constructor() {
        this.chart = null;
        this.init();
    }

    init() {
        const ctx = document.getElementById('analytics-chart');
        if (ctx) {
            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'ชั่วโมงการเรียน',
                        data: [],
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    refresh() {
        return fetch('/api/dashboard/analytics/weekly')
            .then(res => res.json())
            .then(data => {
                if (data.success && this.chart) {
                    this.chart.data.labels = data.data.labels;
                    this.chart.data.datasets[0].data = data.data.values;
                    this.chart.update();
                }
            });
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}

// Initialize dashboard when DOM is ready
let dashboardManager;

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on dashboard page
    if (document.querySelector('[data-page="dashboard"]')) {
        dashboardManager = new DashboardManager();
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
}