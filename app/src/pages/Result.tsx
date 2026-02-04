import { useState, useEffect } from 'react';
import { filterColumns } from '@/lib/filter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Download, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import type { SystemMetadata, SystemDetail } from '@/types';
import type { GenerationConfig } from './GenerateConfig';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

interface ResultProps {
    config: GenerationConfig;
    allSystems: SystemMetadata[];
    onBack: () => void;
}

// Utility to filter content rows based on Industry/Project Type
const filterSystemContent = (content: any[], keys: string[], config: GenerationConfig) => {
    // If no specific filters, return all
    if (config.industries.length === 0 && config.projectTypes.length === 0) {
        return content;
    }

    // Attempt to find relevant columns (Fuzzy match)
    // Common keys seen: "业态" (Industry/Type), "适用范围" (Scope)
    const industryKey = keys.find(k => k.includes('业态') || k.includes('产业') || k.includes('项目类型'));

    if (!industryKey) {
        // If no column found to filter by, return all content (Fail safe)
        return content;
    }

    const filters = [...config.industries, ...config.projectTypes];

    return content.filter(row => {
        const val = String(row[industryKey] || "");
        // If cell is empty, assume it applies to all (or none? Usually blank means common)
        if (!val.trim()) return true;

        // Check if any selected industry matches the cell value
        // The cell might contain "住宅, 商业" (comma separated)
        return filters.some(f => val.includes(f));
    });
};

