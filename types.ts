
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
  PROGRAMMED = 'Programada',
  EMERGENCY = 'Emergencial',
  OTHER = 'Outro'
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
  name: string; // ex: 'Antes', 'Durante', 'Depois', 'Limpeza TX'
  description: string; // Descrição técnica específica desta etapa
  images: MaintenanceImage[];
}

export interface MaintenanceRecord {
  id: string;
  municipalityId: string;
  title: ServiceType | string;
  nature: MaintenanceNature | string;
  description: string; // Resumo geral do serviço
  date: string;
  status: MaintenanceStatus;
  stages: MaintenanceStage[];
  technician: string;
  aiNotes?: string;
}

export interface AppState {
  records: MaintenanceRecord[];
  selectedRegion: Region | null;
  selectedMunicipality: string | null;
}
