
import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, MaintenanceStatus, Municipality, ServiceType, MaintenanceNature, MaintenanceImage } from '../types';
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

const MaintenanceForm: React.FC<FormProps> = ({ municipalities, onSave, onCancel, onDelete, onViewImage, initialData }) => {
  const [formData, setFormData] = useState<Partial<MaintenanceRecord>>(initialData || {
    status: MaintenanceStatus.PENDING,
    images: [],
    date: new Date().toISOString().split('T')[0],
    title: ServiceType.TYPE_50A,
    nature: MaintenanceNature.PROGRAMMED,
    description: ''
  });
  
  const [customTitle, setCustomTitle] = useState('');
  const [customNature, setCustomNature] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Inicializa valores customizados se estiver editando
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
    setFormData(prev => {
      const newDesc = (prev.description === '' || Object.values(SERVICE_TEMPLATES).includes(prev.description || '')) && type !== ServiceType.OTHER
        ? SERVICE_TEMPLATES[type as keyof typeof SERVICE_TEMPLATES] || ''
        : prev.description;
      
      return {
        ...prev,
        title: type,
        description: newDesc
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          id: 'img-' + Date.now() + Math.random().toString(36).substr(2, 9),
          data: base64,
          description: ''
        });
      }

      setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...newImages] }));
      
      if (formData.description && newImages.length > 0) {
        setAnalyzing(true);
        try {
          const aiResult = await analyzeMaintenanceImage(newImages[0].data, formData.description);
          setFormData(prev => ({ ...prev, aiNotes: aiResult }));
        } catch (err) {
          console.error("Erro na análise IA", err);
        } finally {
          setAnalyzing(false);
        }
      }
    }
  };

  const updateImageDescription = (id: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.map(img => img.id === id ? { ...img, description: text } : img)
    }));
  };

  const removeImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter(img => img.id !== id)
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
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl space-y-6 max-w-4xl mx-auto border border-slate-100">
      <div className="flex justify-between items-center border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900">
            {initialData ? 'Editar Registro' : 'Nova Manutenção'}
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Gestão de Evidências Técnicas</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            type="button"
            onClick={() => setFormData({...formData, status: MaintenanceStatus.PENDING})}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${formData.status === MaintenanceStatus.PENDING ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            PENDENTE
          </button>
          <button 
            type="button"
            onClick={() => setFormData({...formData, status: MaintenanceStatus.COMPLETED})}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${formData.status === MaintenanceStatus.COMPLETED ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            CONCLUÍDA
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Município</label>
          <select 
            className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all appearance-none bg-slate-50 font-bold text-slate-700"
            value={formData.municipalityId}
            onChange={e => setFormData({...formData, municipalityId: e.target.value})}
          >
            <option value="">Selecione o local...</option>
            {municipalities.map(m => <option key={m.id} value={m.id}>{m.name} ({m.region})</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Data da Atividade</label>
          <input 
            type="date"
            className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-slate-50 font-bold text-slate-700"
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Tipo de Serviço</label>
          <select 
            className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-slate-50 font-bold text-slate-700"
            value={formData.title}
            onChange={e => handleServiceChange(e.target.value as ServiceType)}
          >
            {Object.values(ServiceType).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          {formData.title === ServiceType.OTHER && (
            <input 
              type="text"
              className="w-full p-4 border border-orange-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-orange-50 font-bold text-orange-700 mt-2 animate-fade-in"
              placeholder="Descreva o tipo de serviço..."
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Natureza</label>
          <select 
            className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-slate-50 font-bold text-slate-700"
            value={formData.nature}
            onChange={e => setFormData({...formData, nature: e.target.value as MaintenanceNature})}
          >
            {Object.values(MaintenanceNature).map(nature => <option key={nature} value={nature}>{nature}</option>)}
          </select>
          {formData.nature === MaintenanceNature.OTHER && (
            <input 
              type="text"
              className="w-full p-4 border border-orange-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all bg-orange-50 font-bold text-orange-700 mt-2 animate-fade-in"
              placeholder="Descreva a natureza..."
              value={customNature}
              onChange={e => setCustomNature(e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Resumo Geral da Atividade</label>
          <button 
            type="button" 
            onClick={() => setFormData({...formData, description: SERVICE_TEMPLATES[formData.title as keyof typeof SERVICE_TEMPLATES] || ''})}
            className="text-[10px] bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200 text-slate-600 font-black transition-colors"
          >
            <i className="fas fa-undo mr-1"></i> Resetar Checklist
          </button>
        </div>
        <textarea 
          className="w-full p-6 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none h-32 font-mono text-sm leading-relaxed bg-slate-50 shadow-inner"
          value={formData.description}
          placeholder="Visão macro das atividades realizadas..."
          onChange={e => setFormData({...formData, description: e.target.value})}
        ></textarea>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center">
            <i className="fas fa-camera text-orange-500 mr-2"></i>
            Fotos e Descrições Técnicas
          </h3>
          <label className="flex items-center cursor-pointer bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-2xl shadow-lg shadow-orange-100 transition-all active:scale-95 group">
            <i className="fas fa-plus mr-2 text-sm group-hover:rotate-90 transition-transform"></i>
            <span className="font-black text-xs uppercase">Anexar Evidências</span>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
          </label>
        </div>

        {analyzing && (
          <div className="flex items-center space-x-2 bg-orange-50 px-4 py-2 rounded-xl w-fit">
             <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
             <span className="text-[10px] text-orange-600 font-black uppercase tracking-widest">IA Analisando novas fotos...</span>
          </div>
        )}

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {formData.images?.map((img, i) => (
            <div key={img.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-6 group relative">
              <div className="w-full md:w-48 shrink-0">
                <div className="relative aspect-square md:aspect-auto md:h-full overflow-hidden rounded-2xl border-2 border-white shadow-sm">
                  <img 
                    src={img.data} 
                    onClick={() => onViewImage && onViewImage(formData.images as MaintenanceImage[], i)}
                    className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform" 
                    alt={`Evidência ${i + 1}`} 
                  />
                  <div className="absolute top-2 left-2 bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                    #{i + 1}
                  </div>
                </div>
              </div>
              <div className="flex-grow space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição Técnica desta Imagem</label>
                <textarea 
                  className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none h-24 text-sm font-medium bg-white"
                  placeholder="Ex: Foto do reaperto no TX-02, utilizando chave 13mm..."
                  value={img.description}
                  onChange={e => updateImageDescription(img.id, e.target.value)}
                ></textarea>
              </div>
              <button 
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute -top-2 -right-2 md:top-4 md:right-4 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
              >
                <i className="fas fa-trash-alt text-sm"></i>
              </button>
            </div>
          ))}
          
          {formData.images?.length === 0 && (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300">
               <i className="fas fa-images text-5xl mb-4"></i>
               <p className="text-sm font-black uppercase tracking-widest">Nenhuma foto adicionada</p>
               <p className="text-[10px] font-bold mt-1">Adicione fotos para descrever o passo-a-passo</p>
            </div>
          )}
        </div>
      </div>

      {formData.aiNotes && (
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <i className="fas fa-robot text-5xl"></i>
          </div>
          <h4 className="text-sm font-black text-emerald-800 mb-2 flex items-center">
            <i className="fas fa-magic mr-2"></i> Análise Técnica da IA:
          </h4>
          <p className="text-xs text-emerald-700 italic font-medium leading-relaxed">{formData.aiNotes}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-100">
        <div className="flex space-x-3 w-full md:w-auto">
          {onDelete && (
            <button 
              type="button"
              onClick={onDelete} 
              className="flex-1 md:flex-none px-8 py-4 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl font-black text-sm transition-all border border-red-100 shadow-sm"
            >
              <i className="fas fa-trash mr-2"></i> Excluir
            </button>
          )}
        </div>
        <div className="flex space-x-3 w-full md:w-auto">
          <button 
            type="button"
            onClick={onCancel} 
            className="flex-1 md:flex-none px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black text-sm transition-all"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleFinalSave}
            className="flex-1 md:flex-none px-10 py-4 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 shadow-xl shadow-orange-100 font-black text-sm transition-all active:scale-95"
          >
            <i className="fas fa-save mr-2"></i> Salvar Manutenção
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceForm;
