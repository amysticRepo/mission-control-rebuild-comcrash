const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const app = express();

// Paths
const dbPath = path.resolve(process.cwd(), 'api', 'db.json');
const newsPath = path.resolve(process.cwd(), 'api', 'news-cache.json');
const PORT = process.env.PORT || 3000;

// SERP API Configuration
const SERP_API_KEY = process.env.SERP_API_KEY || 'b992be08b4f3550953414dc41fea5e7fa007b6a388237baec1284ed07dd52c39';

app.use(express.json());

// Serve static files from the public folder for local development
app.use(express.static(path.join(process.cwd(), 'public')));

// API endpoint to serve task data
app.get('/api/tasks', async (req, res) => {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        const jsonData = JSON.parse(data);
        res.status(200).json(jsonData.tasks || []);
    } catch (error) {
        console.error('API ERROR: Failed to read task database:', error);
        res.status(500).json({ error: 'Internal Server Error: Could not retrieve tasks.' });
    }
});

// API endpoint to serve news data
app.get('/api/news', async (req, res) => {
    try {
        const requestedDate = req.query.date || new Date().toISOString().split('T')[0];
        const forceRefresh = req.query.refresh === 'true';

        // Try to load cached news
        let newsCache = {};
        try {
            const cacheData = await fs.readFile(newsPath, 'utf8');
            newsCache = JSON.parse(cacheData);
        } catch (e) {
            newsCache = {};
        }

        // Check if we have cached data for this date
        if (!forceRefresh && newsCache[requestedDate]) {
            return res.status(200).json(newsCache[requestedDate]);
        }

        // Fetch fresh news from SERP API
        const newsData = await fetchAllNews();

        // Cache the results
        newsCache[requestedDate] = newsData;
        await fs.writeFile(newsPath, JSON.stringify(newsCache, null, 2));

        res.status(200).json(newsData);
    } catch (error) {
        console.error('API ERROR: Failed to fetch news:', error);
        // Return sample data on error
        res.status(200).json(getSampleNews());
    }
});

// Fetch news from SERP API
async function fetchAllNews() {
    const [globalNews, malaysiaNews, youtubeNews] = await Promise.all([
        fetchSerpNews('top 10 global news breaking'),
        fetchSerpNews('top 10 Malaysia top viral news latest'),
        fetchSerpYoutube('latest most viral video')
    ]);

    return {
        global: processNewsResults(globalNews, ['BREAKING', 'WORLD', 'POLITICS'], 10),
        tech: processNewsResults(malaysiaNews, ['MALAYSIA', 'VIRAL', 'LOCAL'], 10),
        ai: processNewsResults(youtubeNews, ['VIRAL', 'YOUTUBE', 'TRENDING'], 10)
    };
}

// Fetch from SERP API
function fetchSerpNews(query) {
    return new Promise((resolve, reject) => {
        const url = `https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`;

        https.get(url, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.news_results || []);
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', () => resolve([]));
    });
}

// Fetch from SERP API Youtube
function fetchSerpYoutube(query) {
    return new Promise((resolve, reject) => {
        const url = `https://serpapi.com/search.json?engine=youtube&search_query=${encodeURIComponent(query)}&api_key=${SERP_API_KEY}`;

        https.get(url, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.video_results || []);
                } catch (e) {
                    resolve([]);
                }
            });
        }).on('error', () => resolve([]));
    });
}

// Process news results into our format
function processNewsResults(results, categories, limit = 4) {
    if (!results || results.length === 0) return [];

    return results.slice(0, limit).map((item, index) => {
        const viralScore = (9.9 - (index * 0.8) + Math.random() * 0.5).toFixed(1);
        return {
            category: categories[index % categories.length],
            headline: item.title || item.snippet || 'News Update',
            timestamp: item.date || item.published_date || new Date().toISOString(),
            viralScore: parseFloat(viralScore),
            url: item.link || '#',
            source: item.source?.name || item.channel?.name || 'Unknown',
            viewers: item.views ? `${(item.views / 1000).toFixed(1)}K` : undefined
        };
    });
}

// Sample news fallback
function getSampleNews() {
    return {
        global: [
            { category: 'BREAKING', headline: 'Quantum Supremacy: Global Banking Protocol Breach Detected', timestamp: new Date().toISOString(), viralScore: 9.8, url: '#' },
            { category: 'POLITICS', headline: 'Mars Colony Charter Signed by 140 Nations', timestamp: new Date().toISOString(), viralScore: 7.2, url: '#' },
            { category: 'WORLD', headline: 'Arctic Digital Infrastructure Hub Announced', timestamp: new Date().toISOString(), viralScore: 6.5, url: '#' }
        ],
        tech: [
            { category: 'ECONOMY', headline: 'Kuala Lumpur Becomes Southeast Asia\'s Premier AI Hub', timestamp: new Date().toISOString(), viralScore: 8.5, url: '#' },
            { category: 'TECH', headline: 'Penang Semiconductor Corridor Announces Next-Gen Neural Chips', timestamp: new Date().toISOString(), viralScore: 6.9, url: '#' },
            { category: 'TECH', headline: 'OpenAI Releases GPT-5 with Multimodal Reasoning', timestamp: new Date().toISOString(), viralScore: 9.2, url: '#' }
        ],
        ai: [
            { category: 'LIVE STREAM', headline: 'NVIDIA CEO Unveils \'Project Blackwell\' - The Last Human-Designed Architecture?', timestamp: new Date().toISOString(), viralScore: 9.9, viewers: '22.4K', url: '#' },
            { category: 'SYNTHETIC MEDIA', headline: 'The Rise of AI YouTubers: Why Real Humans are Losing the Algorithm War', timestamp: new Date().toISOString(), viralScore: 8.1, url: '#' },
            { category: 'AI', headline: 'Claude 4 Passes Medical Board Exam with 99.7% Accuracy', timestamp: new Date().toISOString(), viralScore: 9.4, url: '#' }
        ]
    };
}

// Listen on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