export default function Result({ config, allSystems, onBack }: ResultProps) {
    const [systemsToExport, setSystemsToExport] = useState<SystemMetadata[]>([]);
    const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
    const [systemDetails, setSystemDetails] = useState<Record<string, SystemDetail>>({});
    const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

    useEffect(() => {
        // Group all systems by their module name (systemName)
        const groups: Record<string, SystemMetadata[]> = {};

        allSystems.forEach(s => {
            if (config.modules.includes(s.systemName)) {
                if (!groups[s.systemName]) {
                    groups[s.systemName] = [];
                }
                groups[s.systemName].push(s);
            }
        });

        // For each group, pick the "Best" candidate to serve as the base for Generation
        // Strategy: Pick the one with the most items (likely most comprehensive)
        // Future: could match s.client against config.industries if we had mapping
        const generatedList: SystemMetadata[] = Object.entries(groups).map(([moduleName, candidates]) => {
            // Sort by itemCount desc
            candidates.sort((a, b) => b.itemCount - a.itemCount);
            const best = candidates[0];

            // Create a "Virtual" system representing the generated result
            return {
                ...best,
                id: `GEN_${best.id}`, // Virtual ID to avoid conflict with raw cache if we wanted to separate
                client: "系统生成", // Generic client name for the generated file
                filename: `${moduleName}.xlsx`, // Clean filename
                tags: ["Generated", ...config.industries, ...config.projectTypes]
            };
        });

        setSystemsToExport(generatedList);
    }, [config, allSystems]);

    const loadDetail = async (id: string) => {
        if (systemDetails[id]) return;
        setLoadingDetail(id);

        // Strip GEN_ prefix to get real ID
        const realId = id.startsWith('GEN_') ? id.replace('GEN_', '') : id;

        try {
            const res = await fetch(`/systems/${realId}.json`);
            const data = await res.json();

            // Apply filtering immediately upon load ? 
            // Better to match strictly.
            // But we need to keep original "content" maybe? 
            // Let's store filtered version in a separate property or filter render-time.
            // For simplicity, we filter here and store the "Effective Content" for this session.

            const filteredContent = filterSystemContent(data.content, data.keys, config);

            setSystemDetails(prev => ({
                ...prev,
                [id]: { // Store using the Virtual ID key
                    ...data,
                    content: filteredContent,
                    itemCount: filteredContent.length // Update item count match
                }
            }));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDetail(null);
        }
    };

    const toggleExpand = (id: string) => {
        if (expandedSystem === id) {
            setExpandedSystem(null);
        } else {
            setExpandedSystem(id);
            loadDetail(id);
        }
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        const folder = zip.folder("体系文件");

        await Promise.all(systemsToExport.map(async (sys) => {
            let detail = systemDetails[sys.id];

            // If not loaded yet, fetch and filter
            if (!detail) {
                const realId = sys.id.startsWith('GEN_') ? sys.id.replace('GEN_', '') : sys.id;
                const res = await fetch(`/systems/${realId}.json`);
                const data = await res.json();
                const filteredContent = filterSystemContent(data.content, data.keys, config);
                detail = {
                    ...data,
                    content: filteredContent,
                    itemCount: filteredContent.length
                };
                // Cache it too
                setSystemDetails(prev => ({ ...prev, [sys.id]: detail }));
            }

            // Identify visible columns (excluding IDs)
            const visibleIndices = filterColumns(detail.keys, detail.originalHeader);

            // Construct clean data for Excel
            const cleanData = detail.content.map(row => {
                const newRow: Record<string, any> = {};
                visibleIndices.forEach(idx => {
                    const header = detail.originalHeader?.[idx] || detail.keys[idx];
                    const key = detail.keys[idx];
                    newRow[header] = row[key];
                });
                return newRow;
            });

            // Generate Excel Buffer
            const ws = XLSX.utils.json_to_sheet(cleanData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

            folder?.file(sys.filename || `${sys.systemName}.xlsx`, excelBuffer);
        }));

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `项目体系文件包-${new Date().toISOString().split('T')[0]}.zip`);
    };

    return (
        <div className="min-h-screen bg-muted/20 p-4 md:p-8 pb-24">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={onBack}>
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            返回
                        </Button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold">体系生成结果</h1>
                            <p className="text-muted-foreground">
                                基于您选择的行业与项目类型，已提取并优化生成 {systemsToExport.length} 个体系模块
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            size="lg" 
                            onClick={handleDownloadAll} 
                            className="gap-2"
                            disabled={systemsToExport.length === 0}
                        >
                            <Download className="w-5 h-5" />
                            打包下载新体系
                        </Button>
                    </div>
                </div>

                {systemsToExport.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">未生成体系模块</h3>
                        <p className="text-muted-foreground mb-6">请检查您的配置选项，确保选择了有效的行业和项目类型</p>
                        <Button variant="default" onClick={onBack}>
                            返回重新配置
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {systemsToExport.map(sys => {
                            const detail = systemDetails[sys.id];
                            // Use dynamic count if loaded, else use meta count (approx)
                            const count = detail ? detail.itemCount : sys.itemCount;

                            return (
                                <Card key={sys.id} className="overflow-hidden">
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => toggleExpand(sys.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-primary/10 rounded text-primary">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold truncate">{sys.systemName}</h3>
                                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                    <span className="whitespace-nowrap">{sys.client}</span>
                                                    <span>•</span>
                                                    {/* Highlight if filtered */}
                                                    <span className="whitespace-nowrap">{count} 项标准</span>
                                                    {detail && detail.itemCount < sys.itemCount && (
                                                        <span className="text-amber-600 bg-amber-100 px-2 rounded-full text-xs whitespace-nowrap">
                                                            (已根据业态优化)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {loadingDetail === sys.id && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                                    <span className="text-sm text-muted-foreground">处理中...</span>
                                                </div>
                                            )}
                                            {expandedSystem === sys.id ? (
                                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>

                                    {expandedSystem === sys.id && detail && (
                                        <div className="border-t bg-muted/10 p-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="bg-card rounded border overflow-x-auto max-h-[400px]">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-muted text-muted-foreground sticky top-0">
                                                        <tr>
                                                            {filterColumns(detail.keys, detail.originalHeader).map((idx) => (
                                                                <th key={detail.keys[idx]} className="p-2 border-b whitespace-nowrap">
                                                                    {detail.originalHeader?.[idx] || detail.keys[idx]}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detail.content.slice(0, 50).map((row, rIdx) => (
                                                            <tr key={rIdx} className="hover:bg-muted/30 border-b last:border-0">
                                                                {filterColumns(detail.keys, detail.originalHeader).map((idx) => (
                                                                    <td key={detail.keys[idx]} className="p-2 truncate max-w-[200px]" title={String(row[detail.keys[idx]])}>
                                                                        {String(row[detail.keys[idx]] || "")}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                        {detail.content.length > 50 && (
                                                            <tr>
                                                                <td colSpan={filterColumns(detail.keys, detail.originalHeader).length} className="p-4 text-center text-muted-foreground">
                                                                    还有 {detail.content.length - 50} 条数据...
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {detail.content.length === 0 && (
                                                            <tr>
                                                                <td colSpan={detail.keys.length} className="p-8 text-center text-muted-foreground">
                                                                    当前业态下无匹配标准项
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
