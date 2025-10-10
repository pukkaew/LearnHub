const express = require('express');
const router = express.Router();

// Debug route to check CSS variables
router.get('/debug/css-vars', (req, res) => {
    const primaryColor = typeof res.locals.getSetting === 'function'
        ? res.locals.getSetting('primary_color', 'NOT_FOUND')
        : 'NO_GETSETTING';

    const secondaryColor = typeof res.locals.getSetting === 'function'
        ? res.locals.getSetting('secondary_color', 'NOT_FOUND')
        : 'NO_GETSETTING';

    const systemName = typeof res.locals.getSetting === 'function'
        ? res.locals.getSetting('system_name', 'NOT_FOUND')
        : 'NO_GETSETTING';

    console.log('🔍 Debug CSS Variables:');
    console.log('  Primary Color:', primaryColor);
    console.log('  Secondary Color:', secondaryColor);
    console.log('  System Name:', systemName);

    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>CSS Variables Debug</title>
            <style>
                :root {
                    --primary-color: ${primaryColor};
                    --secondary-color: ${secondaryColor};
                }

                .test-primary {
                    background-color: var(--primary-color);
                    color: white;
                    padding: 20px;
                    margin: 20px;
                    border-radius: 8px;
                }

                .test-secondary {
                    background-color: var(--secondary-color);
                    color: white;
                    padding: 20px;
                    margin: 20px;
                    border-radius: 8px;
                }

                .test-direct-primary {
                    background-color: ${primaryColor};
                    color: white;
                    padding: 20px;
                    margin: 20px;
                    border-radius: 8px;
                }

                .test-direct-secondary {
                    background-color: ${secondaryColor};
                    color: white;
                    padding: 20px;
                    margin: 20px;
                    border-radius: 8px;
                }
            </style>
        </head>
        <body style="font-family: Arial; padding: 20px;">
            <h1>CSS Variables Debug</h1>

            <div style="background: #f0f0f0; padding: 20px; margin: 20px 0;">
                <h2>Settings Values:</h2>
                <p><strong>Primary Color:</strong> <code>${primaryColor}</code></p>
                <p><strong>Secondary Color:</strong> <code>${secondaryColor}</code></p>
                <p><strong>System Name:</strong> <code>${systemName}</code></p>
            </div>

            <h2>Using CSS Variables (var()):</h2>
            <div class="test-primary">
                Primary Color Box (using var(--primary-color))
            </div>
            <div class="test-secondary">
                Secondary Color Box (using var(--secondary-color))
            </div>

            <h2>Using Direct Values:</h2>
            <div class="test-direct-primary">
                Primary Color Box (direct value: ${primaryColor})
            </div>
            <div class="test-direct-secondary">
                Secondary Color Box (direct value: ${secondaryColor})
            </div>

            <h2>Computed CSS Variables:</h2>
            <div id="computed" style="background: #f0f0f0; padding: 20px; margin: 20px 0;"></div>

            <script>
                const root = document.documentElement;
                const primary = getComputedStyle(root).getPropertyValue('--primary-color').trim();
                const secondary = getComputedStyle(root).getPropertyValue('--secondary-color').trim();

                document.getElementById('computed').innerHTML =
                    '<p><strong>--primary-color:</strong> <code>' + primary + '</code></p>' +
                    '<p><strong>--secondary-color:</strong> <code>' + secondary + '</code></p>';

                console.log('CSS Variables:', { primary, secondary });
            </script>
        </body>
        </html>
    `);
});

module.exports = router;
