import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, FolderKanban, FileSpreadsheet, Sparkles, Download, Trash2, Tag } from 'lucide-react';
import type { SystemMetadata } from '@/types';
import Preview from './Preview';
import UploadDialog from '@/components/UploadDialog';
import * as XLSX from 'xlsx';
import { STANDARD_MODULES } from '@/lib/constants';

interface HomeProps {
    onGenerate: () => void;
    systems: SystemMetadata[];
    loading: boolean;
}

// Helper to auto-detect module from filename
const detectModule = (filename: string): string => {
    // Sort modules by length (descending) to match longest specific modules first
    // e.g., match "验房问题库" before "验房" (if exists) or prevent partial mismatch
    const sortedModules = [...STANDARD_MODULES].sort((a, b) => b.length - a.length);
    
    for (const mod of sortedModules) {
        if (filename.includes(mod)) {
            return mod;
        }
        
        // Handle special cases where filename might have "移动验房-问题库" which matches "验房问题库" loosely?
        // Or if the standard module is "验房问题库" but filename has "问题库" and "验房" separated
        // Let's stick to strict inclusion first, but maybe the user's filename is "移动验房-问题库体系"
        // and standard module is "验房问题库". 
        // "移动验房-问题库体系".includes("验房问题库") is FALSE.
        
        // Split module into keywords if it's long?
        if (mod === "验房问题库") {
            if (filename.includes("验房") && filename.includes("问题库")) {
                return mod;
            }
        }
    }
    return '';
};

// Helper to auto-detect industry from client/filename (Mocking "Online Search" with Heuristic Keywords)
const detectIndustry = (text: string): string[] => {
    const industries = [];
    if (text.includes('住宅') || text.includes('置业') || text.includes('地产') || text.includes('公寓') || text.includes('别墅')) {
        industries.push('住宅');
    }
    if (text.includes('商业') || text.includes('广场') || text.includes('中心') || text.includes('商场') || text.includes('MALL')) {
        industries.push('商业');
    }
    if (text.includes('办公') || text.includes('写字楼') || text.includes('总部')) {
        industries.push('办公');
    }
    if (text.includes('工业') || text.includes('厂房') || text.includes('园区') || text.includes('物流') || text.includes('仓储')) {
        industries.push('工业');
    }
    if (text.includes('市政') || text.includes('道路') || text.includes('桥梁') || text.includes('管廊')) {
        industries.push('市政');
    }
    if (text.includes('轨道') || text.includes('地铁') || text.includes('铁路') || text.includes('高铁')) {
        industries.push('轨道交通');
    }
    return industries;
};

// Helper to extract client name from filename (Simple regex)
const extractClient = (filename: string): string => {
    // Try to match pattern like "Client-PROD..." or just take first part before "-"
    const match = filename.match(/^([^-]+)-/);
    return match ? match[1] : '用户上传';
};

