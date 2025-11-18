// This script helps analyze the server log for course creation
console.log(`
📝 Instructions to check server log:

1. Look at the Terminal running "node server.js"
2. Find the latest "Creating course with data:" log entry
3. Check if it shows:
   - target_positions: [...]
   - target_departments: [...]

4. Then find the "🔍 DEBUG target_audience data:" log
5. Check what values it received

If you don't see these logs, the code changes haven't been loaded yet.
Please restart the server (Ctrl+C, then run "node server.js" again).
`);
