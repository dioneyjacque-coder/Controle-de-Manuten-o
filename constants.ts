
import { Region, Municipality, ServiceType, MaintenanceNature, MaintenanceStatus, MaintenanceRecord } from './types';

export const AMAZONAS_MUNICIPALITIES: Municipality[] = [
  { id: 'm1', name: 'Tabatinga', region: Region.SOLIMOES, lat: -4.23, lng: -69.93 },
  { id: 'm2', name: 'Benjamin Constant', region: Region.SOLIMOES, lat: -4.38, lng: -70.03 },
  { id: 'm3', name: 'Coari', region: Region.SOLIMOES, lat: -4.08, lng: -63.14 },
  { id: 'm5', name: 'Tefé', region: Region.SOLIMOES, lat: -3.35, lng: -64.71 },
  { id: 'm6', name: 'Japurá', region: Region.JAPURA, lat: -1.82, lng: -66.93 },
  { id: 'm7', name: 'Maraã', region: Region.JAPURA, lat: -1.83, lng: -65.57 },
  { id: 'm8', name: 'Eirunepé', region: Region.JURUA, lat: -6.66, lng: -69.87 },
  { id: 'm9', name: 'Itamarati', region: Region.JURUA, lat: -6.73, lng: -69.21 },
  { id: 'm10', name: 'Carauari', region: Region.JURUA, lat: -4.88, lng: -66.89 },
];

export const SERVICE_TEMPLATES = {
  [ServiceType.TYPE_50A]: `- Manutenção no alimentador 01 e 02
- Serviços realizados: limpeza e reapertos
- Troca dos silicones dos isoladores
- SWG: limpeza e reaperto das conexões
- TX (Transformadores): limpeza e reaperto das conexões, verificação se há vazamentos`,
  [ServiceType.TYPE_50B]: `- Teste de proteções dos relés
- Megagem dos transformadores
- Megagem de cabos e barramentos`
};

export const INITIAL_RECORDS: MaintenanceRecord[] = [
  {
    id: 'rec1',
    municipalityId: 'm1',
    title: ServiceType.TYPE_50A,
    nature: MaintenanceNature.PROGRAMMED,
    description: 'Manutenção preventiva semestral realizada nos ativos de alta tensão em Tabatinga.',
    date: '2024-05-15',
    status: MaintenanceStatus.COMPLETED,
    stages: [
      {
        id: 'stg1',
        name: 'Inspeção Inicial',
        description: 'Verificação inicial do transformador TX-01 antes da limpeza e reaperto. Presença de fuligem nos isoladores.',
        beforeImage: { id: 'img-init-1', data: 'https://images.unsplash.com/photo-1621905252507-b35482cd34b4?q=80&w=400&auto=format&fit=crop' }
      },
      {
        id: 'stg2',
        name: 'Execução Técnica',
        description: 'Realizado reaperto de conexões e limpeza química dos barramentos.',
        duringImage: { id: 'img-exec-1', data: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop' }
      }
    ],
    technician: 'João Silva'
  }
];
