const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Point to the structured directory we just created
const SOURCE_DIR = '/Users/jasonmeng/Documents/Ai_Projects/数据库/体系库_Structured';
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
            // Client is now better derived from directory, but we keep filename parsing as fallback/verification
            filenameClient: match[1],
            context: match[2],
            systemName: match[3],
            date: match[4]
        };
    }
    return {
        systemName: filename.replace(/\.xls[x]?$/, ''),
        date: ''
    };
}

// Recursive function to walk directories and collect files with metadata
function walkDir(dir, industry, moduleName, clientName, fileList) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Determine the next level of hierarchy
            // Root -> Industry -> Module -> Client -> Files
            if (!industry) {
                walkDir(filePath, file, null, null, fileList);
            } else if (!moduleName) {
                walkDir(filePath, industry, file, null, fileList);
            } else if (!clientName) {
                walkDir(filePath, industry, moduleName, file, fileList);
            } else {
                // Already deep enough, continue or just treat subdirs as flat
                walkDir(filePath, industry, moduleName, clientName, fileList);
            }
        } else if (file.endsWith('.xls') || file.endsWith('.xlsx')) {
            // We found a file
            // If we are at the root or shallow levels, some metadata might be missing
            // But based on our structure, we expect Industry/Module/Client/File
            fileList.push({
                filePath,
                filename: file,
                industry: industry || 'Uncategorized',
                module: moduleName || 'General',
                client: clientName || 'Unknown'
            });
        }
    }
}

function processFiles() {
    console.log(`Scanning ${SOURCE_DIR}...`);
    
    const allFiles = [];
    walkDir(SOURCE_DIR, null, null, null, allFiles);

    console.log(`Found ${allFiles.length} files.`);

    const db = [];

    allFiles.forEach((fileInfo, index) => {
        const { filePath, filename, industry, module, client } = fileInfo;
        const fileMetadata = parseFilename(filename);

        const id = `SYS_${index.toString().padStart(3, '0')}`; // Simple ID

        console.log(`Processing [${id}] ${filename}...`);

        try {
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
            let keys = [];
            let originalHeader = [];

            if (rawData.length > 1) {
                originalHeader = rawData[0];
                // Check if row 1 exists, otherwise fall back to row 0 or generate keys
                if (rawData.length > 1) {
                     keys = rawData[1];
                } else {
                     keys = rawData[0]; // Fallback if only 1 row
                }

                for (let i = 2; i < rawData.length; i++) {
                    const row = rawData[i];
                    if (!row || row.length === 0) continue;

                    const rowObj = {};
                    let hasData = false;
                    keys.forEach((key, kIndex) => {
                        if (key) {
                            rowObj[key] = row[kIndex];
                            hasData = true;
                        }
                    });
                    if (hasData) content.push(rowObj);
                }
            }

            // Construct System Metadata
            const metadata = {
                id,
                client: client, // Prioritize directory structure
                context: fileMetadata.context || '',
                systemName: fileMetadata.systemName || filename,
                module: module, // From directory
                applicableIndustries: [industry], // From directory
                applicableProjectTypes: [], // Placeholder
                date: fileMetadata.date || '',
                filename: filename,
                rawPath: `/rawFiles/${filename}`,
                itemCount: content.length,
                tags: [client, module, industry]
            };

            // Save detailed JSON
            const systemData = {
                ...metadata,
                originalHeader,
                keys,
                content
            };

            fs.writeFileSync(path.join(OUTPUT_DIR, `${id}.json`), JSON.stringify(systemData, null, 2));

            // Copy content to public/rawFiles
            fs.copyFileSync(filePath, path.join(RAW_DIR, filename));

            // Add to DB Index (exclude heavy content)
            db.push(metadata);

        } catch (err) {
            console.error(`Error processing ${filename}:`, err);
        }
    });

    // Save DB
    fs.writeFileSync(DB_OUTPUT, JSON.stringify(db, null, 2));
    console.log(`Ingestion complete. Processed ${db.length} files.`);
}

processFiles();
