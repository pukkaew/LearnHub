/**
 * User Settings JavaScript
 * จัดการ interactions สำหรับหน้า User Settings
 */

(function() {
    'use strict';

    console.log('👤 User Settings.js loaded');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // DOM Elements
        const saveBtn = document.getElementById('saveUserSettingsBtn');
        const resetBtn = document.getElementById('resetBtn');
        const alertContainer = document.getElementById('alertContainer');

        console.log('📊 Found elements:', {
            saveBtn: !!saveBtn,
            resetBtn: !!resetBtn,
            alertContainer: !!alertContainer
        });

    // Save user settings
    if (saveBtn) {
        saveBtn.addEventListener('click', async function() {
            const settings = {};

            // Collect all settings
            document.querySelectorAll('[data-setting-key]').forEach(input => {
                const key = input.getAttribute('data-setting-key');

                if (input.type === 'checkbox') {
                    settings[key] = input.checked;
                } else {
                    settings[key] = input.value;
                }
            });

            // Show loading
            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>กำลังบันทึก...';

            try {
                const response = await fetch('/settings/user/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ settings })
                });

                const result = await response.json();

                if (result.success) {
                    showAlert('success', result.message || 'บันทึกการตั้งค่าเรียบร้อยแล้ว');

                    // Apply theme immediately if changed
                    if (settings.theme) {
                        applyTheme(settings.theme);
                    }

                    // Apply language immediately if changed
                    if (settings.language) {
                        // Reload to apply language change
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                } else {
                    showAlert('error', result.message || 'เกิดข้อผิดพลาดในการบันทึก');
                }
            } catch (error) {
                console.error('Error saving user settings:', error);
                showAlert('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
            } finally {
                this.disabled = false;
                this.innerHTML = originalText;
            }
        });
    }

    // Reset settings
    if (resetBtn) {
        resetBtn.addEventListener('click', async function() {
            if (!confirm('คุณต้องการรีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นหรือไม่?')) {
                return;
            }

            // Show loading
            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>กำลังรีเซ็ต...';

            try {
                // Get all setting keys
                const keys = [];
                document.querySelectorAll('[data-setting-key]').forEach(input => {
                    keys.push(input.getAttribute('data-setting-key'));
                });

                // Delete all user settings
                const deletePromises = keys.map(key =>
                    fetch(`/settings/user/${key}`, { method: 'DELETE' })
                );

                await Promise.all(deletePromises);

                showAlert('success', 'รีเซ็ตการตั้งค่าเรียบร้อยแล้ว');

                // Reload page after 1 second
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (error) {
                console.error('Error resetting settings:', error);
                showAlert('error', 'เกิดข้อผิดพลาดในการรีเซ็ตการตั้งค่า');
            } finally {
                this.disabled = false;
                this.innerHTML = originalText;
            }
        });
    }

    // Theme preview
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            applyTheme(this.value);
        });
    }

    // Apply theme function
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        } else if (theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }

    // Request browser notification permission
    const notifyBrowserCheckbox = document.getElementById('notify_browser');
    if (notifyBrowserCheckbox) {
        notifyBrowserCheckbox.addEventListener('change', function() {
            if (this.checked && 'Notification' in window) {
                if (Notification.permission === 'default') {
                    Notification.requestPermission().then(permission => {
                        if (permission !== 'granted') {
                            this.checked = false;
                            showAlert('warning', 'คุณต้องอนุญาตการแจ้งเตือนในเบราว์เซอร์ก่อน');
                        }
                    });
                } else if (Notification.permission === 'denied') {
                    this.checked = false;
                    showAlert('error', 'การแจ้งเตือนถูกปิดใช้งานในเบราว์เซอร์ กรุณาเปิดใช้งานในการตั้งค่าเบราว์เซอร์');
                }
            }
        });
    }

    // Auto-save indicator
    let autoSaveTimeout;
    document.querySelectorAll('[data-setting-key]').forEach(input => {
        input.addEventListener('change', function() {
            clearTimeout(autoSaveTimeout);

            // Show "unsaved changes" indicator
            if (saveBtn) {
                saveBtn.classList.add('ring-2', 'ring-yellow-400', 'ring-offset-2');
            }

            // Auto-save after 2 seconds of no changes
            autoSaveTimeout = setTimeout(() => {
                if (saveBtn) {
                    saveBtn.click();
                }
            }, 2000);
        });
    });

    // Helper function to show alerts
    function showAlert(type, message) {
        const alertColors = {
            success: 'bg-green-50 border-green-400 text-green-800',
            error: 'bg-red-50 border-red-400 text-red-800',
            warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
            info: 'bg-blue-50 border-blue-400 text-blue-800'
        };

        const alertIcons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const alert = document.createElement('div');
        alert.className = `${alertColors[type]} border-l-4 p-4 mb-4 rounded-r`;
        alert.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <i class="fas ${alertIcons[type]} mr-3"></i>
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        alertContainer.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

        // Keyboard shortcut Ctrl+S to save
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (saveBtn) saveBtn.click();
            }
        });

        // Initialize - apply current theme
        const currentTheme = themeSelect ? themeSelect.value : 'light';
        applyTheme(currentTheme);

        console.log('✅ User Settings initialized successfully');
    }

})();
