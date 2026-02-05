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

// Utility to deduplicate rows based on content signature
const deduplicateContent = (content: any[]) => {
    const uniqueMap = new Map();
    
    return content.filter(row => {
        // Create a signature based on key content fields
        // Using all values to be safe, or we could target specific columns like "Target"
        const signature = Object.values(row).map(v => String(v).trim()).join('|');
        
        if (uniqueMap.has(signature)) {
            return false;
        }
        uniqueMap.set(signature, true);
        return true;
    });
};

// Utility to filter content rows based on Industry/Project Type
const filterSystemContent = (content: any[], keys: string[], config: GenerationConfig) => {
    // If no specific filters, return all (but deduplicated)
    if (config.industries.length === 0 && config.projectTypes.length === 0) {
        return deduplicateContent(content);
    }

    // 1. Industry Filter (mapped to CateChoose, ChildCate, etc.)
    // Columns: CateChoose, ChildCate, LibraryName, TargetCh
    const industryKeywords = ['CateChoose', 'ChildCate', 'LibraryName', 'TargetCh', '业态', '产业', '适用范围'];
    const industryCols = keys.filter(k => industryKeywords.some(kw => k.includes(kw)));
    const universalKeywords = ['通用', '全', 'All', 'General', 'Common'];

    // 2. Project Type Filter (mapped to CateName, etc.)
    // Columns: CateName
    const typeKeywords = ['CateName', '项目类型'];
    const typeCols = keys.filter(k => typeKeywords.some(kw => k.includes(kw)));

    // If no columns found, fall back to simple search on all columns? Or just return content?
    // Let's stick to strict filtering if columns exist.

    const filtered = content.filter(row => {
        // A. Check Industry (OR logic between selected industries)
        let industryMatch = true;
        if (config.industries.length > 0 && industryCols.length > 0) {
            // Must match AT LEAST ONE selected industry in ANY of the industry columns
            // Actually, usually a row specifies ONE industry it belongs to.
            // If the row says "住宅", and we selected "住宅", it matches.
            // If the row says "住宅,商业", and we selected "住宅", it matches.
            
            // Logic: Is this row relevant to the selected industries?
            // Yes if: Row Industry Value matches any Selected Industry
            
            // What if the row is blank? Assume universal? Let's assume universal for now.
            const rowIndustryValues = industryCols.map(col => String(row[col] || "").trim());
            const hasValue = rowIndustryValues.some(v => v.length > 0);
            
            if (hasValue) {
                // Check if any row value is "Universal"
                const isUniversal = rowIndustryValues.some(v => universalKeywords.some(u => v.includes(u)));
                if (isUniversal) {
                    industryMatch = true;
                } else {
                    // If the row specifies industries, it must match one of our selections
                    industryMatch = config.industries.some(selectedInd => 
                        rowIndustryValues.some(rowVal => rowVal.includes(selectedInd))
                    );
                }
            } else {
                // If blank, treat as universal (match)
                industryMatch = true; 
            }
        }

        // B. Check Project Type
        let typeMatch = true;
        if (config.projectTypes.length > 0 && typeCols.length > 0) {
            const rowTypeValues = typeCols.map(col => String(row[col] || "").trim());
            const hasValue = rowTypeValues.some(v => v.length > 0);
            
            if (hasValue) {
                const isUniversal = rowTypeValues.some(v => universalKeywords.some(u => v.includes(u)));
                if (isUniversal) {
                    typeMatch = true;
                } else {
                    typeMatch = config.projectTypes.some(selectedType => 
                        rowTypeValues.some(rowVal => rowVal.includes(selectedType))
                    );
                }
            } else {
                typeMatch = true;
            }
        }

        // 3. Special Requirements Filter (Keyword matching)
        // If user provided keywords, we check if ANY column contains ANY of the keywords.
        // This is a rough approximation of "AI" matching.
        let requirementMatch = true;
        
        if (config.useAI && config.specialRequirements && config.specialRequirements.trim().length > 0) {
            // Extract keywords: split by common separators
            // Improved Stop words list: filter out common connector words
            const stopWords = ['我', '我们', '只需要', '只', '要', '想', '查看', '显示', '和', '与', '的', '内容', '相关', '数据', '体系', '标准', '模块', '包含', '包括', '只有', '仅', '等'];
            
            const keywords = config.specialRequirements
                .split(/[,，、\s]+/)
                .map(k => {
                    // Remove stop words from inside the token? Or just filter?
                    // Let's try to strip stop words from the token if it matches
                    let clean = k;
                    stopWords.forEach(sw => {
                       clean = clean.replace(sw, ''); 
                    });
                    return clean;
                })
                .filter(k => k.length > 0); 

            if (keywords.length > 0) {
                // Check if row matches ANY keyword
                // Use JSON.stringify to include ALL values in search (including nested if any, though content is flat)
                // Lowercase for case-insensitive match
                const rowString = JSON.stringify(row).toLowerCase();
                
                // Should match ALL keywords or ANY?
                // "土建、二次结构" usually means "土建 OR 二次结构" in this context
                const hasKeyword = keywords.some(kw => rowString.includes(kw.toLowerCase()));
                
                // If keywords exist but none match, then this row is filtered out
                if (!hasKeyword) {
                    requirementMatch = false;
                }
            }
        }

        return industryMatch && typeMatch && requirementMatch;
    });

    return deduplicateContent(filtered);
};

