// lib/conveyor/storage.ts
// LocalStorage-based project storage for ConveyorCalc

export interface SavedProject {
    id: string;
    name: string;
    client: string;
    createdAt: string;
    updatedAt: string;
    data: ProjectData;
}

export interface ProjectData {
    projectInfo: {
        projectName: string;
        clientName: string;
        projectNumber: string;
        date: string;
        engineer: string;
    };
    targets: {
        driveConfig: string;
        conveyorDirection: string;
        designCapacity: number;
        beltSpeed: number;
        wrapAngle: number;
    };
    material: {
        name: string;
        condition: string;
        lumpSize: number;
        density: number;
        surchargeAngle: number;
        reposeAngle: number;
    };
    geometry: {
        horizontalLength: number;
        liftHeight: number;
        slopeAngle: number;
        carrierPitch: number;
        returnPitch: number;
        troughAngle: number;
    };
    belt: {
        width: number;
        sagging: number;
        massBelt: number;
        massIdlers: number;
        frictionCoeff: number;
        driveEfficiency: number;
    };
    accessories: {
        hopperHeight: number;
        hopperWidth: number;
        hopperLength: number;
        skirtLength: number;
        skirtWidth: number;
        scraperCount: number;
        ploughCount: number;
        tripperCount: number;
    };
}

const STORAGE_KEY = 'conveyorcalc_projects';

export function getAllProjects(): SavedProject[] {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function getProjectById(id: string): SavedProject | null {
    const projects = getAllProjects();
    return projects.find(p => p.id === id) || null;
}

export function saveProject(project: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): SavedProject {
    const projects = getAllProjects();
    const newProject: SavedProject = {
        ...project,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    projects.push(newProject);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return newProject;
}

export function updateProject(id: string, updates: Partial<SavedProject>): SavedProject | null {
    const projects = getAllProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return projects[index];
}

export function deleteProject(id: string): boolean {
    const projects = getAllProjects();
    const filtered = projects.filter(p => p.id !== id);
    if (filtered.length === projects.length) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
}

export function clearAllProjects(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

function generateId(): string {
    return 'proj_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
