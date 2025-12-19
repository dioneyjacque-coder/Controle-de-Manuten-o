
import pptxgen from 'pptxgenjs';
import { MaintenanceRecord, Municipality } from '../types';

export const exportToPPTX = async (records: MaintenanceRecord[], municipalities: Municipality[]) => {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  // Master Slide Definition
  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { fill: 'F8FAFC' },
    objects: [
      { rect: { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: '0F172A' } } },
      { text: { text: 'EQUIPE HV - RELATÓRIO DE MANUTENÇÃO', options: { x: 0.4, y: 0.15, color: 'FFFFFF', fontSize: 14, bold: true } } }
    ]
  });

  // Cover Slide
  const cover = pptx.addSlide();
  cover.addText('Relatório Operacional de Manutenções', { x: 1, y: 2, fontSize: 36, bold: true, color: '0F172A' });
  cover.addText(`Amazonas - Bacias Hidrográficas • ${new Date().toLocaleDateString()}`, { x: 1, y: 3, fontSize: 18, color: 'EA580C' });
  cover.addText(`${records.length} Registros Consolidados`, { x: 1, y: 3.5, fontSize: 14, italic: true });

  // Records Slides
  for (const record of records) {
    const mun = municipalities.find(m => m.id === record.municipalityId);

    // Summary Slide for the Record
    const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide.addText(record.title.toString().toUpperCase(), { x: 0.5, y: 0.8, fontSize: 24, bold: true, color: 'EA580C' });
    
    slide.addText(`LOCAL: ${mun?.name} (${mun?.region})`, { x: 0.5, y: 1.4, fontSize: 12, bold: true });
    slide.addText(`TÉCNICO: ${record.technician}`, { x: 0.5, y: 1.7, fontSize: 12 });
    slide.addText(`DATA: ${record.date}`, { x: 0.5, y: 2.0, fontSize: 12 });

    slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.5, w: 9, h: 2, fill: { color: 'F1F5F9' }, line: { color: 'CBD5E1', width: 1 } });
    slide.addText('DESCRIÇÃO GERAL:', { x: 0.6, y: 2.7, fontSize: 10, bold: true, color: '64748B' });
    slide.addText(record.description || 'Nenhuma descrição macro informada.', { x: 0.6, y: 3.0, w: 8.8, fontSize: 11, color: '1E293B' });

    // Stage Slides
    for (const stage of record.stages) {
      if (stage.images.length === 0 && !stage.description) continue;

      const stageSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      stageSlide.addText(`ETAPA: ${stage.name}`, { x: 0.5, y: 0.8, fontSize: 20, bold: true, color: 'EA580C' });
      
      stageSlide.addText(stage.description || 'Descrição técnica da etapa pendente.', { 
        x: 0.5, y: 1.3, w: 4, h: 3.5, fontSize: 12, color: '1E293B', align: 'left', valign: 'top' 
      });

      // Add first 2 images to the slide
      stage.images.slice(0, 2).forEach((img, idx) => {
        stageSlide.addImage({
          data: img.data,
          x: 4.8 + (idx * 2.5),
          y: 1.3,
          w: 2.3,
          h: 3.0,
          sizing: { type: 'contain' }
        });
      });
    }
  }

  const fileName = `Relatorio_HV_${new Date().toISOString().split('T')[0]}.pptx`;
  await pptx.writeFile({ fileName });
};
