const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SOURCE_DIR = path.resolve(__dirname, '../../体系数据库');
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const OUTPUT_DIR = path.join(PUBLIC_DIR, 'systems');
const DB_OUTPUT = path.join(PUBLIC_DIR, 'db.json');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
const RAW_DIR = path.join(PUBLIC_DIR, 'rawFiles');
if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true });
}

function parseFilename(filename) {
    // Example: 东威科技-PROD(东威科技)工序验收体系-20260130.xls
    // Regex to match: [Client]-PROD([Context])[SystemName]-[Date].xls
    const regex = /^(.+)-PROD\((.+)\)(.+)-(\d+)\.xls[x]?$/;
    const match = filename.match(regex);

    if (match) {
        return {
            client: match[1],
            context: match[2],
            systemName: match[3],
            date: match[4]
        };
    }
    return null;
}

function processFiles() {
    console.log(`Scanning ${SOURCE_DIR}...`);
    const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

    const db = [];

    files.forEach((file, index) => {
        const filePath = path.join(SOURCE_DIR, file);
        const metadata = parseFilename(file);

        if (!metadata) {
            console.warn(`Skipping file with unknown format: ${file}`);
            return;
        }

        const id = `SYS_${index.toString().padStart(3, '0')}`; // Simple ID

        console.log(`Processing [${id}] ${file}...`);

        // Read Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        // header: 1 returns array of arrays. header: 'A' returns object with keys A,B,C...
        // We probably want specific parsing.
        // Based on inspection, Row 1 (index 1) is the Key row.

        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Structure: 
        // Row 0: Chinese desc (ignore for keys, keep for labels if needed)
        // Row 1: Keys (CateId, CateName...)
        // Row 2+: Data

        let content = [];
        if (rawData.length > 2) {
            const resultKeys = rawData[1]; // Use 2nd row as keys
            // Filter out empty keys

            for (let i = 2; i < rawData.length; i++) {
                const row = rawData[i];
                if (!row || row.length === 0) continue;

                const rowObj = {};
                resultKeys.forEach((key, kIndex) => {
                    if (key) {
                        rowObj[key] = row[kIndex];
                    }
                });
                content.push(rowObj);
            }
        }

        // Save detailed JSON
        // We include the full content in the individual file
        const systemData = {
            id,
            ...metadata,
            filename: file,
            originalHeader: rawData[0], // Keep Chinese headers if useful for display
            keys: rawData[1],
            content
        };

        fs.writeFileSync(path.join(OUTPUT_DIR, `${id}.json`), JSON.stringify(systemData, null, 2));

        // Copy content to public/rawFiles
        fs.copyFileSync(filePath, path.join(RAW_DIR, file));

        // Add to DB Index (exclude heavy content)
        db.push({
            id,
            ...metadata,
            filename: file,
            rawPath: `/rawFiles/${file}`,
            itemCount: content.length,
            tags: [metadata.client, metadata.systemName] // Basic tags
        });
    });

    // Save DB
    fs.writeFileSync(DB_OUTPUT, JSON.stringify(db, null, 2));
    console.log(`Ingestion complete. Processed ${db.length} files.`);
}

processFiles();
