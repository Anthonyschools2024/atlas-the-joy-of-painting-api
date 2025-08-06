// etl_script.js
const fs = require('fs');
const { parse } = require('csv-parse');
const { Pool } = require('pg');
const path = require('path');

// --- DATABASE CONNECTION DETAILS ---
// IMPORTANT: Replace with your actual database credentials
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'joy_of_painting',
    password: 'your_password', // Change this!
    port: 5432,
});

// --- FILE PATHS ---
const DATA_DIR = 'data';
const EPISODE_DATES_PATH = path.join(DATA_DIR, 'The Joy Of Painting - Episode Dates');
const COLORS_USED_PATH = path.join(DATA_DIR, 'The Joy Of Painiting - Colors Used(1)');
const SUBJECT_MATTER_PATH = path.join(DATA_DIR, 'The Joy Of Painiting - Subject Matter');

// --- HELPER FUNCTIONS ---
const cleanTitle = (title) => {
    if (!title) return '';
    return title.replace(/"/g, '').replace('Mt.', 'Mount').trim().toUpperCase();
};

const extractDates = async (filePath) => {
    const datePattern = /"([^"]+)" \(([^)]+)\)/;
    const episodes = [];
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    for (const line of lines) {
        const match = line.match(datePattern);
        if (match) {
            const [, title, dateStr] = match;
            const dateObj = new Date(dateStr.trim());
            episodes.push({ title: cleanTitle(title), broadcast_date: dateObj.toISOString().split('T')[0] });
        }
    }
    return episodes;
};

const extractCsvData = (filePath) => {
    return new Promise((resolve, reject) => {
        const records = [];
        const parser = parse({
            columns: true,
            skip_empty_lines: true
        });
        parser.on('readable', function() {
            let record;
            while ((record = parser.read()) !== null) {
                records.push(record);
            }
        });
        parser.on('error', (err) => reject(err));
        parser.on('end', () => resolve(records));
        fs.createReadStream(filePath).pipe(parser);
    });
};

const main = async () => {
    console.log("Starting ETL process...");
    const client = await pool.connect();

    try {
        // --- EXTRACT ---
        console.log("--- Step 1: Extracting Data ---");
        const dateData = await extractDates(EPISODE_DATES_PATH);
        const colorData = await extractCsvData(COLORS_USED_PATH);
        const subjectData = await extractCsvData(SUBJECT_MATTER_PATH);
        console.log(`Extracted ${dateData.length} date records, ${colorData.length} color records, ${subjectData.length} subject records.`);

        // --- TRANSFORM ---
        console.log("--- Step 2: Transforming and Merging Data ---");
        const episodeMap = new Map();

        colorData.forEach(row => {
            const title = cleanTitle(row.painting_title);
            let colors = [];
            try {
                colors = JSON.parse(row.colors.replace(/'/g, '"').replace(/\r\n/g, '').replace(/\\/g, ''));
            } catch (e) {
                console.warn(`Could not parse colors for title: ${title}`);
            }
            episodeMap.set(title, {
                title: title,
                season: parseInt(row.season, 10),
                episode: parseInt(row.episode, 10),
                colors: colors,
                subjects: []
            });
        });

        dateData.forEach(row => {
            const title = row.title;
            if (episodeMap.has(title)) {
                episodeMap.get(title).broadcast_date = row.broadcast_date;
            }
        });

        subjectData.forEach(row => {
            const title = cleanTitle(row.TITLE);
            if (episodeMap.has(title)) {
                const subjects = [];
                for (const key in row) {
                    if (row[key] === '1') {
                        subjects.push(key);
                    }
                }
                episodeMap.get(title).subjects = subjects;
            }
        });

        const mergedData = Array.from(episodeMap.values());
        console.log(`Data merged. Total records to process: ${mergedData.length}`);

        // --- LOAD ---
        console.log("--- Step 3: Loading Data into Database ---");
        await client.query('BEGIN');

        const allColors = [...new Set(mergedData.flatMap(e => e.colors))];
        const allSubjects = [...new Set(mergedData.flatMap(e => e.subjects))];

        for (const color of allColors) {
            await client.query('INSERT INTO colors (color_name) VALUES ($1) ON CONFLICT (color_name) DO NOTHING', [color]);
        }
        console.log("Colors master table populated.");

        for (const subject of allSubjects) {
            await client.query('INSERT INTO subjects (subject_name) VALUES ($1) ON CONFLICT (subject_name) DO NOTHING', [subject]);
        }
        console.log("Subjects master table populated.");

        const colorRes = await client.query('SELECT color_name, color_id FROM colors');
        const colorMap = new Map(colorRes.rows.map(r => [r.color_name, r.color_id]));

        const subjectRes = await client.query('SELECT subject_name, subject_id FROM subjects');
        const subjectMap = new Map(subjectRes.rows.map(r => [r.subject_name, r.subject_id]));

        for (const episode of mergedData) {
            if (!episode.broadcast_date) continue; // Skip if no date was found
            const episodeInsertRes = await client.query(
                'INSERT INTO episodes (title, season, episode_number, broadcast_date) VALUES ($1, $2, $3, $4) RETURNING episode_id',
                [episode.title, episode.season, episode.episode, episode.broadcast_date]
            );
            const episodeId = episodeInsertRes.rows[0].episode_id;

            for (const colorName of episode.colors) {
                if (colorMap.has(colorName)) {
                    await client.query('INSERT INTO episode_colors (episode_id, color_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [episodeId, colorMap.get(colorName)]);
                }
            }

            for (const subjectName of episode.subjects) {
                if (subjectMap.has(subjectName)) {
                    await client.query('INSERT INTO episode_subjects (episode_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [episodeId, subjectMap.get(subjectName)]);
                }
            }
        }
        console.log("Episodes and junction tables populated.");

        await client.query('COMMIT');
        console.log("ETL process completed successfully.");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("ETL process failed:", e);
    } finally {
        client.release();
        pool.end();
    }
};

main();
