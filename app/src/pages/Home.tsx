import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, FolderKanban, FileSpreadsheet, Sparkles, Download } from 'lucide-react';
import type { SystemMetadata } from '@/types';
import Preview from './Preview';
import * as XLSX from 'xlsx';

interface HomeProps {
    onGenerate: () => void;
    systems: SystemMetadata[];
    loading: boolean;
}

export default function Home({ onGenerate, systems, loading }: HomeProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const clients = Array.from(new Set(systems.map(s => s.client)));

    const filteredSystems = systems.filter(sys => {
        const matchesSearch = sys.systemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sys.client.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClient = selectedClient ? sys.client === selectedClient : true;
        return matchesSearch && matchesClient;
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

                // Generate system metadata
                const systemId = `USER_${Date.now()}_${i}`;
                const systemName = file.name.replace(/\.xls[x]?$/, '');
                const client = '用户上传';
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
                    content: processedContent
                };

                processedFiles.push(system);
            }

            // Store in local storage
            const existingSystems = JSON.parse(localStorage.getItem('userSystems') || '[]');
            const updatedSystems = [...existingSystems, ...processedFiles];
            localStorage.setItem('userSystems', JSON.stringify(updatedSystems));

            setUploadProgress(100);
            setUploadSuccess(`成功上传并处理了 ${files.length} 个文件`);

            // Reset after 3 seconds
            setTimeout(() => {
                setUploadSuccess(null);
                setUploading(false);
                setUploadProgress(0);
            }, 3000);

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
                <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="搜索体系名称、客户..."
                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <Button
                            variant={selectedClient === null ? "default" : "outline"}
                            onClick={() => setSelectedClient(null)}
                        >
                            全部
                        </Button>
                        {clients.map(client => (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    key={client}
                                    variant={selectedClient === client ? "default" : "outline"}
                                    onClick={() => setSelectedClient(client)}
                                    className="whitespace-nowrap transition-all duration-200"
                                >
                                    {client}
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
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
                                <Card className="group hover:border-primary/50 transition-all flex flex-col h-full">
                                <CardHeader
                                    className="cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors"
                                    onClick={() => setPreviewId(sys.id)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs font-semibold">
                                            {sys.client}
                                        </div>
                                        <FileSpreadsheet className="text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <CardTitle className="mt-4 line-clamp-2 leading-tight">
                                        {sys.systemName}
                                    </CardTitle>
                                    <CardDescription>
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

            <Preview
                systemId={previewId}
                open={!!previewId}
                onClose={() => setPreviewId(null)}
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
