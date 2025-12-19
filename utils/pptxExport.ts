
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
      { text: { text: 'EQUIPE HV - RELATÓRIO TÉCNICO', options: { x: 0.4, y: 0.15, color: 'FFFFFF', fontSize: 14, bold: true } } }
    ]
  });

  // Cover Slide
  const cover = pptx.addSlide();
  cover.addText('Relatório Operacional de Manutenções', { x: 1, y: 2, fontSize: 36, bold: true, color: '0F172A' });
  cover.addText(`Amazonas • Bacias Hidrográficas • ${new Date().toLocaleDateString()}`, { x: 1, y: 3, fontSize: 18, color: 'EA580C' });
  cover.addText(`${records.length} Atividade(s) Registrada(s)`, { x: 1, y: 3.5, fontSize: 14, italic: true });

  for (const record of records) {
    const mun = municipalities.find(m => m.id === record.municipalityId);

    // Maintenance Overview Slide
    const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    slide.addText(record.title.toString().toUpperCase(), { x: 0.5, y: 0.8, fontSize: 24, bold: true, color: 'EA580C' });
    
    slide.addText(`LOCALIDADE: ${mun?.name} (${mun?.region})`, { x: 0.5, y: 1.4, fontSize: 12, bold: true });
    slide.addText(`RESPONSÁVEL: ${record.technician}`, { x: 0.5, y: 1.7, fontSize: 12 });
    slide.addText(`DATA DA EXECUÇÃO: ${record.date}`, { x: 0.5, y: 2.0, fontSize: 12 });

    slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.5, w: 9, h: 2, fill: { color: 'F1F5F9' }, line: { color: 'CBD5E1', width: 1 } });
    slide.addText('RESUMO EXECUTIVO:', { x: 0.6, y: 2.7, fontSize: 10, bold: true, color: '64748B' });
    slide.addText(record.description || 'Nenhuma descrição geral informada.', { x: 0.6, y: 3.0, w: 8.8, fontSize: 11, color: '1E293B' });

    // Individual Stage Slides (One per stage)
    for (const stage of record.stages) {
      const stageSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      stageSlide.addText(`ETAPA: ${stage.name}`, { x: 0.5, y: 0.8, fontSize: 20, bold: true, color: 'EA580C' });
      
      // Stage description text area (top middle)
      stageSlide.addText(stage.description || 'Procedimento técnico realizado conforme normas vigentes.', { 
        x: 0.5, y: 1.3, w: 9, h: 1.2, fontSize: 11, color: '1E293B', align: 'left', valign: 'top' 
      });

      // Images Layout: 3 side-by-side
      const imgWidth = 3.0;
      const imgHeight = 2.2;
      const startY = 2.7;
      const gap = 0.2;

      const slots = [
        { label: 'ANTES', data: stage.beforeImage?.data, x: 0.5 },
        { label: 'DURANTE', data: stage.duringImage?.data, x: 0.5 + imgWidth + gap },
        { label: 'DEPOIS', data: stage.afterImage?.data, x: 0.5 + (imgWidth + gap) * 2 }
      ];

      slots.forEach(slot => {
        // Label above image
        stageSlide.addText(slot.label, { x: slot.x, y: startY - 0.3, w: imgWidth, fontSize: 12, bold: true, color: '64748B', align: 'center' });
        
        if (slot.data) {
          stageSlide.addImage({
            data: slot.data,
            x: slot.x,
            y: startY,
            w: imgWidth,
            h: imgHeight,
            sizing: { type: 'contain' }
          });
        } else {
          stageSlide.addShape(pptx.ShapeType.rect, { x: slot.x, y: startY, w: imgWidth, h: imgHeight, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1, dashType: 'dash' } });
          stageSlide.addText('SEM EVIDÊNCIA', { x: slot.x, y: startY + (imgHeight/2) - 0.2, w: imgWidth, fontSize: 10, color: 'CBD5E1', align: 'center' });
        }
      });
    }
  }

  const fileName = `Relatorio_Tecnico_HV_${new Date().toISOString().split('T')[0]}.pptx`;
  await pptx.writeFile({ fileName });
};
