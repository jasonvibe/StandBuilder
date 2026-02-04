import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, FolderKanban, FileSpreadsheet, Sparkles, Download } from 'lucide-react';
import type { SystemMetadata } from '@/types';
import Preview from './Preview';

interface HomeProps {
    onGenerate: () => void;
    systems: SystemMetadata[];
    loading: boolean;
}

export default function Home({ onGenerate, systems, loading }: HomeProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<string | null>(null);
    const [previewId, setPreviewId] = useState<string | null>(null);

    const clients = Array.from(new Set(systems.map(s => s.client)));

    const filteredSystems = systems.filter(sys => {
        const matchesSearch = sys.systemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sys.client.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClient = selectedClient ? sys.client === selectedClient : true;
        return matchesSearch && matchesClient;
    });

    return (
        <div className="min-h-screen bg-background p-8 pb-24">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <FolderKanban className="w-10 h-10 text-primary" />
                            体系数据库
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            浏览、搜索并按需生成您的项目体系文件。
                        </p>
                    </div>
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
                            <Button
                                key={client}
                                variant={selectedClient === client ? "default" : "outline"}
                                onClick={() => setSelectedClient(client)}
                            >
                                {client}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Content Grid */}
                {loading ? (
                    <div className="text-center py-20 text-muted-foreground">加载中...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSystems.map(sys => (
                            <Card key={sys.id} className="group hover:border-primary/50 transition-all flex flex-col">
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
                        ))}
                        {filteredSystems.length === 0 && (
                            <div className="col-span-full text-center py-20 text-muted-foreground">
                                未找到匹配的体系文件
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
