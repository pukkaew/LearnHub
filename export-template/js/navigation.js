/**
 * LearnHub Navigation Module
 * Handles mobile menu, dropdowns, and navigation state
 * Version: 1.0.0
 */

const LearnHubNav = (function() {
    'use strict';

    // Configuration
    const config = {
        mobileMenuSelector: '#mobile-menu',
        mobileToggleSelector: '.nav-mobile-toggle',
        dropdownWrapperSelector: '.nav-dropdown-wrapper',
        dropdownSelector: '.nav-dropdown',
        activeClass: 'active',
        showClass: 'show',
        breakpoint: 1024
    };

    // State
    let isOpen = false;
    let mobileMenu = null;
    let mobileToggle = null;

    /**
     * Initialize navigation
     * @param {Object} options - Configuration overrides
     */
    function init(options = {}) {
        // Merge options
        Object.assign(config, options);

        // Get elements
        mobileMenu = document.querySelector(config.mobileMenuSelector);
        mobileToggle = document.querySelector(config.mobileToggleSelector);

        // Setup event listeners
        setupEventListeners();

        // Handle resize
        handleResize();

        console.log('[LearnHubNav] Initialized');
    }

    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Mobile toggle click
        if (mobileToggle) {
            mobileToggle.addEventListener('click', toggle);
        }

        // Close menu when clicking outside
        document.addEventListener('click', handleOutsideClick);

        // Handle window resize
        window.addEventListener('resize', debounce(handleResize, 250));

        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                close();
                closeAllDropdowns();
            }
        });

        // Setup dropdown toggles for mobile
        setupMobileDropdowns();
    }

    /**
     * Toggle mobile menu
     */
    function toggle() {
        if (isOpen) {
            close();
        } else {
            open();
        }
    }

    /**
     * Open mobile menu
     */
    function open() {
        if (!mobileMenu) return;

        mobileMenu.classList.add(config.showClass);
        isOpen = true;

        // Update toggle icon
        if (mobileToggle) {
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-times';
            }
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Emit event
        emitEvent('menuOpened');
    }

    /**
     * Close mobile menu
     */
    function close() {
        if (!mobileMenu) return;

        mobileMenu.classList.remove(config.showClass);
        isOpen = false;

        // Update toggle icon
        if (mobileToggle) {
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bars';
            }
        }

        // Restore body scroll
        document.body.style.overflow = '';

        // Emit event
        emitEvent('menuClosed');
    }

    /**
     * Handle clicks outside menu
     */
    function handleOutsideClick(e) {
        if (!mobileMenu || !isOpen) return;

        const isClickInsideMenu = mobileMenu.contains(e.target);
        const isClickOnToggle = mobileToggle && mobileToggle.contains(e.target);

        if (!isClickInsideMenu && !isClickOnToggle) {
            close();
        }
    }

    /**
     * Handle window resize
     */
    function handleResize() {
        if (window.innerWidth >= config.breakpoint) {
            close();
        }
    }

    /**
     * Setup mobile dropdown toggles
     */
    function setupMobileDropdowns() {
        const mobileDropdowns = document.querySelectorAll('.nav-mobile-menu-item[data-dropdown]');

        mobileDropdowns.forEach(function(item) {
            item.addEventListener('click', function(e) {
                const dropdownId = this.getAttribute('data-dropdown');
                const submenu = document.getElementById(dropdownId);

                if (submenu) {
                    e.preventDefault();
                    submenu.classList.toggle(config.showClass);

                    // Toggle arrow icon
                    const arrow = this.querySelector('.dropdown-arrow');
                    if (arrow) {
                        arrow.classList.toggle('rotated');
                    }
                }
            });
        });
    }

    /**
     * Toggle a specific dropdown
     * @param {string} dropdownId - Dropdown element ID
     */
    function toggleDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.classList.toggle(config.showClass);
        }
    }

    /**
     * Close all dropdowns
     */
    function closeAllDropdowns() {
        const dropdowns = document.querySelectorAll(config.dropdownSelector);
        dropdowns.forEach(function(dropdown) {
            dropdown.classList.remove(config.showClass);
        });
    }

    /**
     * Set active menu item
     * @param {string} selector - Selector for the menu item
     */
    function setActive(selector) {
        // Remove active from all items
        const allItems = document.querySelectorAll('.nav-menu-item, .nav-mobile-menu-item');
        allItems.forEach(function(item) {
            item.classList.remove(config.activeClass);
        });

        // Add active to matching items
        const activeItems = document.querySelectorAll(selector);
        activeItems.forEach(function(item) {
            item.classList.add(config.activeClass);
        });
    }

    /**
     * Set active based on current URL
     */
    function setActiveByUrl() {
        const currentPath = window.location.pathname;
        const allItems = document.querySelectorAll('.nav-menu-item, .nav-mobile-menu-item');

        allItems.forEach(function(item) {
            const href = item.getAttribute('href');
            if (href && currentPath.startsWith(href) && href !== '/') {
                item.classList.add(config.activeClass);
            } else if (href === '/' && currentPath === '/') {
                item.classList.add(config.activeClass);
            } else {
                item.classList.remove(config.activeClass);
            }
        });
    }

    /**
     * Update notification badge
     * @param {number} count - Notification count
     */
    function updateNotificationBadge(count) {
        const badge = document.querySelector('.nav-notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = '';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    function emitEvent(eventName, detail = {}) {
        const event = new CustomEvent('learnhub:nav:' + eventName, {
            detail: detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Debounce utility
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Public API
    return {
        init: init,
        toggle: toggle,
        open: open,
        close: close,
        toggleDropdown: toggleDropdown,
        closeAllDropdowns: closeAllDropdowns,
        setActive: setActive,
        setActiveByUrl: setActiveByUrl,
        updateNotificationBadge: updateNotificationBadge,
        get isOpen() { return isOpen; }
    };
})();

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        LearnHubNav.init();
        LearnHubNav.setActiveByUrl();
    });
} else {
    LearnHubNav.init();
    LearnHubNav.setActiveByUrl();
}
