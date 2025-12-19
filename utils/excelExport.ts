
import * as XLSX from 'xlsx';
import { MaintenanceRecord, Municipality } from '../types';

export const exportToExcel = (records: MaintenanceRecord[], municipalities: Municipality[]) => {
  const wb = XLSX.utils.book_new();

  // Tab 1: Summary
  const summaryData = records.map(r => {
    const mun = municipalities.find(m => m.id === r.municipalityId);
    return {
      'ID': r.id,
      'Data': r.date,
      'Município': mun?.name || 'N/A',
      'Região': mun?.region || 'N/A',
      'Técnico': r.technician,
      'Serviço': r.title,
      'Natureza': r.nature,
      'Status': r.status,
      'Resumo Geral': r.description
    };
  });
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo Manutenções");

  // Tab 2: Detailed Stages
  const detailedData: any[] = [];
  records.forEach(r => {
    const mun = municipalities.find(m => m.id === r.municipalityId);
    r.stages.forEach(stage => {
      detailedData.push({
        'ID Manutenção': r.id,
        'Data': r.date,
        'Local': mun?.name,
        'Etapa': stage.name,
        'Descrição da Etapa': stage.description,
        'Qtd Fotos': stage.images.length
      });
    });
  });
  const wsDetails = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(wb, wsDetails, "Detalhes por Etapa");

  // Generate and Download
  const fileName = `Relatorio_Tecnico_HV_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
