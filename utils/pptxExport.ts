
import pptxgen from 'pptxgenjs';
import { MaintenanceRecord, Municipality } from '../types';

export const exportToPPTX = async (records: MaintenanceRecord[], municipalities: Municipality[]) => {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  // Master Slide Definition - Apenas elementos visuais de fundo
  pptx.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { fill: 'FFFFFF' },
    objects: [
      // Barra Superior em #E6EAF6 (Fundo do Cabeçalho)
      { rect: { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: 'E6EAF6' } } },
      
      // Barra de rodapé decorativa sutil
      { rect: { x: 0, y: 5.3, w: '100%', h: 0.3, fill: { color: 'E6EAF6' } } },
      // Linha laranja fina no rodapé (Marca Aggreko)
      { rect: { x: 0, y: 5.6, w: '100%', h: 0.02, fill: { color: 'FF6600' } } }
    ]
  });

  // Função para adicionar o cabeçalho exato solicitado em cada slide
  const addExactHeader = (slide: any, title: string) => {
    // Título do Serviço (Lado Esquerdo)
    const displayTitle = title.toUpperCase();
    slide.addText(displayTitle, { 
      x: 0.5, y: 0.22, w: 6.5,
      color: '1E293B', 
      fontSize: 16, 
      bold: true, 
      fontFace: 'Arial'
    });
    
    // Linha Laranja Sublinhando o Título
    slide.addShape(pptx.ShapeType.rect, { 
      x: 0.5, y: 0.55, w: 5.5, h: 0.03, 
      fill: { color: 'FF6600' } 
    });
    
    // LOGOTIPO AGGREKO (Lado Direito)
    slide.addText('aggreko', { 
      x: 7.8, y: 0.15, w: 2.0, h: 0.4,
      color: 'FF6600', 
      fontSize: 24, 
      bold: false, 
      fontFace: 'Arial Black',
      align: 'right'
    });
  };

  for (const record of records) {
    const mun = municipalities.find(m => m.id === record.municipalityId);
    
    // --- SLIDE 1: CAPA ---
    const cover = pptx.addSlide();
    cover.background = { color: '050505' }; 
    
    cover.addText('aggreko', { 
      x: 0.5, y: 0.4, w: 2, 
      fontSize: 28, bold: false, color: 'FFFFFF', fontFace: 'Arial Black' 
    });

    const baseName = `Base ${mun?.name || 'Operacional'}`;
    cover.addText(baseName.toUpperCase(), { 
      x: 0, y: 1.8, w: '100%', 
      fontSize: 40, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial'
    });
    
    cover.addShape(pptx.ShapeType.rect, { 
      x: 3.5, y: 2.4, w: 3.0, h: 0.05, fill: { color: 'FF6600' } 
    });

    cover.addText(record.title.toString().toUpperCase(), { 
      x: 1.5, y: 4.2, w: 7, 
      fontSize: 28, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Arial'
    });
    
    cover.addShape(pptx.ShapeType.rect, { x: 3.0, y: 4.8, w: 4.0, h: 0.04, fill: { color: 'FF6600' } });
    cover.addShape(pptx.ShapeType.rect, { x: 3.5, y: 5.6, w: 3.0, h: 0.04, fill: { color: 'FF6600' } });

    // --- COMPOSIÇÃO LOGOTIPO HSE / SAFETY FOR LIFE (CAPA) ---
    
    // 1. FUNDO LARANJA ATRÁS DO H-S-E
    cover.addShape(pptx.ShapeType.rect, { 
      x: 4.25, y: 4.45, w: 1.25, h: 0.45, 
      fill: { color: 'FF6600' } 
    });

    // Quadrados Brancos H-S-E sobre o fundo laranja
    const hseX = [4.3, 4.7, 5.1];
    const hseLetters = ['H', 'S', 'E'];
    hseLetters.forEach((letter, i) => {
      cover.addShape(pptx.ShapeType.rect, { x: hseX[i], y: 4.5, w: 0.35, h: 0.35, fill: { color: 'FFFFFF' } });
      cover.addText(letter, { x: hseX[i], y: 4.5, w: 0.35, h: 0.35, color: '000000', fontSize: 16, bold: true, align: 'center', valign: 'middle', fontFace: 'Arial' });
    });

    // 2. FUNDO BRANCO ATRÁS DO SAFETY FOR LIFE (Moldura)
    cover.addShape(pptx.ShapeType.rect, { 
      x: 3.75, y: 4.85, w: 2.3, h: 0.45, 
      fill: { color: 'FFFFFF' } 
    });

    // Bloco Safety (Laranja)
    cover.addShape(pptx.ShapeType.rect, { x: 3.8, y: 4.9, w: 1.1, h: 0.35, fill: { color: 'FF6600' } });
    cover.addText('Safety', { x: 3.8, y: 4.9, w: 1.1, h: 0.35, color: 'FFFFFF', fontSize: 13, bold: true, align: 'center', valign: 'middle', fontFace: 'Arial' });
    
    // Bloco For Life (Cinza Escuro)
    cover.addShape(pptx.ShapeType.rect, { x: 4.9, y: 4.9, w: 1.1, h: 0.35, fill: { color: '333333' } });
    cover.addText('for life', { x: 4.9, y: 4.9, w: 1.1, h: 0.35, color: 'FFFFFF', fontSize: 13, bold: true, align: 'center', valign: 'middle', fontFace: 'Arial' });

    // --- FIM DA COMPOSIÇÃO HSE ---

    // --- SLIDE 2: RESUMO EXECUTIVO ---
    const overviewSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    addExactHeader(overviewSlide, record.title);
    
    overviewSlide.addText(`UNIDADE: ${mun?.name}`, { x: 0.5, y: 1.2, fontSize: 11, bold: true });
    overviewSlide.addText(`TÉCNICO: ${record.technician}`, { x: 0.5, y: 1.5, fontSize: 11 });
    overviewSlide.addText(`DATA: ${record.date}`, { x: 0.5, y: 1.8, fontSize: 11 });
    overviewSlide.addText(`CATEGORIA: ${record.nature}`, { x: 0.5, y: 2.1, fontSize: 11, color: 'FF6600', bold: true });

    overviewSlide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.7, w: 9, h: 2.3, fill: { color: 'F8FAFC' }, line: { color: 'E6EAF6', width: 1 } });
    overviewSlide.addText('RESUMO EXECUTIVO:', { x: 0.6, y: 2.8, fontSize: 9, bold: true, color: '64748B' });
    overviewSlide.addText(record.description || 'Nenhuma descrição detalhada.', { x: 0.6, y: 3.1, w: 8.8, fontSize: 10, color: '1E293B' });

    // --- SLIDE 3: AGENDA / CONTEÚDO ---
    const agendaSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
    addExactHeader(agendaSlide, 'Agenda de Atividades');
    
    const agendaItems = record.stages.map(s => ({ text: s.name, options: { bullet: true, color: '1E293B', fontSize: 14, margin: 10 } }));
    
    if (agendaItems.length > 0) {
      agendaSlide.addText(agendaItems, { 
        x: 1.0, y: 1.5, w: 8.0, h: 3.5, 
        valign: 'top', align: 'left', lineSpacing: 0.5
      });
    } else {
      agendaSlide.addText('Nenhuma etapa registrada para este serviço.', { x: 1.0, y: 1.5, fontSize: 12, color: '64748B', italic: true });
    }

    // --- SLIDES POSTERIORES: DETALHES POR ETAPA ---
    for (const stage of record.stages) {
      const stageSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
      addExactHeader(stageSlide, stage.name);
      
      stageSlide.addText(stage.description || 'Procedimento realizado conforme norma técnica.', { 
        x: 0.5, y: 1.1, w: 9, h: 0.9, fontSize: 10, color: '1E293B', align: 'left', valign: 'top' 
      });

      const imgWidth = 3.0;
      const imgHeight = 2.4;
      const startY = 2.3;
      const gap = 0.2;

      const slots = [
        { label: 'ANTES', data: stage.beforeImage?.data, x: 0.5 },
        { label: 'DURANTE', data: stage.duringImage?.data, x: 0.5 + imgWidth + gap },
        { label: 'DEPOIS', data: stage.afterImage?.data, x: 0.5 + (imgWidth + gap) * 2 }
      ];

      slots.forEach(slot => {
        stageSlide.addText(slot.label, { x: slot.x, y: startY - 0.25, w: imgWidth, fontSize: 9, bold: true, color: '64748B', align: 'center' });
        
        if (slot.data) {
          stageSlide.addImage({
            data: slot.data,
            x: slot.x, y: startY, w: imgWidth, h: imgHeight,
            sizing: { type: 'contain' }
          });
        } else {
          stageSlide.addShape(pptx.ShapeType.rect, { x: slot.x, y: startY, w: imgWidth, h: imgHeight, fill: { color: 'F1F5F9' }, line: { color: 'E6EAF6', width: 1, dashType: 'dash' } });
          stageSlide.addText('FOTO PENDENTE', { x: slot.x, y: startY, w: imgWidth, h: imgHeight, color: 'CBD5E1', fontSize: 8, align: 'center', valign: 'middle' });
        }
      });
    }
  }

  const fileName = `Relatorio_Aggreko_${new Date().toISOString().split('T')[0]}.pptx`;
  await pptx.writeFile({ fileName });
};
