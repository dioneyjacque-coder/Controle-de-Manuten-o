
import React, { useState, useEffect, useRef } from 'react';
import { MaintenanceRecord, MaintenanceStatus, Municipality, ServiceType, MaintenanceNature, MaintenanceStage, MaintenanceImage } from '../types';
import { generateImageWithAI, improveTechnicalText } from '../services/geminiService';
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
    nature: MaintenanceNature.PREVENTIVE_PROGRAMMED,
    description: '',
    technician: ''
  });
  
  const [customTitle, setCustomTitle] = useState(initialData?.title || '');
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [activeImagePicker, setActiveImagePicker] = useState<{ stageId: string, slot: 'beforeImage' | 'duringImage' | 'afterImage' } | null>(null);

  const addStage = () => {
    const newStage: MaintenanceStage = {
      id: 'stg-' + Date.now(),
      name: 'Nova Etapa',
      description: '',
    };
    setFormData(prev => ({ ...prev, stages: [...(prev.stages || []), newStage] }));
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

  const processAndSaveImage = (base64: string, stageId: string, slot: 'beforeImage' | 'duringImage' | 'afterImage') => {
    const newImage: MaintenanceImage = {
      id: 'img-' + Math.random().toString(36).substr(2, 9),
      data: base64
    };
    updateStage(stageId, { [slot]: newImage });
    setActiveImagePicker(null);
  };

  const handleFinalSave = () => {
    onSave({
      ...formData,
      title: customTitle || formData.title
    });
  };

  const applyFormat = (stageId: string, currentText: string, prefix: string) => {
    const textarea = document.getElementById(`desc-${stageId}`) as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = currentText.substring(start, end);
    const newText = currentText.substring(0, start) + prefix + selectedText + prefix + currentText.substring(end);
    updateStage(stageId, { description: newText });
  };

  const ImagePickerModal = () => {
    const [mode, setMode] = useState<'options' | 'camera'>('options');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        alert("Erro ao acessar a câmera.");
      }
    };

    const capturePhoto = () => {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(videoRef.current, 0, 0);
        processAndSaveImage(canvas.toDataURL('image/jpeg'), activeImagePicker!.stageId, activeImagePicker!.slot);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      }
    };

    return (
      <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Adicionar Evidência</h3>
            <button onClick={() => setActiveImagePicker(null)} className="text-slate-400"><i className="fas fa-times"></i></button>
          </div>
          <div className="p-8">
            {mode === 'options' ? (
              <div className="grid grid-cols-1 gap-4">
                <label className="flex items-center p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-orange-500 cursor-pointer group">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-orange-600 group-hover:text-white transition-all"><i className="fas fa-upload"></i></div>
                  <div><span className="block font-black text-slate-800 text-sm">Galeria de Fotos</span><span className="text-[10px] text-slate-400 font-bold">Resolução Original</span></div>
                  <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => processAndSaveImage(reader.result as string, activeImagePicker!.stageId, activeImagePicker!.slot);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
                <button onClick={() => { setMode('camera'); startCamera(); }} className="flex items-center p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-orange-500 group text-left">
                   <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mr-4 group-hover:bg-orange-600 group-hover:text-white transition-all"><i className="fas fa-camera"></i></div>
                   <div><span className="block font-black text-slate-800 text-sm">Câmera Aggreko</span><span className="text-[10px] text-slate-400 font-bold">Captura Direta</span></div>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <video ref={videoRef} autoPlay playsInline className="w-full aspect-square object-contain bg-black rounded-3xl border-4 border-slate-100" />
                <button onClick={capturePhoto} className="w-full py-5 bg-orange-600 text-white rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95">Capturar Agora</button>
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
        <label className="text-[9px] font-black text-slate-400 uppercase">{label}</label>
        {img ? (
          <div className="relative group/slot w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-white">
            <img src={img.data} className="w-full h-full object-contain cursor-pointer" onClick={() => onViewImage && onViewImage([img], 0)} alt={label} />
            <button type="button" onClick={() => updateStage(stage.id, { [slot]: undefined })} className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover/slot:opacity-100"><i className="fas fa-times text-[10px]"></i></button>
          </div>
        ) : (
          <button type="button" onClick={() => setActiveImagePicker({ stageId: stage.id, slot })} className="w-full aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:text-orange-500 transition-all"><i className="fas fa-plus text-xl mb-1"></i><span className="text-[8px] font-black uppercase">FOTO</span></button>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-2xl space-y-10 max-w-5xl mx-auto border border-slate-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Relatório Editável</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center"><span className="w-8 h-[2px] bg-orange-600 mr-3"></span>Aggreko - Base Manaus</p>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-2xl border">
          <button type="button" onClick={() => setFormData({...formData, status: MaintenanceStatus.PENDING})} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${formData.status === MaintenanceStatus.PENDING ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}>PENDENTE</button>
          <button type="button" onClick={() => setFormData({...formData, status: MaintenanceStatus.COMPLETED})} className={`px-6 py-3 rounded-xl text-xs font-black transition-all ${formData.status === MaintenanceStatus.COMPLETED ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>CONCLUÍDA</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Serviço</label>
          <input type="text" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-slate-800 outline-none focus:border-orange-500 transition-all" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Ex: Manutenção Alimentador 01" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Natureza do Serviço</label>
          <select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-slate-800 outline-none" value={formData.nature} onChange={e => setFormData({...formData, nature: e.target.value as MaintenanceNature})}>
            <option value={MaintenanceNature.PREVENTIVE_PROGRAMMED}>Manutenção Preventiva Programada</option>
            <option value={MaintenanceNature.CORRECTIVE_PROGRAMMED}>Manutenção Corretiva Programada</option>
            <option value={MaintenanceNature.CORRECTIVE_EMERGENCY}>Manutenção Corretiva Emergencial</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase">Unidade</label><select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none" value={formData.municipalityId} onChange={e => setFormData({...formData, municipalityId: e.target.value})}>{municipalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase">Data</label><input type="date" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
        <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase">Técnico</label><input type="text" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none" value={formData.technician} onChange={e => setFormData({...formData, technician: e.target.value})} /></div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between"><h3 className="font-black text-slate-900 uppercase text-sm tracking-widest flex items-center"><i className="fas fa-clipboard-list text-orange-600 mr-3"></i>Evidências Técnicas</h3><button type="button" onClick={addStage} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black active:scale-95 shadow-xl">ADICIONAR ETAPA</button></div>
        <div className="space-y-12">
          {formData.stages?.map((stage, sIdx) => (
            <div key={stage.id} className="bg-slate-50 p-8 rounded-[3rem] border-2 border-white shadow-sm relative group">
              <div className="flex flex-col gap-8">
                <div className="flex items-center space-x-4">
                  <span className="w-10 h-10 bg-orange-600 text-white rounded-2xl flex items-center justify-center font-black">{sIdx + 1}</span>
                  <input type="text" className="bg-transparent border-b-2 border-transparent focus:border-orange-500 font-black text-slate-800 px-2 py-2 flex-grow outline-none transition-all" value={stage.name} onChange={e => updateStage(stage.id, { name: e.target.value })} />
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, stages: prev.stages?.filter(s => s.id !== stage.id) }))} className="text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash"></i></button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                   <div className="flex flex-col"><div className="flex justify-between items-center mb-2 px-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Procedimento Técnico</span><button type="button" onClick={() => handleImproveText(stage.id, stage.description)} className="text-[8px] font-black uppercase tracking-tighter bg-white text-orange-600 border border-orange-200 px-3 py-1 rounded-lg hover:bg-orange-600 hover:text-white transition-all">{correctingId === stage.id ? 'PROCESSANDO...' : 'REVISÃO IA'}</button></div><textarea id={`desc-${stage.id}`} className="w-full p-6 bg-white border-2 border-white rounded-[2rem] shadow-inner text-sm font-medium outline-none h-44 resize-none focus:border-orange-200 transition-all" value={stage.description} onChange={e => updateStage(stage.id, { description: e.target.value })} placeholder="Descreva os detalhes da operação..." /></div>
                   <div className="flex gap-4"><ImageSlot label="Antes" slot="beforeImage" stage={stage} /><ImageSlot label="Durante" slot="duringImage" stage={stage} /><ImageSlot label="Depois" slot="afterImage" stage={stage} /></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-10 border-t">
        <button type="button" onClick={onCancel} className="px-12 py-5 text-slate-400 font-black uppercase text-xs tracking-widest">Cancelar</button>
        <button type="button" onClick={handleFinalSave} className="px-16 py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95">Salvar Relatório Final</button>
      </div>
      {activeImagePicker && <ImagePickerModal />}
    </div>
  );
};

export default MaintenanceForm;
