export const isIdColumn = (key: string, header: string): boolean => {
    // Filter by Header
    if (header === '序号') return true;
    if (matchId(header)) return true;

    // Filter by Key
    if (matchId(key)) return true;
    if (key === '1') return true; // Special case for "序号" mapped to "1"

    return false;
};

const matchId = (str: string) => {
    if (!str) return false;
    const s = str.toLowerCase();
    return s.endsWith('id') || s.endsWith('_id') || s.includes('编号'); // Common ID patterns
};

export const filterColumns = (keys: string[], headers?: string[]) => {
    const validIndices: number[] = [];

    keys.forEach((key, idx) => {
        const header = headers ? headers[idx] : key;
        if (!isIdColumn(key, String(header || ""))) {
            validIndices.push(idx);
        }
    });

    return validIndices;
};