export default function Result({ config, allSystems, onBack }: ResultProps) {
    const [systemsToExport, setSystemsToExport] = useState<SystemMetadata[]>([]);
    const [expandedSystem, setExpandedSystem] = useState<string | null>(null);
    const [systemDetails, setSystemDetails] = useState<Record<string, SystemDetail>>({});
    const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

    useEffect(() => {
        // Group all systems by their module name (systemName or module field)
        const groups: Record<string, SystemMetadata[]> = {};

        allSystems.forEach(s => {
            // Determine the effective module name
            // Use 'module' field if available, otherwise fallback to systemName if it matches a standard module
            let effectiveModule = s.module;
            if (!effectiveModule && config.modules.includes(s.systemName)) {
                effectiveModule = s.systemName;
            }

            if (effectiveModule && config.modules.includes(effectiveModule)) {
                // Check if system is applicable based on metadata
                const isIndustryApplicable = !s.applicableIndustries || s.applicableIndustries.length === 0 || 
                    s.applicableIndustries.some(ind => config.industries.includes(ind));
                
                const isTypeApplicable = !s.applicableProjectTypes || s.applicableProjectTypes.length === 0 || 
                    s.applicableProjectTypes.some(type => config.projectTypes.includes(type));

                if (isIndustryApplicable && isTypeApplicable) {
                    if (!groups[effectiveModule]) {
                        groups[effectiveModule] = [];
                    }
                    groups[effectiveModule].push(s);
                }
            }
        });

        // For each group, merge content from all candidates
        const generatedList: SystemMetadata[] = Object.entries(groups).map(([moduleName, candidates]) => {
            // 1. Merge content from all candidates
            // We assume they share a similar schema if they are in the same module.
            // If strict schema matching is needed, we'd need more logic.
            let mergedContent: any[] = [];
            
            // Track source counts for info
            const sourceCounts: { name: string; count: number }[] = [];

            candidates.forEach(c => {
                // User uploaded files have `content` in memory (from App.tsx/Home.tsx)
                // MASTER_STD now also has `content` (from App.tsx update)
                // We need to cast to any because SystemMetadata definition might be strict or missing content in some versions
                const sysContent = (c as any).content || [];
                
                if (sysContent.length > 0) {
                    // Filter THIS specific content based on config before merging?
                    // Yes, we should filter relevant rows from each source first.
                    const filteredSourceContent = filterSystemContent(sysContent, Object.keys(sysContent[0] || {}), config);
                    
                    if (filteredSourceContent.length > 0) {
                        mergedContent = [...mergedContent, ...filteredSourceContent];
                        // Only add to source counts if we actually added items from this source
                        sourceCounts.push({ name: c.client, count: filteredSourceContent.length });
                    }
                }
            });

            // 2. Deduplicate the merged content
            const finalContent = deduplicateContent(mergedContent);

            // 3. Pick a "base" candidate for metadata (keys, headers)
            // Usually the first one or the one with most content is a good template
            candidates.sort((a, b) => b.itemCount - a.itemCount);
            const baseSystem = candidates[0];

            // Generate source info string
            // Fix: Show the actual contribution AFTER deduplication? 
            // Deduplication makes it hard to attribute exactly "which source" a row came from if duplicates exist.
            // But we can show the "Extracted" count (before dedup) as a rough indicator of contribution.
            const sourceInfo = `来源: ${sourceCounts.map(sc => `${sc.name} (${sc.count}项)`).join(', ')}`;
            
            // Generate match logic description
            const matchLogicParts = [];
            if (config.industries.length > 0) matchLogicParts.push(`行业匹配: ${config.industries.join(', ')}`);
            if (config.projectTypes.length > 0) matchLogicParts.push(`项目类型匹配: ${config.projectTypes.join(', ')}`);
            if (config.specialRequirements) matchLogicParts.push(`特殊要求: ${config.specialRequirements}`);
            const matchLogic = matchLogicParts.length > 0 ? matchLogicParts.join(' | ') : '通用匹配';

            // Create a "Virtual" system representing the generated result
            const generatedSystem = {
                ...baseSystem,
                id: `GEN_${moduleName}_${Date.now()}`, // Unique ID
                client: "系统生成",
                filename: `${moduleName}.xlsx`,
                systemName: moduleName,
                tags: ["Generated", ...config.industries, ...config.projectTypes],
                itemCount: finalContent.length, // This is the count AFTER deduplication
                sourceInfo,
                matchLogic,
                // Store the actual generated content attached to this object
                content: finalContent,
                // Store keys from base system (assuming consistent schema)
                keys: (baseSystem as any).keys || (finalContent.length > 0 ? Object.keys(finalContent[0]) : []),
                originalHeader: (baseSystem as any).originalHeader || (finalContent.length > 0 ? Object.keys(finalContent[0]) : [])
            };

            return generatedSystem;
        });

        setSystemsToExport(generatedList);
    }, [config, allSystems]);

    const loadDetail = async (id: string) => {
        if (systemDetails[id]) return;
        setLoadingDetail(id);

        // Strip GEN_ prefix to get real ID if needed, but for generated systems we have content attached!
        // Check if the system object in allSystems/systemsToExport already has content.
        const generatedSys = systemsToExport.find(s => s.id === id);
        
        if (generatedSys && (generatedSys as any).content) {
             // For generated systems, we already computed the content in useEffect
             setSystemDetails(prev => ({
                ...prev,
                [id]: {
                    ...generatedSys,
                    content: (generatedSys as any).content,
                    keys: (generatedSys as any).keys,
                    originalHeader: (generatedSys as any).originalHeader,
                    itemCount: (generatedSys as any).content.length
                } as SystemDetail
            }));
            setLoadingDetail(null);
            return;
        }

        // Fallback for non-generated or if content missing (legacy path)
        const realId = id.startsWith('GEN_') ? id.replace('GEN_', '') : id;

        try {
            let data: any;
            
            // Check if we already have the content in allSystems (User uploaded files)
            const existingSystem = allSystems.find(s => s.id === realId) as any;
            
            if (existingSystem && existingSystem.content && existingSystem.content.length > 0) {
                data = {
                    ...existingSystem,
                    content: existingSystem.content,
                    keys: existingSystem.keys || Object.keys(existingSystem.content[0] || {}),
                    originalHeader: existingSystem.originalHeader || Object.keys(existingSystem.content[0] || {}),
                    itemCount: existingSystem.itemCount
                };
            } else if (realId === 'MASTER_STD') {
                const res = await fetch('/standards_master.json');
                const content = await res.json();
                const keys = content.length > 0 ? Object.keys(content[0]) : [];
                data = {
                    id: 'MASTER_STD',
                    content,
                    keys,
                    originalHeader: keys,
                    itemCount: content.length
                };
            } else {
                // Fallback for server-side static files if any
                const res = await fetch(`/systems/${realId}.json`);
                data = await res.json();
            }

            // Filter content based on config
            // Note: For generated systems, content is ALREADY filtered and merged. 
            // This path is mainly for "viewing original file" if we supported that, 
            // but for "Result" view we usually view the generated one.
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
            console.error("Failed to load details for", id, e);
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
                let data;
                if (realId === 'MASTER_STD') {
                    const res = await fetch('/standards_master.json');
                    const content = await res.json();
                    const keys = content.length > 0 ? Object.keys(content[0]) : [];
                    data = {
                        id: 'MASTER_STD',
                        content,
                        keys,
                        originalHeader: keys,
                        itemCount: content.length
                    };
                } else {
                    const res = await fetch(`/systems/${realId}.json`);
                    data = await res.json();
                }
                
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
                                                <h3 className="text-lg font-semibold truncate flex items-center gap-3">
                                                    {sys.systemName}
                                                    {sys.matchLogic && (
                                                        <span className="text-xs font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                            {sys.matchLogic}
                                                        </span>
                                                    )}
                                                </h3>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                        <span className="whitespace-nowrap">{sys.client}</span>
                                                        <span>•</span>
                                                        <span className="whitespace-nowrap">{count} 项标准</span>
                                                        {detail && detail.itemCount < sys.itemCount && (
                                                            <span className="text-amber-600 bg-amber-100 px-2 rounded-full text-xs whitespace-nowrap">
                                                                (已优化)
                                                            </span>
                                                        )}
                                                    </div>
                                                    {sys.sourceInfo && (
                                                        <div className="text-xs text-muted-foreground/80 truncate mt-1 block" title={sys.sourceInfo}>
                                                            {sys.sourceInfo}
                                                        </div>
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
