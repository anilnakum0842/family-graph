import * as d3 from 'd3';

export interface FamilyNode extends d3.SimulationNodeDatum {
    id: string;
    type: 'person' | 'familyRoot';
    name: string;
    gender?: 'M' | 'F';
    birthYear?: number;
    deathYear?: number | null;
    city?: string;
    generation?: number;
    parentIds?: string[];
    // Dynamic properties for D3 and Logic
    childrenIds?: string[]; // Computed reverse relationship
    isExpanded?: boolean;   // For generation expansion
    isVisible?: boolean;    // For filtering
    isHighlighted?: boolean; // For ancestor/descendant selection
    highlightType?: 'ancestor' | 'descendant' | 'self' | null;
}

export interface FamilyLink extends d3.SimulationLinkDatum<FamilyNode> {
    id: string;
    source: string | FamilyNode;
    target: string | FamilyNode;
    relation: 'parent' | 'spouse';
}

export interface FilterState {
    genders: { [key: string]: boolean };
    cities: { [key: string]: boolean };
    aliveStatus: 'all' | 'alive' | 'deceased';
}

export interface FamilyData {
    nodes: FamilyNode[];
    links: FamilyLink[];
}