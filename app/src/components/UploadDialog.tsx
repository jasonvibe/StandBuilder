import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { STANDARD_MODULES, INDUSTRIES, PROJECT_TYPES } from '@/lib/constants';
import type { SystemMetadata } from '@/types';
import { FileSpreadsheet } from 'lucide-react';

interface UploadDialogProps {
    open: boolean;
    files: Partial<SystemMetadata>[]; // Files that have been parsed but not yet saved
    onClose: () => void;
    onSave: (files: any[]) => void;
}

export default function UploadDialog({ open, files, onClose, onSave }: UploadDialogProps) {
    const [fileData, setFileData] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Update state when props change
    useEffect(() => {
        if (open && files.length > 0) {
            setFileData(files.map(f => ({
                ...f,
                module: f.module || '',
                applicableIndustries: f.applicableIndustries || [],
                applicableProjectTypes: f.applicableProjectTypes || []
            })));
            setCurrentIndex(0);
        }
    }, [open, files]);

    const currentFile = fileData[currentIndex];

    const updateFile = (key: string, value: any) => {
        const newData = [...fileData];
        newData[currentIndex] = { ...newData[currentIndex], [key]: value };
        setFileData(newData);
    };

    const toggleArrayItem = (key: 'applicableIndustries' | 'applicableProjectTypes', item: string) => {
        const currentList = currentFile[key] || [];
        const newList = currentList.includes(item)
            ? currentList.filter((i: string) => i !== item)
            : [...currentList, item];
        updateFile(key, newList);
    };

    const handleSave = () => {
        // Validate
        const incomplete = fileData.filter(f => !f.module);
        if (incomplete.length > 0) {
            alert(`请为所有文件选择所属模块`);
            return;
        }
        onSave(fileData);
    };

    if (!currentFile) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>完善文件信息 ({currentIndex + 1}/{fileData.length})</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
                    <div className="flex gap-4 mb-6 bg-muted/30 p-4 rounded-lg items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{currentFile.filename}</h3>
                            <p className="text-sm text-muted-foreground">{currentFile.itemCount} 条数据</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Module Selection */}
                        <div className="space-y-2">
                            <label className="text-base font-medium">所属模块 <span className="text-red-500">*</span></label>
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={currentFile.module} 
                                onChange={(e) => updateFile('module', e.target.value)}
                            >
                                <option value="" disabled>请选择所属模块</option>
                                {STANDARD_MODULES.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* Industries */}
                        <div className="space-y-2">
                            <label className="text-base font-medium">适用行业 (可选，不选则为通用)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {INDUSTRIES.map(ind => (
                                    <div key={ind} className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50">
                                        <input 
                                            type="checkbox"
                                            id={`ind-${ind}`} 
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={currentFile.applicableIndustries?.includes(ind)}
                                            onChange={() => toggleArrayItem('applicableIndustries', ind)}
                                        />
                                        <label htmlFor={`ind-${ind}`} className="cursor-pointer flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{ind}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Project Types (Removed) */}
                        {/* <div className="space-y-2">
                            <label className="text-base font-medium">适用项目类型 (可选，不选则为通用)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PROJECT_TYPES.map(type => (
                                    <div key={type} className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50">
                                        <input 
                                            type="checkbox"
                                            id={`type-${type}`} 
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={currentFile.applicableProjectTypes?.includes(type)}
                                            onChange={() => toggleArrayItem('applicableProjectTypes', type)}
                                        />
                                        <label htmlFor={`type-${type}`} className="cursor-pointer flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{type}</label>
                                    </div>
                                ))}
                            </div>
                        </div> */}
                    </div>
                </div>

                <DialogFooter className="flex justify-between items-center border-t pt-4 mt-auto">
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                            disabled={currentIndex === 0}
                        >
                            上一个
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setCurrentIndex(Math.min(fileData.length - 1, currentIndex + 1))}
                            disabled={currentIndex === fileData.length - 1}
                        >
                            下一个
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>取消</Button>
                        <Button onClick={handleSave}>确认并保存</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
