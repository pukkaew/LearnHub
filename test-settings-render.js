const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const settingsMiddleware = require('./middleware/settingsMiddleware');
require('dotenv').config();

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Apply settings middleware
app.use(settingsMiddleware);

// Test route
app.get('/test-settings', (req, res) => {
    console.log('\n🔍 === SETTINGS IN RES.LOCALS ===');
    console.log('getSetting function:', typeof res.locals.getSetting);

    if (typeof res.locals.getSetting === 'function') {
        console.log('system_name:', res.locals.getSetting('system_name'));
        console.log('primary_color:', res.locals.getSetting('primary_color'));
        console.log('secondary_color:', res.locals.getSetting('secondary_color'));
    }

    console.log('\nAll res.locals.settings keys:', Object.keys(res.locals.settings || {}));
    console.log('================================\n');

    res.send(`
        <html>
        <head>
            <style>
                :root {
                    --primary-color: ${res.locals.getSetting('primary_color', '#0090D3')};
                    --secondary-color: ${res.locals.getSetting('secondary_color', '#3AAA35')};
                }
                .test {
                    background-color: var(--primary-color);
                    color: white;
                    padding: 20px;
                    margin: 20px;
                }
            </style>
        </head>
        <body>
            <h1>Settings Test</h1>
            <div class="test">
                Primary Color: ${res.locals.getSetting('primary_color', 'NOT FOUND')}
            </div>
            <div style="background-color: ${res.locals.getSetting('secondary_color', '#ccc')}; color: white; padding: 20px; margin: 20px;">
                Secondary Color: ${res.locals.getSetting('secondary_color', 'NOT FOUND')}
            </div>
            <pre>${JSON.stringify({
                system_name: res.locals.getSetting('system_name'),
                primary_color: res.locals.getSetting('primary_color'),
                secondary_color: res.locals.getSetting('secondary_color')
            }, null, 2)}</pre>
        </body>
        </html>
    `);
});

app.listen(3001, () => {
    console.log('🧪 Test server running on http://localhost:3001/test-settings');
});
