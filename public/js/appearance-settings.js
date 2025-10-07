/**
 * Appearance Settings JavaScript
 * จัดการการตั้งค่ารูปแบบและ preview แบบ real-time
 */

(function() {
    'use strict';

    console.log('🎨 Appearance Settings loaded');

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Preview panel
        createPreviewPanel();

        // Color pickers
        initializeColorPickers();

        // Number inputs
        initializeNumberInputs();

        // Boolean toggles
        initializeBooleanToggles();

        // Apply current settings
        applyCurrentSettings();

        console.log('✅ Appearance settings initialized');
    }

    /**
     * Create preview panel
     */
    function createPreviewPanel() {
        const appearanceTab = document.getElementById('tab-appearance');
        if (!appearanceTab) return;

        // Check if preview already exists
        if (document.getElementById('appearance-preview')) return;

        const previewHTML = `
            <!-- Help Section -->
            <div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <i class="fas fa-info-circle text-blue-600 text-xl"></i>
                    </div>
                    <div class="ml-3 flex-1">
                        <h3 class="text-sm font-medium text-blue-900 lang-text" data-lang-th="คำแนะนำ" data-lang-en="Instructions">คำแนะนำ</h3>
                        <div class="mt-2 text-sm text-blue-700">
                            <ul class="list-disc list-inside space-y-1">
                                <li class="lang-text" data-lang-th="การเปลี่ยนแปลงจะแสดงผลแบบ real-time ในพาเนลตัวอย่างด้านล่าง" data-lang-en="Changes will be previewed in real-time below">การเปลี่ยนแปลงจะแสดงผลแบบ real-time ในพาเนลตัวอย่างด้านล่าง</li>
                                <li class="lang-text" data-lang-th="คลิก 'บันทึกทั้งหมด' เพื่อบันทึกการตั้งค่า" data-lang-en="Click 'Save All' to save your settings">คลิก 'บันทึกทั้งหมด' เพื่อบันทึกการตั้งค่า</li>
                                <li class="lang-text" data-lang-th="คลิก 'รีเซ็ตเป็นค่าเริ่มต้น' เพื่อกลับไปใช้ค่าเริ่มต้น" data-lang-en="Click 'Reset to Default' to restore defaults">คลิก 'รีเซ็ตเป็นค่าเริ่มต้น' เพื่อกลับไปใช้ค่าเริ่มต้น</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div id="appearance-preview" class="mt-6 p-6 bg-white rounded-lg border-2 border-blue-200">
                <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <i class="fas fa-eye mr-2 text-blue-600"></i>
                    <span class="lang-text" data-lang-th="ตัวอย่างการแสดงผล" data-lang-en="Preview">ตัวอย่างการแสดงผล</span>
                </h3>

                <div id="preview-container" class="space-y-4">
                    <!-- Sample Header -->
                    <div id="preview-header" class="bg-blue-600 text-white px-6 py-4 rounded-lg flex items-center justify-between transition-all" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: white;">
                        <div class="flex items-center">
                            <i class="fas fa-home mr-3" style="font-size: 18px; color: white;"></i>
                            <span class="font-semibold" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: white; font-size: 16px;">ส่วนหัวตัวอย่าง</span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <button class="px-3 py-1.5 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-all font-medium" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: white; font-size: 14px;">
                                เมนู
                            </button>
                        </div>
                    </div>

                    <!-- Sample Card -->
                    <div id="preview-card" class="bg-white border border-gray-200 rounded-lg p-6 transition-all shadow-sm" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif;">
                        <h4 class="text-lg font-bold mb-3" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #1f2937; font-size: 20px;">หัวข้อการ์ดตัวอย่าง</h4>
                        <p id="preview-text" class="mb-4 leading-relaxed" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #4b5563; font-size: 15px; line-height: 1.6;">
                            นี่คือการ์ดตัวอย่างสำหรับแสดงการตั้งค่ารูปแบบของคุณ
                            คุณสามารถดูว่าสี ฟอนต์ และระยะห่างจะมีลักษณะอย่างไรแบบ real-time
                        </p>
                        <div class="flex space-x-3 flex-wrap gap-2">
                            <button id="preview-btn-primary" class="px-4 py-2 bg-blue-600 text-white rounded transition-all hover:bg-blue-700 font-medium" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: white; font-size: 14px;">
                                ปุ่มหลัก
                            </button>
                            <button id="preview-btn-secondary" class="px-4 py-2 bg-green-600 text-white rounded transition-all hover:bg-green-700 font-medium" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: white; font-size: 14px;">
                                ปุ่มรอง
                            </button>
                            <button id="preview-btn-accent" class="px-4 py-2 bg-yellow-600 text-white rounded transition-all hover:bg-yellow-700 font-medium" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: white; font-size: 14px;">
                                ปุ่มเน้น
                            </button>
                        </div>
                    </div>

                    <!-- Sample Sidebar -->
                    <div class="flex space-x-4">
                        <div id="preview-sidebar" class="rounded-lg p-4 transition-all" style="background-color: #1f2937; font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #ffffff;">
                            <div class="space-y-2">
                                <div class="mb-3" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #ffffff; font-size: 16px; font-weight: 700; background-color: transparent;">แถบเมนู</div>
                                <div class="py-2 px-3 rounded" style="background-color: rgba(255, 255, 255, 0.1); font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #ffffff; font-size: 15px; font-weight: 500;">เมนูที่ 1</div>
                                <div class="py-2 px-3 rounded" style="background-color: rgba(255, 255, 255, 0.1); font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #ffffff; font-size: 15px; font-weight: 500;">เมนูที่ 2</div>
                                <div class="py-2 px-3 rounded" style="background-color: rgba(255, 255, 255, 0.1); font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #ffffff; font-size: 15px; font-weight: 500;">เมนูที่ 3</div>
                            </div>
                        </div>

                        <div class="flex-1 bg-gray-50 rounded-lg p-4 transition-all">
                            <div class="text-lg font-semibold" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #1f2937; font-size: 18px;">พื้นที่เนื้อหา</div>
                            <p class="mt-2 text-sm" style="font-family: 'Sarabun', 'Prompt', 'Noto Sans Thai', sans-serif; color: #6b7280; font-size: 14px;">นี่คือพื้นที่สำหรับแสดงเนื้อหาหลักของระบบ</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        appearanceTab.insertAdjacentHTML('beforeend', previewHTML);
    }

    /**
     * Initialize color pickers
     */
    function initializeColorPickers() {
        const colorInputs = {
            'primary_color': (value) => {
                document.getElementById('preview-header')?.style.setProperty('background-color', value);
                document.getElementById('preview-btn-primary')?.style.setProperty('background-color', value);
            },
            'secondary_color': (value) => {
                document.getElementById('preview-btn-secondary')?.style.setProperty('background-color', value);
            },
            'accent_color': (value) => {
                document.getElementById('preview-btn-accent')?.style.setProperty('background-color', value);
            },
            'background_color': (value) => {
                const previewContainer = document.getElementById('preview-container');
                if (previewContainer) {
                    previewContainer.style.setProperty('background-color', value);
                }
            },
            'text_color': (value) => {
                document.getElementById('preview-text')?.style.setProperty('color', value);
            }
        };

        Object.keys(colorInputs).forEach(key => {
            const input = document.getElementById(key);
            const textInput = document.querySelector(`input[data-color-input="${key}"]`);

            if (input) {
                input.addEventListener('input', function() {
                    colorInputs[key](this.value);
                    if (textInput) textInput.value = this.value;
                });
            }

            if (textInput) {
                textInput.addEventListener('input', function() {
                    if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
                        colorInputs[key](this.value);
                        if (input) input.value = this.value;
                    }
                });
            }
        });
    }

    /**
     * Initialize number inputs
     */
    function initializeNumberInputs() {
        const numberInputs = {
            'border_radius': (value) => {
                const elements = ['preview-card', 'preview-btn-primary', 'preview-btn-secondary', 'preview-btn-accent', 'preview-header', 'preview-sidebar'];
                elements.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.style.borderRadius = `${value}px`;
                });
            },
            'font_size_base': (value) => {
                document.getElementById('preview-text')?.style.setProperty('font-size', `${value}px`);
            },
            'header_height': (value) => {
                const header = document.getElementById('preview-header');
                if (header) {
                    header.style.height = `${value}px`;
                    header.style.display = 'flex';
                    header.style.alignItems = 'center';
                }
            },
            'sidebar_width': (value) => {
                const sidebar = document.getElementById('preview-sidebar');
                if (sidebar) sidebar.style.width = `${value}px`;
            }
        };

        Object.keys(numberInputs).forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                input.addEventListener('input', function() {
                    numberInputs[key](this.value);
                });
            }
        });
    }

    /**
     * Initialize boolean toggles
     */
    function initializeBooleanToggles() {
        const booleanInputs = {
            'enable_animations': (checked) => {
                const elements = document.querySelectorAll('#preview-container button, #preview-container > div');
                elements.forEach(el => {
                    if (checked) {
                        el.classList.add('transition-all');
                    } else {
                        el.classList.remove('transition-all');
                    }
                });
            },
            'enable_shadows': (checked) => {
                const card = document.getElementById('preview-card');
                if (card) {
                    if (checked) {
                        card.classList.add('shadow-lg');
                        card.classList.remove('shadow-sm');
                    } else {
                        card.classList.remove('shadow-lg');
                        card.classList.add('shadow-sm');
                    }
                }
            },
            'compact_mode': (checked) => {
                const container = document.getElementById('preview-container');
                if (container) {
                    if (checked) {
                        container.classList.add('space-y-2');
                        container.classList.remove('space-y-4');
                    } else {
                        container.classList.remove('space-y-2');
                        container.classList.add('space-y-4');
                    }
                }
            }
        };

        Object.keys(booleanInputs).forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                input.addEventListener('change', function() {
                    booleanInputs[key](this.checked);
                });
            }
        });
    }

    /**
     * Apply current settings from inputs
     */
    function applyCurrentSettings() {
        // Apply colors
        ['primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color'].forEach(key => {
            const input = document.getElementById(key);
            if (input && input.value) {
                input.dispatchEvent(new Event('input'));
            }
        });

        // Apply numbers
        ['border_radius', 'font_size_base', 'header_height', 'sidebar_width'].forEach(key => {
            const input = document.getElementById(key);
            if (input && input.value) {
                input.dispatchEvent(new Event('input'));
            }
        });

        // Apply booleans
        ['enable_animations', 'enable_shadows', 'compact_mode'].forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                input.dispatchEvent(new Event('change'));
            }
        });
    }

    /**
     * Reset to default
     */
    window.resetAppearanceToDefault = function() {
        // Get current language
        const currentLang = localStorage.getItem('ruxchai_language') ||
                           localStorage.getItem('preferred_language') || 'th';

        const confirmMessage = currentLang === 'en'
            ? 'Do you want to reset the appearance settings to default?'
            : 'คุณต้องการรีเซ็ตการตั้งค่ารูปแบบเป็นค่าเริ่มต้นหรือไม่?';

        if (!confirm(confirmMessage)) {
            return;
        }

        const defaults = {
            'primary_color': '#3B82F6',
            'secondary_color': '#10B981',
            'accent_color': '#F59E0B',
            'background_color': '#F3F4F6',
            'text_color': '#1F2937',
            'border_radius': '8',
            'font_size_base': '16',
            'header_height': '64',
            'sidebar_width': '256',
            'enable_animations': true,
            'enable_shadows': true,
            'compact_mode': false
        };

        Object.keys(defaults).forEach(key => {
            const input = document.getElementById(key);
            const textInput = document.querySelector(`input[data-color-input="${key}"]`);

            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = defaults[key];
                    input.dispatchEvent(new Event('change'));
                } else {
                    input.value = defaults[key];
                    input.dispatchEvent(new Event('input'));
                }
            }

            if (textInput) {
                textInput.value = defaults[key];
            }
        });

        const successMessage = currentLang === 'en'
            ? '✅ Appearance settings have been reset successfully'
            : '✅ รีเซ็ตการตั้งค่ารูปแบบเรียบร้อยแล้ว';

        alert(successMessage);
    };

})();
