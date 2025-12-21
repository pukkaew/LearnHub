# LearnHub Export Template System

A complete, production-ready template system for Learning Management Systems (LMS). Includes database schema, theme system, navigation, utilities, and reusable components.

## Overview

This export package contains everything you need to build or integrate an LMS-style application:

- **Database Schema**: Complete SQL Server schema with tables for users, courses, settings, and more
- **Theme System**: CSS Variables for dynamic theming with dark mode support
- **Navigation**: Responsive navigation with mobile menu and dropdowns
- **Utilities**: Tailwind-like utility classes without requiring Tailwind
- **Components**: Reusable UI components like Facebook-style comments

## Directory Structure

```
export-template/
├── database/
│   └── schema.sql          # Complete SQL Server database schema
├── css/
│   ├── theme-variables.css # CSS variables for theming
│   ├── navigation.css      # Navigation styles
│   ├── utilities.css       # Utility classes
│   └── facebook-comments.css
├── js/
│   ├── navigation.js       # Navigation functionality
│   ├── settings.js         # Settings management
│   ├── facebook-comments.js
│   └── facebook-comments-i18n-th.js
├── views/
│   ├── layout-template.html    # Sample layout template
│   └── facebook-comments-template.html
└── README.md
```

## Quick Start

### 1. Set Up Database

Execute the SQL schema in your SQL Server database:

```sql
-- Run schema.sql to create all tables
```

Default tables include:
- `users`, `roles`, `departments`, `positions`
- `courses`, `enrollments`, `tests`, `questions`
- `SystemSettings`, `UserSettings`, `DepartmentSettings`
- `CourseDiscussions`, `CourseDiscussionReactions`
- `articles`, `notifications`, `activity_logs`

### 2. Include CSS Files

```html
<!-- Font Awesome (required for icons) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

<!-- LearnHub CSS (in order) -->
<link rel="stylesheet" href="css/theme-variables.css">
<link rel="stylesheet" href="css/navigation.css">
<link rel="stylesheet" href="css/utilities.css">
```

### 3. Include JavaScript

```html
<script src="js/navigation.js"></script>
<script src="js/settings.js"></script>
```

### 4. Initialize

```javascript
// Initialize navigation
LearnHubNav.init();

// Initialize settings (if using settings panel)
LearnHubSettings.init({
    apiBase: '/api/settings'
});
```

---

## Theme System

### CSS Variables

The theme system uses CSS custom properties for easy customization:

```css
:root {
    /* Primary Colors */
    --primary-color: #0090D3;
    --secondary-color: #3AAA35;
    --accent-color: #3b82f6;

    /* Backgrounds */
    --background-color: #f9fafb;
    --card-color: #ffffff;
    --sidebar-color: #1f2937;

    /* Typography */
    --font-family: 'Sarabun', 'Prompt', sans-serif;
    --font-size-base: 1rem;

    /* Layout */
    --header-height: 64px;
    --sidebar-width: 256px;
}
```

### Dynamic Theming

Set variables dynamically via JavaScript:

```javascript
// Change primary color
document.documentElement.style.setProperty('--primary-color', '#ff6b6b');

// Enable dark mode
document.documentElement.setAttribute('data-theme', 'dark');

// Enable compact mode
document.documentElement.setAttribute('data-compact', 'true');
```

### Dark Mode

Apply dark mode with attribute or class:

```html
<html data-theme="dark">
<!-- or -->
<body class="dark-mode">
```

### Accessibility Modes

```html
<!-- High contrast -->
<html data-high-contrast="true">

<!-- Disable animations -->
<html data-animations="false">

<!-- Disable shadows -->
<html data-shadows="false">
```

---

## Navigation System

### HTML Structure

```html
<nav class="nav-main">
    <div class="nav-container">
        <!-- Logo -->
        <a href="/" class="nav-logo">
            <img src="/images/logo.png" class="nav-logo-img" alt="Logo">
            <div class="nav-logo-text">
                <span class="nav-logo-title">LearnHub</span>
                <span class="nav-logo-subtitle">Learning Platform</span>
            </div>
        </a>

        <!-- Desktop Menu -->
        <div class="nav-menu">
            <a href="/courses" class="nav-menu-item active">
                <span class="nav-menu-icon"><i class="fas fa-book"></i></span>
                Courses
            </a>

            <!-- Dropdown Example -->
            <div class="nav-dropdown-wrapper">
                <button class="nav-menu-item">
                    Settings <i class="fas fa-chevron-down"></i>
                </button>
                <div class="nav-dropdown">
                    <a href="/settings/general" class="nav-dropdown-item">
                        <i class="fas fa-cog"></i> General
                    </a>
                    <div class="nav-dropdown-divider"></div>
                    <a href="/settings/theme" class="nav-dropdown-item">
                        <i class="fas fa-palette"></i> Theme
                    </a>
                </div>
            </div>
        </div>

        <!-- User Section -->
        <div class="nav-user-section">
            <button class="nav-action-button">
                <i class="fas fa-bell"></i>
                <span class="nav-notification-badge">5</span>
            </button>

            <button class="nav-user-profile">
                <img src="/images/avatar.png" class="nav-user-avatar" alt="">
                <div class="nav-user-info">
                    <span class="nav-user-name">John Doe</span>
                    <span class="nav-user-role">Admin</span>
                </div>
            </button>

            <!-- Mobile Toggle -->
            <button class="nav-mobile-toggle" onclick="LearnHubNav.toggle()">
                <i class="fas fa-bars"></i>
            </button>
        </div>
    </div>
</nav>

<!-- Mobile Menu -->
<div class="nav-mobile-menu" id="mobile-menu">
    <a href="/courses" class="nav-mobile-menu-item">
        <i class="fas fa-book"></i> Courses
    </a>
    <!-- More items... -->
</div>
```

