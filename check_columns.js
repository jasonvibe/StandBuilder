const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = '体系数据库';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));

// Check a few files for "业态" column
const MAX_CHECK = 3;
let checked = 0;

files.forEach(file => {
    if (checked >= MAX_CHECK) return;

    const filePath = path.join(dir, file);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (json.length > 0) {
        const header = json[0];
        const idx = header.indexOf('业态');
        console.log(`[${file}] '业态' column index: ${idx}`);

        if (idx !== -1 && json.length > 2) {
            // Show some values from this column
            const sampleValues = json.slice(2, 7).map(row => row[idx]);
            console.log(`Values: ${sampleValues.join(', ')}`);
        }
    }
    checked++;
});
