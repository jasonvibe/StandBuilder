import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, Bot } from 'lucide-react';
import type { SystemMetadata } from '@/types';
import { cn } from '@/lib/utils';

interface GenerateConfigProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (config: GenerationConfig) => void;
    systems: SystemMetadata[];
}

export interface GenerationConfig {
    industries: string[];
    projectTypes: string[];
    modules: string[];
    useAI: boolean;
}

const INDUSTRIES = ["住宅", "商业", "办公", "工业", "市政", "轨道交通"];
const PROJECT_TYPES = ["新建工程", "改扩建工程", "精装修", "园林景观"];

export default function GenerateConfig({ open, onClose, onConfirm, systems }: GenerateConfigProps) {
    const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [useAI, setUseAI] = useState(false);

    // Extract unique system names (modules)
    const uniqueModules = useMemo(() => {
        const names = new Set(systems.map(s => s.systemName));
        return Array.from(names).sort();
    }, [systems]);

    if (!open) return null;

    const toggleSelection = (list: string[], item: string, setList: (l: string[]) => void) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    };

    const handleConfirm = () => {
        onConfirm({
            industries: selectedIndustries,
            projectTypes: selectedTypes,
            modules: selectedModules,
            useAI
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-2xl bg-background border-l shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">生成体系文件</h2>
                        <p className="text-muted-foreground">配置生成条件，定制您的项目体系。</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10">

                    {/* Section 1: Industry */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4">1. 适用行业 (多选)</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {INDUSTRIES.map(item => (
                                <div
                                    key={item}
                                    className={cn(
                                        "cursor-pointer border rounded-lg p-4 flex items-center justify-between transition-all hover:border-primary",
                                        selectedIndustries.includes(item) ? "bg-primary/5 border-primary ring-1 ring-primary" : "bg-card"
                                    )}
                                    onClick={() => toggleSelection(selectedIndustries, item, setSelectedIndustries)}
                                >
                                    <span className="font-medium">{item}</span>
                                    {selectedIndustries.includes(item) && <Check className="w-4 h-4 text-primary" />}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Section 2: Project Type */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4">2. 项目类型 (多选)</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {PROJECT_TYPES.map(item => (
                                <div
                                    key={item}
                                    className={cn(
                                        "cursor-pointer border rounded-lg p-4 flex items-center justify-between transition-all hover:border-primary",
                                        selectedTypes.includes(item) ? "bg-primary/5 border-primary ring-1 ring-primary" : "bg-card"
                                    )}
                                    onClick={() => toggleSelection(selectedTypes, item, setSelectedTypes)}
                                >
                                    <span className="font-medium">{item}</span>
                                    {selectedTypes.includes(item) && <Check className="w-4 h-4 text-primary" />}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Section 3: Modules */}
                    <section>
                        <h3 className="text-lg font-semibold mb-4">3. 包含模块 (按需勾选)</h3>
                        <div className="border rounded-xl bg-card overflow-hidden">
                            <div className="p-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground flex justify-between px-4">
                                <span>可用模块 ({uniqueModules.length})</span>
                                <span
                                    className="cursor-pointer hover:text-primary"
                                    onClick={() => setSelectedModules(uniqueModules)}
                                >
                                    全选
                                </span>
                            </div>
                            <div className="divide-y max-h-[300px] overflow-y-auto">
                                {uniqueModules.map(mod => (
                                    <div
                                        key={mod}
                                        className="flex items-center space-x-3 p-4 hover:bg-muted/50 cursor-pointer"
                                        onClick={() => toggleSelection(selectedModules, mod, setSelectedModules)}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                            selectedModules.includes(mod) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                                        )}>
                                            {selectedModules.includes(mod) && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <span>{mod}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Section 4: AI */}
                    <section>
                        <div
                            className={cn(
                                "border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-colors",
                                useAI ? "border-purple-500 bg-purple-50/10" : "hover:border-primary/50"
                            )}
                            onClick={() => setUseAI(!useAI)}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center",
                                useAI ? "bg-purple-500 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                <Bot className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="font-semibold flex items-center gap-2">
                                    启用 AI 智能推荐
                                    {useAI && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">已开启</span>}
                                </div>
                                <p className="text-sm text-muted-foreground">根据您的行业与项目类型，智能补充潜在遗漏的体系标准。</p>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="p-6 border-t flex items-center justify-between bg-muted/10">
                    <div className="text-sm text-muted-foreground">
                        已选 <span className="text-primary font-bold">{selectedModules.length}</span> 个模块
                    </div>
                    <Button
                        size="lg"
                        onClick={handleConfirm}
                        disabled={selectedModules.length === 0}
                    >
                        生成体系文件
                    </Button>
                </div>
            </div>
        </div>
    );
}
