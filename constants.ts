import { Region, Municipality, ServiceType, MaintenanceNature, MaintenanceStatus, MaintenanceRecord } from './types';

export const AMAZONAS_MUNICIPALITIES: Municipality[] = [
  { id: 'm1', name: 'Tabatinga', region: Region.SOLIMOES, lat: -4.2333, lng: -69.9333 },
  { id: 'm2', name: 'Benjamin Constant', region: Region.SOLIMOES, lat: -4.3831, lng: -70.0311 },
  { id: 'm3', name: 'Coari', region: Region.SOLIMOES, lat: -4.0847, lng: -63.1417 },
  { id: 'm5', name: 'Tefé', region: Region.SOLIMOES, lat: -3.3547, lng: -64.7114 },
  { id: 'm6', name: 'Japurá', region: Region.JAPURA, lat: -1.8247, lng: -66.9311 },
  { id: 'm7', name: 'Maraã', region: Region.JAPURA, lat: -1.8336, lng: -65.5786 },
  { id: 'm8', name: 'Eirunepé', region: Region.JURUA, lat: -6.6603, lng: -69.8736 },
  { id: 'm9', name: 'Itamarati', region: Region.JURUA, lat: -6.7328, lng: -69.2158 },
  { id: 'm10', name: 'Carauari', region: Region.JURUA, lat: -4.8828, lng: -66.8958 },
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
    description: 'Manutenção preventiva semestral realizada nos ativos de alta tensão.',
    date: '2024-05-15',
    status: MaintenanceStatus.COMPLETED,
    stages: [
      {
        id: 'stg1',
        name: 'Antes (Estado Inicial)',
        description: 'Verificação inicial do transformador TX-01 antes da limpeza e reaperto. Presença de fuligem nos isoladores.',
        // Fixed: Use beforeImage property instead of the non-existent images array to match MaintenanceStage interface
        beforeImage: { id: 'img-init-1', data: 'https://picsum.photos/400/300?random=1' }
      },
      {
        id: 'stg2',
        name: 'Durante (Execução)',
        description: 'Realizado reaperto de conexões e limpeza química dos barramentos.',
        // Fixed: Use duringImage property instead of the non-existent images array to match MaintenanceStage interface
        duringImage: { id: 'img-exec-1', data: 'https://picsum.photos/400/300?random=2' }
      }
    ],
    technician: 'João Silva'
  }
];