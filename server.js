// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// --- DATABASE CONNECTION DETAILS ---
// IMPORTANT: Replace with your actual database credentials
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'joy_of_painting',
    password: 'your_password', // Change this!
    port: 5432,
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- API Endpoints ---

app.get('/colors', async (req, res) => {
    try {
        const result = await pool.query('SELECT color_name FROM colors ORDER BY color_name');
        res.json(result.rows.map(row => row.color_name));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/subjects', async (req, res) => {
    try {
        const result = await pool.query('SELECT subject_name FROM subjects ORDER BY subject_name');
        res.json(result.rows.map(row => row.subject_name));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/episodes', async (req, res) => {
    const { months, subjects, colors, match_type = 'all' } = req.query;

    if (!months && !subjects && !colors) {
        return res.status(400).json({ error: 'At least one filter (months, subjects, colors) must be provided.' });
    }
    if (!['all', 'any'].includes(match_type)) {
        return res.status(400).json({ error: "match_type must be 'any' or 'all'." });
    }

    const monthList = months ? months.split(',').map(Number) : [];
    const subjectList = subjects ? subjects.split(',').map(s => s.trim()) : [];
    const colorList = colors ? colors.split(',').map(c => c.trim()) : [];

    let params = [];
    let paramIndex = 1;
    const subqueries = [];

    if (monthList.length > 0) {
        subqueries.push(`SELECT episode_id FROM episodes WHERE EXTRACT(MONTH FROM broadcast_date) = ANY($${paramIndex++})`);
        params.push(monthList);
    }

    if (subjectList.length > 0) {
        if (match_type === 'all') {
            subqueries.push(`
                SELECT es.episode_id FROM episode_subjects es
                JOIN subjects s ON es.subject_id = s.subject_id
                WHERE s.subject_name = ANY($${paramIndex++})
                GROUP BY es.episode_id
                HAVING COUNT(DISTINCT s.subject_name) = $${paramIndex++}
            `);
            params.push(subjectList, subjectList.length);
        } else {
            subqueries.push(`
                SELECT es.episode_id FROM episode_subjects es
                JOIN subjects s ON es.subject_id = s.subject_id
                WHERE s.subject_name = ANY($${paramIndex++})
            `);
            params.push(subjectList);
        }
    }

    if (colorList.length > 0) {
        if (match_type === 'all') {
            subqueries.push(`
                SELECT ec.episode_id FROM episode_colors ec
                JOIN colors c ON ec.color_id = c.color_id
                WHERE c.color_name = ANY($${paramIndex++})
                GROUP BY ec.episode_id
                HAVING COUNT(DISTINCT c.color_name) = $${paramIndex++}
            `);
            params.push(colorList, colorList.length);
        } else {
            subqueries.push(`
                SELECT ec.episode_id FROM episode_colors ec
                JOIN colors c ON ec.color_id = c.color_id
                WHERE c.color_name = ANY($${paramIndex++})
            `);
            params.push(colorList);
        }
    }

    const joiner = match_type === 'all' ? ' INTERSECT ' : ' UNION ';
    const combinedQuery = subqueries.join(joiner);

    const finalQuery = `
        SELECT
            e.episode_id, e.title, e.season, e.episode_number,
            TO_CHAR(e.broadcast_date, 'YYYY-MM-DD') as broadcast_date,
            (SELECT json_agg(c.color_name ORDER BY c.color_name) FROM episode_colors ec JOIN colors c ON ec.color_id = c.color_id WHERE ec.episode_id = e.episode_id) as colors,
            (SELECT json_agg(s.subject_name ORDER BY s.subject_name) FROM episode_subjects es JOIN subjects s ON es.subject_id = s.subject_id WHERE es.episode_id = e.episode_id) as subjects
        FROM episodes e
        WHERE e.episode_id IN (${combinedQuery})
        ORDER BY e.season, e.episode_number;
    `;

    try {
        const result = await pool.query(finalQuery, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Query Error:', err.message);
        res.status(500).json({ error: 'An error occurred while querying the database.', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
