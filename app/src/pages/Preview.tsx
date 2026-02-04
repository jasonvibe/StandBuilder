import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SystemDetail } from '@/types';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { filterColumns } from '@/lib/filter';
import * as XLSX from 'xlsx';

interface PreviewProps {
    systemId: string | null;
    open: boolean;
    onClose: () => void;
}

export default function Preview({ systemId, open, onClose }: PreviewProps) {
    const [detail, setDetail] = useState<SystemDetail | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && systemId) {
            setLoading(true);
            setDetail(null);
            fetch(`/systems/${systemId}.json`)
                .then(res => res.json())
                .then(data => {
                    setDetail(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load details", err);
                    setLoading(false);
                });
        }
    }, [open, systemId]);

    const visibleIndices = useMemo(() => {
        if (!detail) return [];
        return filterColumns(detail.keys, detail.originalHeader);
    }, [detail]);

    const handleDownload = () => {
        if (!detail) return;

        // Construct clean data
        const cleanData = detail.content.map(row => {
            const newRow: Record<string, any> = {};
            visibleIndices.forEach(idx => {
                const header = detail.originalHeader?.[idx] || detail.keys[idx];
                const key = detail.keys[idx];
                newRow[header] = row[key];
            });
            return newRow;
        });

        const ws = XLSX.utils.json_to_sheet(cleanData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, (detail.filename || 'export.xlsx'));
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {detail ? detail.systemName : '加载中...'}
                        {detail && <span className="text-sm font-normal text-muted-foreground ml-2">({detail.client})</span>}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto border rounded-md min-h-[300px]">
                    {loading && <div className="p-10 text-center text-muted-foreground">加载体系内容...</div>}

                    {!loading && detail && (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground sticky top-0">
                                <tr>
                                    {visibleIndices.map((idx) => (
                                        <th key={detail.keys[idx]} className="p-2 border-b whitespace-nowrap">
                                            {detail.originalHeader?.[idx] || detail.keys[idx]}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {detail.content.slice(0, 100).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-muted/30 border-b last:border-0">
                                        {visibleIndices.map((idx) => (
                                            <td key={detail.keys[idx]} className="p-2 truncate max-w-[200px]" title={String(row[detail.keys[idx]])}>
                                                {String(row[detail.keys[idx]] || "")}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {detail.content.length > 100 && (
                                    <tr>
                                        <td colSpan={visibleIndices.length} className="p-4 text-center text-muted-foreground">
                                            (仅展示前 100 条Preview, 共 {detail.content.length} 条)
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    {detail && (
                        <Button onClick={handleDownload}>
                            <Download className="w-4 h-4 mr-2" />
                            下载查看文件
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
