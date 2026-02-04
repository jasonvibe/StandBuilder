export interface SystemMetadata {
    id: string;
    client: string;
    context: string;
    systemName: string;
    date: string;
    filename: string;
    rawPath?: string;
    itemCount: number;
    tags: string[];
}

export interface SystemDetail extends SystemMetadata {
    originalHeader: string[];
    keys: string[];
    content: Record<string, any>[];
}
