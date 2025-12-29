
export enum MaintenanceStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED'
}

export enum Region {
  SOLIMOES = 'Rio Solimões',
  JAPURA = 'Rio Japurá',
  JURUA = 'Rio Juruá'
}

export enum ServiceType {
  TYPE_50A = 'Serviço tipo 50A',
  TYPE_50B = 'Serviço tipo 50B',
  OTHER = 'Outro'
}

export enum MaintenanceNature {
  PREVENTIVE_PROGRAMMED = 'Manutenção Preventiva Programada',
  CORRECTIVE_PROGRAMMED = 'Manutenção Corretiva Programada',
  CORRECTIVE_EMERGENCY = 'Manutenção Corretiva Emergencial'
}

export interface Municipality {
  id: string;
  name: string;
  region: Region;
  lat: number;
  lng: number;
}

export interface MaintenanceImage {
  id: string;
  data: string; // Base64 string
}

export interface MaintenanceStage {
  id: string;
  name: string; 
  description: string; 
  beforeImage?: MaintenanceImage;
  duringImage?: MaintenanceImage;
  afterImage?: MaintenanceImage;
}

export interface MaintenanceRecord {
  id: string;
  municipalityId: string;
  title: ServiceType | string;
  nature: MaintenanceNature | string;
  description: string; 
  date: string;
  status: MaintenanceStatus;
  stages: MaintenanceStage[];
  technician: string;
  aiNotes?: string;
  isLegacy?: boolean;
  legacyFileName?: string;
}

export interface AppState {
  records: MaintenanceRecord[];
  selectedRegion: Region | null;
  selectedMunicipality: string | null;
}
