
import React, { useState, useEffect, useRef } from 'react';
import { MaintenanceRecord, MaintenanceStatus, Municipality, ServiceType, MaintenanceNature, MaintenanceStage, MaintenanceImage } from '../types';
import { analyzeMaintenanceImage, generateImageWithAI, improveTechnicalText } from '../services/geminiService';
import { SERVICE_TEMPLATES } from '../constants';

interface FormProps {
  municipalities: Municipality[];
  onSave: (record: Partial<MaintenanceRecord>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onViewImage?: (images: MaintenanceImage[], index: number) => void;
  initialData?: MaintenanceRecord;
}

const DEFAULT_STAGES = ['Inspeção Inicial', 'Execução Técnica', 'Finalização'];

const MaintenanceForm: React.FC<FormProps> = ({ municipalities, onSave, onCancel, onDelete, onViewImage, initialData }) => {
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>(initialData || {
    status: MaintenanceStatus.PENDING,
    stages: DEFAULT_STAGES.map(name => ({
      id: 'stg-' + Math.random().toString(36).substr(2, 9),
      name,
      description: '',
    })),
    date: new Date().toISOString().split('T')[0],
    title: ServiceType.TYPE_50A,
    nature: MaintenanceNature.PROGRAMMED,
    description: '',
    technician: ''
  });
  
  const [customTitle, setCustomTitle] = useState('');
  const [customNature, setCustomNature] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [activeImagePicker, setActiveImagePicker] = useState<{ stageId: string, slot: 'beforeImage' | 'duringImage' | 'afterImage' } | null>(null);

  useEffect(() => {
    if (initialData) {
      if (!Object.values(ServiceType).includes(initialData.title as ServiceType)) {
        setFormData(prev => ({ ...prev, title: ServiceType.OTHER }));
        setCustomTitle(initialData.title);
      }
      if (!Object.values(MaintenanceNature).includes(initialData.nature as MaintenanceNature)) {
        setFormData(prev => ({ ...prev, nature: MaintenanceNature.OTHER }));
        setCustomNature(initialData.nature);
      }
    }
  }, [initialData]);

  const handleServiceChange = (type: ServiceType) => {
    setFormData(prev => ({
      ...prev,
      title: type,
      description: (prev.description === '' || Object.values(SERVICE_TEMPLATES).includes(prev.description || '')) && type !== ServiceType.OTHER
        ? SERVICE_TEMPLATES[type as keyof typeof SERVICE_TEMPLATES] || ''
        : prev.description
    }));
  };

  const addStage = () => {
    const newStage: MaintenanceStage = {
      id: 'stg-' + Date.now(),
      name: 'Nova Etapa',
      description: '',
    };
    setFormData(prev => ({ ...prev, stages: [...(prev.stages || []), newStage] }));
  };

  const removeStage = (id: string) => {
    setFormData(prev => ({ ...prev, stages: prev.stages?.filter(s => s.id !== id) }));
  };

  const updateStage = (id: string, updates: Partial<MaintenanceStage>) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages?.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const handleImproveText = async (stageId: string, currentText: string) => {
    if (!currentText.trim()) return;
    setCorrectingId(stageId);
    try {
      const improvedText = await improveTechnicalText(currentText);
      updateStage(stageId, { description: improvedText });
    } catch (err) {
      console.error("Erro ao corrigir texto", err);
    } finally {
      setCorrectingId(null);
    }
  };

  const processAndSaveImage = async (base64: string, stageId: string, slot: 'beforeImage' | 'duringImage' | 'afterImage') => {
    const newImage: MaintenanceImage = {
      id: 'img-' + Math.random().toString(36).substr(2, 9),
      data: base64
    };

    updateStage(stageId, { [slot]: newImage });
    setActiveImagePicker(null);
    
    setAnalyzing(true);
    try {
      const aiResult = await analyzeMaintenanceImage(base64, "Foto do slot " + slot);
      setFormData(prev => ({ ...prev, aiNotes: aiResult }));
    } catch (err) {
      console.error("Erro na análise IA", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const removeImageSlot = (stageId: string, slot: 'beforeImage' | 'duringImage' | 'afterImage') => {
    updateStage(stageId, { [slot]: undefined });
  };

  const handleFinalSave = () => {
    const finalData = { ...formData };
    if (formData.title === ServiceType.OTHER) {
      finalData.title = customTitle || 'Serviço não especificado';
    }
    if (formData.nature === MaintenanceNature.OTHER) {
      finalData.nature = customNature || 'Natureza não especificada';
    }
    onSave(finalData);
  };

  // Helper for simple markdown formatting buttons
  const applyFormat = (stageId: string, currentText: string, prefix: string, suffix: string = prefix) => {
    const textarea = document.getElementById(`desc-${stageId}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = currentText.substring(start, end);
    const newText = currentText.substring(0, start) + prefix + selectedText + suffix + currentText.substring(end);
    
    updateStage(stageId, { description: newText });
    
    // Attempt to keep selection after update
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  const ImagePickerModal = () => {
    const [mode, setMode] = useState<'options' | 'camera' | 'ai'>('options');
    const [isStreaming, setIsStreaming] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (err) {
        alert("Erro ao acessar a câmera. Verifique as permissões.");
      }
    };

    const capturePhoto = () => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        const data = canvas.toDataURL('image/jpeg');
        stopCamera();
        if (activeImagePicker) processAndSaveImage(data, activeImagePicker.stageId, activeImagePicker.slot);
      }
    };

    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setIsStreaming(false);
      }
    };

    const generateAI = async () => {
      if (!aiPrompt) return;
      setIsGenerating(true);
      try {
        const data = await generateImageWithAI(aiPrompt);
        if (activeImagePicker) processAndSaveImage(data, activeImagePicker.stageId, activeImagePicker.slot);
      } catch (err) {
        alert("Erro ao gerar imagem com IA.");
      } finally {
        setIsGenerating(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-fade-in border border-white/20">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Adicionar Evidência</h3>
            <button onClick={() => { stopCamera(); setActiveImagePicker(null); }} className="text-slate-400 hover:text-slate-600">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="p-8">
            {mode === 'options' && (
              <div className="grid grid-cols-1 gap-4">
                <label className="flex items-center p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-orange-500 hover:bg-orange-50 cursor-pointer transition-all group">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <i className="fas fa-upload text-xl"></i>
                  </div>
                  <div className="flex-grow">
                    <span className="block font-black text-slate-800 text-sm">Upload de Arquivo</span>
                    <span className="text-[10px] text-slate-400 font-bold">Galeria ou arquivos locais</span>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                      });
                      if (activeImagePicker) processAndSaveImage(base64, activeImagePicker.stageId, activeImagePicker.slot);
                    }
                  }} />
                </label>

                <button onClick={() => { setMode('camera'); startCamera(); }} className="flex items-center p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-orange-500 hover:bg-orange-50 cursor-pointer transition-all group text-left w-full">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <i className="fas fa-camera text-xl"></i>
                  </div>
                  <div className="flex-grow">
                    <span className="block font-black text-slate-800 text-sm">Usar Câmera</span>
                    <span className="text-[10px] text-slate-400 font-bold">Capturar em tempo real</span>
                  </div>
                </button>

                <button onClick={() => setMode('ai')} className="flex items-center p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-orange-500 hover:bg-orange-50 cursor-pointer transition-all group text-left w-full">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <i className="fas fa-robot text-xl"></i>
                  </div>
                  <div className="flex-grow">
                    <span className="block font-black text-slate-800 text-sm">Gerar com IA</span>
                    <span className="text-[10px] text-slate-400 font-bold">Criar imagem via prompt</span>
                  </div>
                </button>
              </div>
            )}

            {mode === 'camera' && (
              <div className="space-y-6">
                <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-50">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/50">
                      <i className="fas fa-circle-notch fa-spin text-4xl"></i>
                    </div>
                  )}
                </div>
                <div className="flex justify-center space-x-4">
                  <button onClick={() => { stopCamera(); setMode('options'); }} className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest">Voltar</button>
                  <button onClick={capturePhoto} className="px-10 py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-600/20 active:scale-95">
                    <i className="fas fa-shutter-speed mr-2"></i> Capturar
                  </button>
                </div>
              </div>
            )}

            {mode === 'ai' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descreva a imagem desejada</label>
                  <textarea 
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none text-sm font-medium transition-all"
                    placeholder="Ex: Foto de um transformador trifásico com cabos conectados e barramento limpo..."
                    rows={4}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                </div>
                <div className="flex justify-center space-x-4">
                  <button onClick={() => setMode('options')} className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest">Voltar</button>
                  <button 
                    onClick={generateAI} 
                    disabled={isGenerating || !aiPrompt}
                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 flex items-center"
                  >
                    {isGenerating ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i> Gerando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic mr-2"></i> Gerar Imagem
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ImageSlot = ({ label, slot, stage }: { label: string, slot: 'beforeImage' | 'duringImage' | 'afterImage', stage: MaintenanceStage }) => {
    const img = stage[slot];
    return (
      <div className="flex flex-col items-center space-y-2 flex-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        {img ? (
          <div className="relative group/slot w-full aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-white shadow-md">
            <img src={img.data} className="w-full h-full object-cover cursor-pointer" alt={label} onClick={() => onViewImage && onViewImage([img], 0)} />
            <button 
              type="button" 
              onClick={() => removeImageSlot(stage.id, slot)}
              className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover/slot:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
            >
              <i className="fas fa-times text-[10px]"></i>
            </button>
          </div>
        ) : (
          <button 
            type="button"
            onClick={() => setActiveImagePicker({ stageId: stage.id, slot })}
            className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-orange-300 transition-all text-slate-300 hover:text-orange-500"
          >
            <i className="fas fa-camera text-xl mb-1"></i>
            <span className="text-[9px] font-black uppercase">Adicionar</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl space-y-8 max-w-5xl mx-auto border border-slate-100">
      <div className="flex justify-between items-center border-b border-slate-50 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            {initialData ? 'Editar Registro' : 'Nova Manutenção'}
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2 flex items-center">
            <span className="w-8 h-[2px] bg-orange-500 mr-3"></span>
            Interface Word-Ready & IA Review
          </p>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-2xl border border-slate-200 shadow-inner">
          <button 
            type="button"
            onClick={() => setFormData({...formData, status: MaintenanceStatus.PENDING})}
            className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${formData.status === MaintenanceStatus.PENDING ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            PENDENTE
          </button>
          <button 
            type="button"
            onClick={() => setFormData({...formData, status: MaintenanceStatus.COMPLETED})}
            className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${formData.status === MaintenanceStatus.COMPLETED ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            CONCLUÍDA
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Localização do Ativo</label>
          <select 
            className="w-full p-5 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all appearance-none bg-slate-50 font-bold text-slate-800 shadow-sm"
            value={formData.municipalityId}
            onChange={e => setFormData({...formData, municipalityId: e.target.value})}
          >
            <option value="">Selecione o município...</option>
            {municipalities.map(m => <option key={m.id} value={m.id}>{m.name} ({m.region})</option>)}
          </select>
        </div>
        <div className="space-y-3">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Data da Operação</label>
          <input 
            type="date"
            className="w-full p-5 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-slate-50 font-bold text-slate-800 shadow-sm"
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
          />
        </div>
        <div className="space-y-3">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Técnico Responsável</label>
          <input 
            type="text"
            className="w-full p-5 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-slate-50 font-bold text-slate-800 shadow-sm"
            placeholder="Nome completo do técnico..."
            value={formData.technician}
            onChange={e => setFormData({...formData, technician: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Tipo de Atividade</label>
          <select 
            className="w-full p-5 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-slate-50 font-bold text-slate-800 shadow-sm"
            value={formData.title}
            onChange={e => handleServiceChange(e.target.value as ServiceType)}
          >
            {Object.values(ServiceType).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Natureza do Serviço</label>
          <select 
            className="w-full p-5 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-slate-50 font-bold text-slate-800 shadow-sm"
            value={formData.nature}
            onChange={e => setFormData({...formData, nature: e.target.value as MaintenanceNature})}
          >
            {Object.values(MaintenanceNature).map(nature => <option key={nature} value={nature}>{nature}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center">
            <i className="fas fa-tasks text-orange-500 mr-3"></i>
            Evidências por Etapa
          </h3>
          <button type="button" onClick={addStage} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl flex items-center group active:scale-95">
            <i className="fas fa-layer-group mr-2"></i> Adicionar Etapa
          </button>
        </div>

        <div className="space-y-10">
          {formData.stages?.map((stage, sIndex) => (
            <div key={stage.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm group relative">
              <div className="flex flex-col gap-6">
                <div className="flex items-center space-x-3">
                  <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                    {sIndex + 1}
                  </span>
                  <input 
                    type="text"
                    className="bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-orange-500 outline-none font-black text-slate-800 px-2 py-1 transition-all flex-grow rounded-lg"
                    value={stage.name}
                    placeholder="Nome da Etapa..."
                    onChange={e => updateStage(stage.id, { name: e.target.value })}
                  />
                  <button type="button" onClick={() => removeStage(stage.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <div className="space-y-0">
                      <div className="flex items-center justify-between bg-slate-100 p-3 rounded-t-3xl border-2 border-slate-50 border-b-0">
                         <div className="flex space-x-2">
                            <button 
                                type="button"
                                onClick={() => applyFormat(stage.id, stage.description, '**')}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold hover:bg-slate-50"
                                title="Negrito"
                            >
                                <i className="fas fa-bold"></i>
                            </button>
                            <button 
                                type="button"
                                onClick={() => applyFormat(stage.id, stage.description, '_')}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs italic font-serif hover:bg-slate-50"
                                title="Itálico"
                            >
                                <i className="fas fa-italic"></i>
                            </button>
                            <button 
                                type="button"
                                onClick={() => applyFormat(stage.id, stage.description, '\n- ')}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs hover:bg-slate-50"
                                title="Lista"
                            >
                                <i className="fas fa-list-ul"></i>
                            </button>
                         </div>
                         <button 
                            type="button"
                            onClick={() => handleImproveText(stage.id, stage.description)}
                            disabled={correctingId === stage.id || !stage.description}
                            className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${correctingId === stage.id ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'}`}
                         >
                            {correctingId === stage.id ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Revisando...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-wand-magic-sparkles"></i>
                                    <span>Revisão Técnica IA</span>
                                </>
                            )}
                         </button>
                      </div>
                      <textarea 
                        id={`desc-${stage.id}`}
                        spellCheck="true"
                        lang="pt-BR"
                        className="w-full p-5 border-2 border-slate-50 rounded-b-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none h-40 text-sm font-medium bg-slate-50 shadow-inner resize-none"
                        placeholder="Descreva o procedimento técnico realizado (Ex: limpeza de barramento, troca de isolador...)"
                        value={stage.description}
                        onChange={e => updateStage(stage.id, { description: e.target.value })}
                      ></textarea>
                   </div>
                   <div className="flex gap-4">
                      <ImageSlot label="Antes" slot="beforeImage" stage={stage} />
                      <ImageSlot label="Durante" slot="duringImage" stage={stage} />
                      <ImageSlot label="Depois" slot="afterImage" stage={stage} />
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-100">
        <div className="flex space-x-4 w-full md:w-auto">
          {onDelete && (
            <button type="button" onClick={onDelete} className="flex-1 md:flex-none px-10 py-5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-3xl font-black text-xs uppercase transition-all border border-red-100 active:scale-95">
              Excluir
            </button>
          )}
        </div>
        <div className="flex space-x-4 w-full md:w-auto">
          <button type="button" onClick={onCancel} className="flex-1 md:flex-none px-10 py-5 text-slate-400 font-black text-xs uppercase tracking-widest">
            Cancelar
          </button>
          <button type="button" onClick={handleFinalSave} className="flex-1 md:flex-none px-12 py-5 bg-orange-600 text-white rounded-3xl hover:bg-orange-700 shadow-2xl font-black text-xs uppercase transition-all active:scale-95">
            Salvar Registro
          </button>
        </div>
      </div>

      {activeImagePicker && <ImagePickerModal />}
      
      {analyzing && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex items-center space-x-4 animate-bounce">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-black text-slate-800 text-sm uppercase tracking-widest">IA Analisando Evidência...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceForm;