### Navigation JavaScript

```javascript
// Toggle mobile menu
LearnHubNav.toggle();

// Close mobile menu
LearnHubNav.close();

// Check if menu is open
if (LearnHubNav.isOpen) { ... }
```

---

## Settings Management

### Database Structure

Three-tier settings system:

1. **SystemSettings** - Global defaults
2. **DepartmentSettings** - Department overrides
3. **UserSettings** - User-specific preferences

Priority: User > Department > System

### Settings Categories

| Category | Keys | Description |
|----------|------|-------------|
| appearance | primary_color, secondary_color, font_family | Visual theme |
| display | items_per_page, date_format, sidebar_collapsed | Display preferences |
| notification | email_enabled, push_enabled | Notification settings |
| language | locale, timezone | Localization |

### JavaScript API

```javascript
// Get a setting
const theme = await LearnHubSettings.get('appearance', 'primary_color');

// Update a setting
await LearnHubSettings.set('appearance', 'primary_color', '#ff6b6b');

// Batch update
await LearnHubSettings.batchUpdate({
    'appearance.primary_color': '#ff6b6b',
    'appearance.secondary_color': '#4ecdc4'
});

// Reset to defaults
await LearnHubSettings.reset('appearance');

// Apply theme from settings
LearnHubSettings.applyTheme();
```

---

## Utility Classes

### Display

```html
<div class="hidden">Hidden</div>
<div class="block">Block</div>
<div class="flex items-center justify-between">Flexbox</div>
<div class="grid grid-cols-3 gap-4">Grid</div>
```

### Spacing

```html
<div class="p-4">Padding 1rem</div>
<div class="m-2">Margin 0.5rem</div>
<div class="px-4 py-2">Horizontal/Vertical</div>
<div class="mt-8">Margin top 2rem</div>
```

### Typography

```html
<p class="text-sm text-gray-500">Small muted text</p>
<h1 class="text-2xl font-bold">Bold heading</h1>
<p class="text-center">Centered text</p>
```

### Colors

```html
<div class="bg-white text-gray-900">Light background</div>
<div class="bg-blue-500 text-white">Blue background</div>
<span class="text-red-500">Error text</span>
```

### Borders & Shadows

```html
<div class="border border-gray-200 rounded-lg">Bordered</div>
<div class="shadow-md rounded-xl">Card with shadow</div>
```

### Responsive

```html
<!-- Hidden on mobile, visible on desktop -->
<div class="hidden md:block">Desktop only</div>

<!-- Different columns on different screens -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
    Responsive grid
</div>
```

---

## Components

### Facebook-Style Comments

See `views/facebook-comments-template.html` for full example.

```javascript
FacebookComments.init({
    apiBase: '/api/discussions',
    currentUser: {
        id: 1,
        name: 'John Doe',
        avatar: '/images/avatar.png',
        isAdmin: false
    }
});
```

Features:
- 6 emoji reactions (like, love, haha, wow, sad, angry)
- Nested replies with @mentions
- Pin/unpin comments
- Edit/delete own comments
- Sorting (newest, oldest, popular)
- Pagination

---

## Integration Examples

### Express.js (Node.js)

```javascript
// Middleware to inject theme settings
app.use(async (req, res, next) => {
    const settings = await Setting.getAllSystemSettings();
    res.locals.theme = {
        primaryColor: settings.primary_color || '#0090D3',
        secondaryColor: settings.secondary_color || '#3AAA35',
        fontFamily: settings.font_family || 'Sarabun'
    };
    next();
});
```

### EJS Template

```html
<style>
:root {
    --primary-color: <%= theme.primaryColor %>;
    --secondary-color: <%= theme.secondaryColor %>;
    --font-family: '<%= theme.fontFamily %>', sans-serif;
}
</style>
```

### PHP/Laravel

```php
// In a service provider or middleware
View::share('theme', [
    'primaryColor' => Setting::get('primary_color', '#0090D3'),
    'secondaryColor' => Setting::get('secondary_color', '#3AAA35'),
    'fontFamily' => Setting::get('font_family', 'Sarabun')
]);
```

### Blade Template

```html
<style>
:root {
    --primary-color: {{ $theme['primaryColor'] }};
    --secondary-color: {{ $theme['secondaryColor'] }};
    --font-family: '{{ $theme['fontFamily'] }}', sans-serif;
}
</style>
```

---

## Database Quick Reference

### Core Tables

| Table | Purpose |
|-------|---------|
| users | User accounts |
| roles | Role definitions (admin, instructor, etc.) |
| departments | Organization departments |
| positions | Job positions |
| courses | Course catalog |
| enrollments | Course enrollments |
| tests | Assessments |
| questions | Test questions |
| articles | Knowledge base articles |

### Settings Tables

| Table | Purpose |
|-------|---------|
| SystemSettings | Global system settings |
| DepartmentSettings | Department-level overrides |
| UserSettings | User preferences |

### Default Roles

| ID | Name | Description |
|----|------|-------------|
| 1 | Super Admin | Full system access |
| 2 | Admin | Administrative access |
| 3 | HR | Human resources |
| 4 | Instructor | Course management |
| 5 | User | Regular user |

---

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

---

## License

MIT License - Free to use in personal and commercial projects.

---

## Credits

LearnHub Template System
Version: 1.0.0
