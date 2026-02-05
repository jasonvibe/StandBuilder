export interface SystemMetadata {
    id: string;
    client: string;
    context: string;
    systemName: string; // User friendly name or file name
    module: string;     // Standard module category
    applicableIndustries: string[]; // List of applicable industries
    applicableProjectTypes: string[]; // List of applicable project types
    date: string;
    filename: string;
    rawPath?: string;
    itemCount: number;
    tags: string[];
    // Extended properties for generated systems
    sourceInfo?: string; // e.g. "From: SystemA (Residential), SystemB (Commercial)"
    matchLogic?: string; // e.g. "Matched Industry: Residential"
    specialRequirements?: string; // User's special prompt
}

export interface SystemDetail extends SystemMetadata {
    originalHeader: string[];
    keys: string[];
    content: Record<string, any>[];
}
