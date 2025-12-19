
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

const DEFAULT_STAGES = ['Antes', 'Durante', 'Depois'];

const MaintenanceForm: React.FC<FormProps> = ({ municipalities, onSave, onCancel, onDelete, onViewImage, initialData }) => {
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>(initialData || {
    status: MaintenanceStatus.PENDING,
    stages: DEFAULT_STAGES.map(name => ({
      id: 'stg-' + Math.random().toString(36).substr(2, 9),
      name,
      description: '',
      images: []
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
      images: []
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, stageId: string) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      const newImages: MaintenanceImage[] = [];

      for (const file of fileList) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push({
          id: 'img-' + Math.random().toString(36).substr(2, 9),
          data: base64
        });
      }

      setFormData(prev => ({
        ...prev,
        stages: prev.stages?.map(s => s.id === stageId ? { ...s, images: [...s.images, ...newImages] } : s)
      }));
      
      if (newImages.length > 0) {
        setAnalyzing(true);
        try {
          const stage = formData.stages?.find(s => s.id === stageId);
          const aiResult = await analyzeMaintenanceImage(newImages[0].data, stage?.description || formData.description || '');
          setFormData(prev => ({ ...prev, aiNotes: aiResult }));
        } catch (err) {
          console.error("Erro na análise IA", err);
        } finally {
          setAnalyzing(false);
        }
      }
    }
  };

  const removeImage = (stageId: string, imgId: string) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages?.map(s => s.id === stageId ? { ...s, images: s.images.filter(i => i.id !== imgId) } : s)
    }));
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

  return (
    <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl space-y-8 max-w-5xl mx-auto border border-slate-100">
      <div className="flex justify-between items-center border-b border-slate-50 pb-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            {initialData ? 'Editar Registro' : 'Nova Manutenção'}
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2 flex items-center">
            <span className="w-8 h-[2px] bg-orange-500 mr-3"></span>
            Fluxo de Trabalho Estruturado
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
              placeholder="Especifique o serviço (ex: Troca de Transformador)..."
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
              placeholder="Especifique a natureza (ex: Inspeção de Emergência)..."
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
            Etapas e Evidências Fotográficas
          </h3>
          <button 
            type="button"
            onClick={addStage}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl flex items-center group active:scale-95"
          >
            <i className="fas fa-layer-group mr-2 group-hover:rotate-12 transition-transform"></i>
            Adicionar Etapa
          </button>
        </div>

        {analyzing && (
          <div className="flex items-center space-x-3 bg-orange-50 px-6 py-3 rounded-2xl w-fit animate-pulse border border-orange-100 shadow-sm">
             <i className="fas fa-microchip text-orange-500"></i>
             <span className="text-[11px] text-orange-700 font-black uppercase tracking-widest">IA Processando Evidências...</span>
          </div>
        )}

        <div className="space-y-10">
          {formData.stages?.map((stage, sIndex) => (
            <div key={stage.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm hover:border-slate-100 transition-all group relative">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/3 space-y-4">
                  <div className="flex items-center space-x-3">
                    <span className="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg shadow-orange-100">
                      {sIndex + 1}
                    </span>
                    <input 
                      type="text"
                      className="bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-orange-500 focus:bg-slate-50 outline-none font-black text-slate-800 px-2 py-1 transition-all flex-grow rounded-lg"
                      value={stage.name}
                      placeholder="Nome da Etapa (ex: Antes, Limpeza TX)..."
                      onChange={e => updateStage(stage.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição desta Etapa</label>
                    <textarea 
                      className="w-full p-5 border-2 border-slate-50 rounded-3xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none h-36 text-sm font-medium bg-slate-50 shadow-inner"
                      placeholder="Relate o que foi feito especificamente nesta parte do serviço..."
                      value={stage.description}
                      onChange={e => updateStage(stage.id, { description: e.target.value })}
                    ></textarea>
                  </div>
                </div>

                <div className="lg:w-2/3 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Galeria de Evidências</label>
                    <label className="flex items-center cursor-pointer text-orange-600 hover:text-orange-700 font-black text-[11px] uppercase tracking-wider group/up">
                      <i className="fas fa-cloud-upload-alt mr-2 group-hover/up:-translate-y-1 transition-transform"></i>
                      Subir Fotos
                      <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleFileChange(e, stage.id)} />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {stage.images.map((img, i) => (
                      <div key={img.id} className="relative group/img aspect-square">
                        <img 
                          src={img.data} 
                          onClick={() => onViewImage && onViewImage(stage.images, i)}
                          className="w-full h-full object-cover rounded-2xl border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform" 
                          alt="Evidence" 
                        />
                        <button 
                          type="button"
                          onClick={() => removeImage(stage.id, img.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity z-10 hover:bg-red-600"
                        >
                          <i className="fas fa-times text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                    <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-orange-300 transition-all text-slate-300 hover:text-orange-500">
                      <i className="fas fa-camera text-2xl mb-2"></i>
                      <span className="text-[10px] font-black uppercase">Foto</span>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={e => handleFileChange(e, stage.id)} />
                    </label>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => removeStage(stage.id)}
                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Remover Etapa"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Resumo Geral Final</label>
        <textarea 
          className="w-full p-6 border-2 border-slate-100 rounded-[2.5rem] focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none h-24 font-mono text-sm bg-slate-50 shadow-inner"
          value={formData.description}
          placeholder="Visão macro de toda a operação realizada..."
          onChange={e => setFormData({...formData, description: e.target.value})}
        ></textarea>
      </div>

      {formData.aiNotes && (
        <div className="bg-emerald-50 p-8 rounded-[3rem] border-2 border-emerald-100 shadow-sm relative overflow-hidden group/ia">
          <div className="absolute -top-4 -right-4 p-8 text-emerald-100/30 group-hover:scale-110 transition-transform">
             <i className="fas fa-robot text-8xl"></i>
          </div>
          <h4 className="text-sm font-black text-emerald-800 mb-3 flex items-center">
            <i className="fas fa-sparkles mr-3"></i> Inteligência Artificial Analítica
          </h4>
          <p className="text-xs text-emerald-700 italic font-medium leading-relaxed max-w-2xl">{formData.aiNotes}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-10 border-t border-slate-100">
        <div className="flex space-x-4 w-full md:w-auto">
          {onDelete && (
            <button 
              type="button"
              onClick={onDelete} 
              className="flex-1 md:flex-none px-10 py-5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all border border-red-100 shadow-sm active:scale-95"
            >
              Excluir Registro
            </button>
          )}
        </div>
        <div className="flex space-x-4 w-full md:w-auto">
          <button 
            type="button"
            onClick={onCancel} 
            className="flex-1 md:flex-none px-10 py-5 text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest transition-all"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleFinalSave}
            className="flex-1 md:flex-none px-12 py-5 bg-orange-600 text-white rounded-3xl hover:bg-orange-700 shadow-2xl shadow-orange-100 font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center space-x-3"
          >
            <i className="fas fa-check-double text-sm"></i>
            <span>Finalizar Manutenção</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceForm;
