
import { MaintenanceRecord, Municipality } from '../types';

export const exportToExcel = (records: MaintenanceRecord[], municipalities: Municipality[]) => {
  // Creating a CSV that Excel can open
  const headers = ['ID', 'Município', 'Região', 'Título', 'Status', 'Data', 'Técnico', 'Resumo Geral', 'Detalhes das Evidências', 'Notas IA'];
  const rows = records.map(r => {
    const mun = municipalities.find(m => m.id === r.municipalityId);
    
    // Concatenate individual image descriptions for the CSV
    const imageDescriptions = r.images.map((img, idx) => `[Foto ${idx+1}]: ${img.description}`).join(' | ');

    return [
      r.id,
      mun?.name || 'N/A',
      mun?.region || 'N/A',
      `"${r.title.replace(/"/g, '""')}"`,
      r.status,
      r.date,
      r.technician,
      `"${r.description.replace(/"/g, '""')}"`,
      `"${imageDescriptions.replace(/"/g, '""')}"`,
      `"${(r.aiNotes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_tecnico_hv_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
