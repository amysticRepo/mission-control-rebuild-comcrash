const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Resolve paths relative to the current working directory for serverless environments.
// This ensures db.json is correctly located within the same directory as the serverless function.
const dbPath = path.resolve(process.cwd(), 'api', 'db.json');
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API endpoint to serve task data
app.get('/api/tasks', async (req, res) => {
    try {
        // Read the database file on every request for fresh data.
        const data = await fs.readFile(dbPath, 'utf8');
        const jsonData = JSON.parse(data);
        res.status(200).json(jsonData.tasks || []);
    } catch (error) {
        console.error('API ERROR: Failed to read task database:', error);
        // Provide a more specific error message to the frontend.
        res.status(500).json({ error: 'Internal Server Error: Could not retrieve tasks.' });
    }
});

// NOTE: Vercel automatically serves static files from the 'public' directory.
// The API server should NOT attempt to serve static files.

// Listen on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