export default function Home({ onGenerate, systems, loading }: HomeProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // New state for upload dialog
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<any[]>([]);

    const clients = Array.from(new Set(systems.map(s => s.client).filter(Boolean)));
    const industries = Array.from(new Set(systems.flatMap(s => s.applicableIndustries || []).filter(Boolean)));
    const modules = Array.from(new Set(systems.map(s => s.module).filter(Boolean)));

    const filteredSystems = systems.filter(sys => {
        const matchesSearch = sys.systemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sys.client.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClient = selectedClient ? sys.client === selectedClient : true;
        const matchesIndustry = selectedIndustry ? sys.applicableIndustries?.includes(selectedIndustry) : true;
        const matchesModule = selectedModule ? sys.module === selectedModule : true;
        return matchesSearch && matchesClient && matchesIndustry && matchesModule;
    });

    // Handle file upload
    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        setUploadSuccess(null);

        try {
            const processedFiles = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = Math.round((i / files.length) * 100);
                setUploadProgress(progress);

                // Parse Excel file
                const workbook = XLSX.read(await file.arrayBuffer());
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const content = XLSX.utils.sheet_to_json(worksheet);

                // Auto-detect metadata
                const detectedModule = detectModule(file.name);
                const detectedClient = extractClient(file.name);
                const detectedIndustries = detectIndustry(file.name);

                // Generate system metadata
                const systemId = `USER_${Date.now()}_${i}`;
                const systemName = file.name.replace(/\.xls[x]?$/, '');
                const client = detectedClient; // Use detected client
                const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

                // Extract headers
                const originalHeader = content.length > 0 ? Object.keys(content[0] as object) : [];
                const keys = originalHeader.map((header, index) => {
                    return header.toLowerCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^a-zA-Z0-9_]/g, '')
                        .replace(/^_+|_+$/g, '') || `col_${index}`;
                });

                // Process content
                const processedContent = content.map((row: any) => {
                    const newRow: Record<string, any> = {};
                    originalHeader.forEach((header, index) => {
                        newRow[keys[index]] = row[header];
                    });
                    return newRow;
                });

                // Create system object
                const system = {
                    id: systemId,
                    client,
                    context: '用户上传',
                    systemName,
                    date,
                    filename: file.name,
                    itemCount: content.length,
                    tags: [client, systemName],
                    originalHeader,
                    keys,
                    content: processedContent,
                    // Pre-fill fields for dialog
                    module: detectedModule,
                    applicableIndustries: detectedIndustries,
                    applicableProjectTypes: [] 
                };

                processedFiles.push(system);
            }

            // Instead of saving directly, open the dialog
            setPendingFiles(processedFiles);
            setUploading(false);
            setUploadProgress(100);
            setIsUploadDialogOpen(true);

        } catch (error) {
            console.error('File upload error:', error);
            setUploadError('文件处理失败，请检查文件格式是否正确');
            setUploading(false);
            
            // Reset after 3 seconds
            setTimeout(() => {
                setUploadError(null);
            }, 3000);
        }
    };

    const handleSaveUploadedFiles = (files: any[]) => {
        // Store in local storage
        const existingSystems = JSON.parse(localStorage.getItem('userSystems') || '[]');
        const updatedSystems = [...existingSystems, ...files];
        localStorage.setItem('userSystems', JSON.stringify(updatedSystems));

        setIsUploadDialogOpen(false);
        setUploadSuccess(`成功上传并处理了 ${files.length} 个文件`);

        // Reload page to reflect changes (simple way)
        window.location.reload();
    };

    // Handle delete system
    const handleDeleteSystem = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (confirm('确定要删除这个体系文件吗？此操作不可恢复。')) {
            const existingSystems = JSON.parse(localStorage.getItem('userSystems') || '[]');
            const updatedSystems = existingSystems.filter((s: any) => s.id !== id);
            localStorage.setItem('userSystems', JSON.stringify(updatedSystems));
            window.location.reload();
        }
    };

    // Handle drag events
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 pb-24">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <FolderKanban className="w-8 md:w-10 h-8 md:h-10 text-primary" />
                            体系数据库
                        </h1>
                        <p className="text-muted-foreground mt-2 text-base md:text-lg">
                            浏览、搜索并按需生成您的项目体系文件。
                        </p>
                    </div>
                </div>

                {/* File Upload Section */}
                <div className="bg-card p-6 rounded-xl border shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-primary" />
                        上传Excel文件
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        上传您的Excel标准资产文件，系统将自动进行数据清洗和结构转换。
                    </p>
                    <div 
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${isDragging ? 'border-primary bg-primary/5' : 'border-muted'}`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept=".xls,.xlsx"
                            multiple
                            className="hidden"
                            id="file-upload"
                            onChange={(e) => handleFileUpload(e.target.files)}
                        />
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center justify-center gap-4"
                        >
                            <motion.div 
                                className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary"
                                animate={{ scale: isDragging ? 1.1 : 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <FileSpreadsheet className="w-8 h-8" />
                            </motion.div>
                            <div>
                                <p className="font-medium">{isDragging ? '释放文件以上传' : '点击或拖拽文件到此处上传'}</p>
                                <p className="text-sm text-muted-foreground">支持 .xls 和 .xlsx 格式</p>
                            </div>
                        </label>
                    </div>
                    {uploading && (
                        <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-sm">正在处理文件... {uploadProgress}%</p>
                            </div>
                        </div>
                    )}
                    {uploadError && (
                        <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                            <p className="text-sm text-destructive">{uploadError}</p>
                        </div>
                    )}
                    {uploadSuccess && (
                        <div className="mt-4 p-4 bg-success/5 border border-success/20 rounded-lg">
                            <p className="text-sm text-success">{uploadSuccess}</p>
                        </div>
                    )}
                </div>

                {/* Filters */}
                {/* Removed redundant filter section */}
                
                {/* Content Grid */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 shrink-0">
                            <FolderKanban className="w-5 h-5 text-primary" />
                            体系文件列表
                        </h2>
                        
                        {/* Quick Filters */}
                        <div className="flex flex-wrap gap-2 items-center flex-1 justify-end">
                            <div className="relative w-full max-w-xs mr-2">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="搜索体系名称、客户..."
                                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedIndustry || ''}
                                onChange={(e) => setSelectedIndustry(e.target.value || null)}
                            >
                                <option value="">所有行业</option>
                                {industries.map(ind => (
                                    <option key={ind} value={ind}>{ind}</option>
                                ))}
                            </select>

                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedModule || ''}
                                onChange={(e) => setSelectedModule(e.target.value || null)}
                            >
                                <option value="">所有模块</option>
                                {modules.map(mod => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                            </select>

                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedClient || ''}
                                onChange={(e) => setSelectedClient(e.target.value || null)}
                            >
                                <option value="">所有客户</option>
                                {clients.map(client => (
                                    <option key={client} value={client}>{client}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                            <p className="text-muted-foreground">加载体系数据库中...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredSystems.map((sys, index) => (
                                <motion.div
                                    key={sys.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                        duration: 0.5,
                                        delay: index * 0.05
                                    }}
                                >
                                    <Card className="group hover:border-primary/50 transition-all flex flex-col h-full relative">
                                        {sys.id !== 'MASTER_STD' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleDeleteSystem(sys.id, e)}
                                                title="删除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    <CardHeader
                                        className="cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors pb-3"
                                        onClick={() => setPreviewId(sys.id)}
                                    >
                                        <div className="flex flex-wrap gap-2 mb-3 pr-8">
                                            <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs font-semibold">
                                                {sys.client}
                                            </div>
                                            {sys.module && (
                                                <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                                                    <Tag className="w-3 h-3" />
                                                    {sys.module}
                                                </div>
                                            )}
                                            {sys.applicableIndustries?.map(ind => (
                                                <div key={ind} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
                                                    {ind}
                                                </div>
                                            ))}
                                        </div>
                                        <CardTitle className="line-clamp-2 leading-tight text-base">
                                            {sys.systemName}
                                        </CardTitle>
                                        <CardDescription className="mt-2 flex items-center gap-2">
                                            <FileSpreadsheet className="w-3 h-3" />
                                            {sys.itemCount} 个标准项 | {sys.date}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="mt-auto border-t p-0">
                                        {sys.rawPath ? (
                                            <a
                                                href={sys.rawPath}
                                                download
                                                className="flex items-center justify-between p-4 text-xs text-muted-foreground hover:bg-muted/50 transition-colors w-full break-all"
                                                title="点击下载原始文件"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <span className="truncate flex-1">{sys.filename}</span>
                                                <Download className="w-3 h-3 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ) : (
                                            <div className="p-4 text-xs text-muted-foreground break-all">
                                                {sys.filename}
                                            </div>
                                        )}
                                    </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        {filteredSystems.length === 0 && (
                            <div className="col-span-full text-center py-20">
                                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">未找到匹配的体系文件</h3>
                                <p className="text-muted-foreground">请尝试调整搜索条件或客户筛选</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            </div>
            
            <Preview
                systemId={previewId}
                open={!!previewId}
                onClose={() => setPreviewId(null)}
            />

            <UploadDialog
                open={isUploadDialogOpen}
                files={pendingFiles}
                onClose={() => setIsUploadDialogOpen(false)}
                onSave={handleSaveUploadedFiles}
            />

            {/* Floating Action Button */}
            <div className="fixed bottom-8 right-8 z-50">
                <Button
                    size="lg"
                    className="h-16 px-8 rounded-full shadow-lg text-lg gap-2 animate-in fade-in slide-in-from-bottom-4"
                    onClick={onGenerate}
                >
                    <Sparkles className="w-5 h-5" />
                    生成体系文件
                </Button>
            </div>
        </div>
    );
}
