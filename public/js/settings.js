/**
 * System Settings JavaScript
 * จัดการ interactions สำหรับหน้า System Settings
 */

(function() {
    'use strict';

    console.log('🔧 Settings.js loaded');

    // Get current language
    function getCurrentLanguage() {
        return localStorage.getItem('ruxchai_language') ||
               localStorage.getItem('preferred_language') || 'th';
    }

    // Translation messages
    const messages = {
        noChanges: {
            th: 'ไม่มีการเปลี่ยนแปลงใดๆ',
            en: 'No changes detected'
        },
        saving: {
            th: 'กำลังบันทึก...',
            en: 'Saving...'
        },
        saveSuccess: {
            th: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
            en: 'Settings saved successfully'
        },
        saveError: {
            th: 'เกิดข้อผิดพลาดในการบันทึก',
            en: 'Error saving settings'
        },
        connectionError: {
            th: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์',
            en: 'Error connecting to server'
        },
        invalidValue: {
            th: 'ค่าไม่ถูกต้อง',
            en: 'Invalid value'
        }
    };

    function getMessage(key) {
        const lang = getCurrentLanguage();
        return messages[key] ? messages[key][lang] : messages[key]['th'];
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // DOM Elements
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const saveAllBtn = document.getElementById('saveAllBtn');
        const alertContainer = document.getElementById('alertContainer');

    console.log('📊 Found elements:', {
        tabButtons: tabButtons.length,
        tabContents: tabContents.length,
        saveAllBtn: !!saveAllBtn,
        alertContainer: !!alertContainer
    });

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            this.classList.remove('border-transparent', 'text-gray-500');
            this.classList.add('border-blue-500', 'text-blue-600');

            // Update active tab content
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            document.getElementById(`tab-${targetTab}`).classList.remove('hidden');

            // Update URL without reload
            const url = new URL(window.location);
            url.searchParams.set('tab', targetTab);
            window.history.pushState({}, '', url);
        });
    });

    // Color picker sync
    document.querySelectorAll('input[type="color"]').forEach(colorInput => {
        const textInput = document.querySelector(`input[data-color-input="${colorInput.id}"]`);
        if (textInput) {
            colorInput.addEventListener('input', function() {
                textInput.value = this.value;
            });

            textInput.addEventListener('input', function() {
                if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
                    colorInput.value = this.value;
                }
            });
        }
    });

    // Track original values - only from input, select, textarea elements
    const originalValues = new Map();
    document.querySelectorAll('input[data-setting-key], select[data-setting-key], textarea[data-setting-key]').forEach(input => {
        const key = input.getAttribute('data-setting-key');
        const type = input.getAttribute('data-setting-type');

        let value;
        if (type === 'boolean') {
            value = input.checked ? 'true' : 'false';
        } else {
            value = input.value || '';
        }

        originalValues.set(key, value);
    });

    // Save all settings
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', async function() {
            const settings = [];
            const seenKeys = new Set();

            // Collect all changed settings - only from input, select, textarea elements
            document.querySelectorAll('input[data-setting-key], select[data-setting-key], textarea[data-setting-key]').forEach(input => {
                if (input.disabled) return;

                const key = input.getAttribute('data-setting-key');
                const type = input.getAttribute('data-setting-type');

                // Skip if key is empty
                if (!key || key.trim() === '') return;

                // Skip if already processed (in case of duplicates)
                if (seenKeys.has(key)) return;

                let value;

                // Get value based on input type
                if (type === 'boolean') {
                    value = input.checked ? 'true' : 'false';
                } else if (input.tagName === 'TEXTAREA') {
                    value = input.value || '';
                } else if (input.tagName === 'SELECT') {
                    value = input.value || '';
                } else if (input.tagName === 'INPUT') {
                    value = input.value || '';
                } else {
                    value = input.value || '';
                }

                // Ensure value is never undefined
                if (value === undefined || value === null) {
                    value = '';
                }

                // Get original value
                const originalValue = originalValues.get(key);

                // Debug: show what we're collecting
                console.log('📝 Collecting setting:', {
                    key,
                    value,
                    valueType: typeof value,
                    originalValue,
                    type,
                    tagName: input.tagName,
                    inputType: input.type,
                    hasValue: value !== undefined && value !== null && value !== '',
                    hasChanged: value !== originalValue,
                    element: input
                });

                // Always send the setting with its value (never undefined)
                // Convert undefined to empty string explicitly for JSON.stringify
                settings.push({
                    key: key,
                    value: String(value === undefined || value === null ? '' : value)
                });
                seenKeys.add(key);
            });

            console.log('📦 Total settings collected:', settings.length);
            console.log('📦 First 5 settings:', settings.slice(0, 5));
            console.log('📦 Full settings array:', JSON.stringify(settings, null, 2));

            // Debug: Check if values are present
            const hasValues = settings.filter(s => s.value !== undefined && s.value !== null && s.value !== '').length;
            console.log(`📊 Settings with values: ${hasValues}/${settings.length}`);

            if (settings.length === 0) {
                showAlert('warning', getMessage('noChanges'));
                return;
            }

            // Temporary alert to verify values
            const sample = settings.slice(0, 3).map(s => `${s.key}=${s.value}`).join(', ');
            console.log('🔍 Sample values:', sample);

            // Show loading
            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i><span style="font-family: \'Sarabun\', \'Prompt\', \'Noto Sans Thai\', sans-serif;">' + getMessage('saving') + '</span>';

            try {
                // Get CSRF token
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

                const requestBody = {
                    settings,
                    _csrf: csrfToken
                };

                console.log('📤 Sending request body:', JSON.stringify(requestBody, null, 2));

                const response = await fetch('/settings/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify(requestBody)
                });

                const result = await response.json();
                console.log('💾 Save response:', result);

                if (result.success) {
                    console.log('✅ Save successful, reloading in 1 second...');
                    showAlert('success', result.message || getMessage('saveSuccess'));

                    // Reload page after 1 second with cache-busting
                    setTimeout(() => {
                        console.log('🔄 Reloading page now with cache-busting...');
                        // Force reload without cache by adding timestamp
                        window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
                    }, 1000);
                } else {
                    console.error('❌ Save failed:', result);
                    showAlert('error', result.message || getMessage('saveError'));

                    if (result.errors && Array.isArray(result.errors)) {
                        result.errors.forEach(error => {
                            showAlert('error', `${error.key}: ${error.errors ? error.errors.join(', ') : error.error}`);
                        });
                    }
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                showAlert('error', getMessage('connectionError'));
            } finally {
                this.disabled = false;
                this.innerHTML = originalText;
            }
        });
    }

    // Real-time validation
    document.querySelectorAll('[data-setting-key]').forEach(input => {
        if (input.disabled) return;

        input.addEventListener('change', async function() {
            const key = this.getAttribute('data-setting-key');
            const type = this.getAttribute('data-setting-type');

            // Skip validation if no key
            if (!key || key.trim() === '') {
                console.warn('No setting key found for input:', this);
                return;
            }

            let value;

            if (type === 'boolean') {
                value = this.checked ? 'true' : 'false';
            } else if (this.tagName === 'TEXTAREA') {
                value = this.value;
            } else {
                value = this.value;
            }

            // Visual feedback
            this.classList.add('border-yellow-300');

            try {
                // Get CSRF token
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

                const response = await fetch('/settings/validate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({
                        key,
                        value,
                        _csrf: csrfToken
                    })
                });

                const result = await response.json();

                if (result.success && result.valid) {
                    this.classList.remove('border-red-300', 'border-yellow-300');
                    this.classList.add('border-green-300');

                    // Remove error message if exists
                    const errorMsg = this.parentElement.querySelector('.error-message');
                    if (errorMsg) errorMsg.remove();
                } else {
                    this.classList.remove('border-green-300', 'border-yellow-300');
                    this.classList.add('border-red-300');

                    // Show error message
                    let errorMsg = this.parentElement.querySelector('.error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('p');
                        errorMsg.className = 'error-message mt-1 text-xs text-red-600';
                        errorMsg.style.fontFamily = "'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif";
                        this.parentElement.appendChild(errorMsg);
                    }
                    errorMsg.textContent = result.errors ? result.errors.join(', ') : getMessage('invalidValue');
                }
            } catch (error) {
                console.error('Validation error:', error);
            }
        });
    });

    // Helper function to show alerts
    function showAlert(type, message) {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

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
        alert.className = `${alertColors[type]} border-l-4 p-4 mb-4 rounded-r font-thai`;
        alert.style.fontFamily = "'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif";
        alert.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <i class="fas ${alertIcons[type]} mr-3"></i>
                    <p class="text-sm font-medium" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif;">${message}</p>
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
                if (saveAllBtn) saveAllBtn.click();
            }
        });

        console.log('✅ Settings initialized successfully');
    }

})();
// Version: 2.0 - Fixed value sending issue
