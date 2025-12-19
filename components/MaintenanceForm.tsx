
import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, MaintenanceStatus, Municipality, ServiceType, MaintenanceNature, MaintenanceStage, MaintenanceImage } from '../types';
import { analyzeMaintenanceImage } from '../services/geminiService';
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

  const handleImageSlotChange = async (e: React.ChangeEvent<HTMLInputElement>, stageId: string, slot: 'beforeImage' | 'duringImage' | 'afterImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const newImage: MaintenanceImage = {
        id: 'img-' + Math.random().toString(36).substr(2, 9),
        data: base64
      };

      updateStage(stageId, { [slot]: newImage });
      
      // AI Analysis Trigger
      setAnalyzing(true);
      try {
        const aiResult = await analyzeMaintenanceImage(base64, "Foto do slot " + slot);
        setFormData(prev => ({ ...prev, aiNotes: aiResult }));
      } catch (err) {
        console.error("Erro na análise IA", err);
      } finally {
        setAnalyzing(false);
      }
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
          <label className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-orange-300 transition-all text-slate-300 hover:text-orange-500">
            <i className="fas fa-camera text-xl mb-1"></i>
            <span className="text-[9px] font-black uppercase">Subir Foto</span>
            <input type="file" className="hidden" accept="image/*" onChange={e => handleImageSlotChange(e, stage.id, slot)} />
          </label>
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
            Estrutura Antes / Durante / Depois
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
          {formData.title === ServiceType.OTHER && (
            <input 
              type="text"
              className="w-full p-5 border-2 border-orange-200 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-orange-50 font-bold text-orange-800 mt-4 animate-fade-in shadow-sm"
              placeholder="Especifique o serviço..."
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
            />
          )}
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
          {formData.nature === MaintenanceNature.OTHER && (
            <input 
              type="text"
              className="w-full p-5 border-2 border-orange-200 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-orange-50 font-bold text-orange-800 mt-4 animate-fade-in shadow-sm"
              placeholder="Especifique a natureza..."
              value={customNature}
              onChange={e => setCustomNature(e.target.value)}
            />
          )}
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
                   <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Relatório Técnico da Etapa</label>
                      <textarea 
                        className="w-full p-5 border-2 border-slate-50 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none h-40 text-sm font-medium bg-slate-50 shadow-inner"
                        placeholder="Descreva o procedimento técnico realizado..."
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
    </div>
  );
};

export default MaintenanceForm;
