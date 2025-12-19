
import React, { useState, useMemo } from 'react';
import { MaintenanceRecord, MaintenanceStatus, Municipality, Region, MaintenanceNature, MaintenanceImage, MaintenanceStage, ServiceType } from './types';
import { AMAZONAS_MUNICIPALITIES, INITIAL_RECORDS } from './constants';
import InteractiveMap from './components/InteractiveMap';
import MaintenanceForm from './components/MaintenanceForm';
import ImageViewer from './components/ImageViewer';
import { exportToPPTX } from './utils/pptxExport';
import { generateSupervisorSummary } from './services/geminiService';

const App: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>(INITIAL_RECORDS);
  const [view, setView] = useState<'dashboard' | 'form' | 'reports'>('dashboard');
  const [filterMun, setFilterMun] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<MaintenanceStatus>(MaintenanceStatus.PENDING);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // States for Reports Filtering
  const [reportSearch, setReportSearch] = useState('');
  const [reportMun, setReportMun] = useState('');
  const [reportService, setReportService] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // State for image viewer
  const [viewerData, setViewerData] = useState<{images: MaintenanceImage[], index: number} | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      (filterMun ? r.municipalityId === filterMun : true) && 
      r.status === activeTab
    );
  }, [records, filterMun, activeTab]);

  const reportFilteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = reportSearch === '' || 
        r.technician.toLowerCase().includes(reportSearch.toLowerCase()) ||
        r.title.toLowerCase().includes(reportSearch.toLowerCase()) ||
        r.description.toLowerCase().includes(reportSearch.toLowerCase());
      
      const matchesMun = reportMun === '' || r.municipalityId === reportMun;
      const matchesService = reportService === '' || r.title === reportService;
      
      const recordDate = new Date(r.date);
      const matchesStart = reportStartDate === '' || recordDate >= new Date(reportStartDate);
      const matchesEnd = reportEndDate === '' || recordDate <= new Date(reportEndDate);

      return matchesSearch && matchesMun && matchesService && matchesStart && matchesEnd;
    });
  }, [records, reportSearch, reportMun, reportService, reportStartDate, reportEndDate]);

  const handleSave = (recordData: Partial<MaintenanceRecord>) => {
    if (editingRecord) {
      setRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...recordData } as MaintenanceRecord : r));
    } else {
      const newRecord: MaintenanceRecord = {
        ...recordData,
        id: 'rec-' + Date.now(),
        technician: recordData.technician || 'Técnico não informado'
      } as MaintenanceRecord;
      setRecords(prev => [newRecord, ...prev]);
    }
    setView('dashboard');
    setEditingRecord(undefined);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta manutenção?')) {
      setRecords(prev => prev.filter(r => r.id !== id));
      if (editingRecord && editingRecord.id === id) {
        setEditingRecord(undefined);
        setView('dashboard');
      }
    }
  };

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const summary = await generateSupervisorSummary(records);
      setAiSummary(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handlePPTXExport = async (recordsToExport: MaintenanceRecord[]) => {
    setIsExporting(true);
    try {
      await exportToPPTX(recordsToExport, AMAZONAS_MUNICIPALITIES);
    } catch (e) {
      console.error("Erro na exportação PPTX", e);
      alert("Houve um erro ao gerar o PowerPoint.");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedMunicipality = AMAZONAS_MUNICIPALITIES.find(m => m.id === filterMun);

  const RecordCard: React.FC<{ record: MaintenanceRecord }> = ({ record }) => {
    return (
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all relative group flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col space-y-2">
              <span className={`w-fit px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${record.status === MaintenanceStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {record.status === MaintenanceStatus.COMPLETED ? 'Concluída' : 'Pendente'}
              </span>
              <span className={`w-fit px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${record.nature === MaintenanceNature.EMERGENCY ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
              {record.nature}
              </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">{record.date}</span>
          </div>
        </div>
        
        <h4 className="font-black text-slate-900 text-xl leading-tight mb-2 tracking-tight">{record.title}</h4>
        
        <div className="flex flex-col space-y-1 mb-6">
          <div className="flex items-center text-xs text-slate-500 font-bold">
             <i className="fas fa-map-marker-alt mr-2 text-orange-500"></i>
             {AMAZONAS_MUNICIPALITIES.find(m => m.id === record.municipalityId)?.name}
          </div>
          <div className="flex items-center text-xs text-slate-500 font-bold">
             <i className="fas fa-user-gear mr-2 text-orange-500"></i>
             Técnico: {record.technician}
          </div>
        </div>

        <div className="flex-grow space-y-4 mb-8">
          {record.stages.map((stage) => (
            <div key={stage.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></span>
                  {stage.name}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">{stage.images.length} fotos</span>
              </div>
              <p className="text-[11px] font-medium text-slate-600 leading-relaxed line-clamp-2 italic mb-3">
                {stage.description || "Atividade não descrita individualmente."}
              </p>
              <div className="flex -space-x-2">
                {stage.images.slice(0, 4).map((img, i) => (
                  <img 
                    key={img.id} 
                    src={img.data} 
                    onClick={() => setViewerData({ images: stage.images, index: i })}
                    className="w-10 h-10 rounded-xl border-2 border-white object-cover shadow-sm cursor-pointer hover:scale-110 transition-transform hover:z-10" 
                    alt="preview"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleDelete(record.id)}
              className="text-slate-300 hover:text-red-500 p-2 transition-colors"
              title="Excluir"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
            <button 
              onClick={() => handlePPTXExport([record])}
              className="text-slate-300 hover:text-red-600 p-2 transition-colors"
              title="Exportar PowerPoint"
            >
              <i className="fas fa-file-powerpoint"></i>
            </button>
          </div>
          <button 
            onClick={() => { setEditingRecord(record); setView('form'); }}
            className="bg-orange-600 text-white px-8 py-3 rounded-2xl text-xs font-black hover:bg-orange-700 transition-all flex items-center shadow-lg shadow-orange-100 active:scale-95"
          >
            <i className="fas fa-file-signature mr-2"></i> Abrir Detalhes
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <nav className="w-full md:w-64 bg-slate-950 text-white p-8 flex flex-col shrink-0">
        <div className="flex items-center space-x-4 mb-12">
          <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-500/20">
            <i className="fas fa-bolt text-xl"></i>
          </div>
          <h1 className="text-xl font-black tracking-tighter">Equipe HV</h1>
        </div>

        <div className="space-y-4 flex-grow">
          <button 
            onClick={() => { setView('dashboard'); setFilterMun(null); }}
            className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center space-x-4 ${view === 'dashboard' ? 'bg-orange-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-400'}`}
          >
            <i className="fas fa-th-large"></i>
            <span className="font-bold text-sm">Dashboard</span>
          </button>
          <button 
            onClick={() => { setEditingRecord(undefined); setView('form'); }}
            className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center space-x-4 ${view === 'form' ? 'bg-orange-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-400'}`}
          >
            <i className="fas fa-plus-circle"></i>
            <span className="font-bold text-sm">Novo Registro</span>
          </button>
          <button 
            onClick={() => setView('reports')}
            className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center space-x-4 ${view === 'reports' ? 'bg-orange-600 text-white shadow-xl' : 'hover:bg-white/5 text-slate-400'}`}
          >
            <i className="fas fa-file-export"></i>
            <span className="font-bold text-sm">Relatórios</span>
          </button>
        </div>

        <div className="mt-auto pt-8 border-t border-white/10 text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
          <p>Amazonas • Operacional</p>
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-10 lg:p-16 overflow-y-auto">
        {view === 'dashboard' && (
          <div className="max-w-7xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Monitoramento Amazonas</h2>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em]">Gestão de Alta Voltagem e Redes</p>
              </div>
              <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                <button 
                  onClick={() => setActiveTab(MaintenanceStatus.PENDING)}
                  className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === MaintenanceStatus.PENDING ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  PENDENTES ({records.filter(r => r.status === MaintenanceStatus.PENDING).length})
                </button>
                <button 
                  onClick={() => setActiveTab(MaintenanceStatus.COMPLETED)}
                  className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === MaintenanceStatus.COMPLETED ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  CONCLUÍDAS ({records.filter(r => r.status === MaintenanceStatus.COMPLETED).length})
                </button>
              </div>
            </header>

            <InteractiveMap 
              onSelectMunicipality={(id) => setFilterMun(id === filterMun ? null : id)} 
              selectedMunId={filterMun} 
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 flex items-center tracking-tight">
                    <i className="fas fa-list-check mr-4 text-orange-600 text-2xl"></i>
                    {filterMun ? `Registros em ${selectedMunicipality?.name}` : 'Fluxo Operacional Recente'}
                  </h3>
                  {filterMun && (
                    <button 
                      onClick={() => setFilterMun(null)} 
                      className="bg-slate-950 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                    >
                      Limpar Filtro
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map(record => (
                      <RecordCard key={record.id} record={record} />
                    ))
                  ) : (
                    <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                      <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                         <i className="fas fa-clipboard-check text-4xl text-slate-200"></i>
                      </div>
                      <h4 className="text-slate-400 font-black text-lg uppercase tracking-widest">Nenhuma atividade ativa</h4>
                      <p className="text-slate-300 text-sm mt-2 font-medium">Todos os ativos operando em conformidade</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-600/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                  <h4 className="font-black mb-8 text-orange-500 text-[10px] uppercase tracking-[0.4em]">Performance de Bacia</h4>
                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-6xl font-black tracking-tighter">{records.length}</span>
                        <span className="text-xs block text-slate-500 font-bold uppercase mt-2 tracking-widest">Atividades Totais</span>
                      </div>
                      <div className="text-right">
                         <span className="text-2xl font-black text-white">{records.filter(r => r.status === MaintenanceStatus.COMPLETED).length}</span>
                         <span className="text-[10px] block text-emerald-500 font-black uppercase tracking-widest">Finalizadas</span>
                      </div>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-4 p-1">
                      <div className="bg-orange-600 h-full rounded-full shadow-lg shadow-orange-600/50 transition-all duration-1000" style={{ width: `${records.length > 0 ? (records.filter(r => r.status === MaintenanceStatus.COMPLETED).length / records.length) * 100 : 0}%` }}></div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                        <p className="text-[11px] font-medium leading-relaxed italic text-slate-400">Dados consolidados do Solimões, Japurá e Juruá.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                  <h4 className="font-black text-slate-900 mb-8 flex items-center text-lg tracking-tight">
                    <i className="fas fa-bolt text-orange-500 mr-4"></i>
                    Ações de Supervisão
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={handleGenerateSummary}
                      disabled={loadingSummary}
                      className="w-full p-6 rounded-3xl border-2 border-slate-50 hover:border-orange-200 hover:bg-orange-50 transition-all text-left flex items-center space-x-5 group active:scale-95"
                    >
                      <div className="bg-orange-100 text-orange-600 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                        <i className="fas fa-brain text-2xl"></i>
                      </div>
                      <div>
                        <span className="block text-sm font-black text-slate-900 uppercase tracking-widest">Análise IA</span>
                        <span className="text-[10px] text-slate-400 font-bold">Relatório Executivo</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => setView('reports')}
                      className="w-full p-6 rounded-3xl border-2 border-slate-50 hover:border-orange-200 hover:bg-orange-50 transition-all text-left flex items-center space-x-5 group active:scale-95"
                    >
                      <div className="bg-orange-100 text-orange-600 w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                        <i className="fas fa-file-powerpoint text-2xl"></i>
                      </div>
                      <div>
                        <span className="block text-sm font-black text-slate-900 uppercase tracking-widest">Painel de PPTX</span>
                        <span className="text-[10px] text-slate-400 font-bold">Gerar Apresentações</span>
                      </div>
                    </button>
                  </div>
                </div>

                {aiSummary && (
                  <div className="bg-slate-950 text-slate-200 p-10 rounded-[3rem] shadow-2xl animate-fade-in border border-white/5 relative group">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center space-x-3">
                         <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500"></div>
                         <h4 className="font-black text-white text-[10px] uppercase tracking-[0.3em]">Auditoria de Inteligência</h4>
                      </div>
                      <button onClick={() => setAiSummary('')} className="text-slate-600 hover:text-white transition-colors">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="prose prose-invert prose-sm">
                      <p className="text-[11px] leading-relaxed font-medium italic opacity-90 text-slate-400">{aiSummary}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="max-w-5xl mx-auto py-12">
             <MaintenanceForm 
                municipalities={AMAZONAS_MUNICIPALITIES}
                initialData={editingRecord}
                onCancel={() => { setView('dashboard'); setEditingRecord(undefined); }}
                onSave={handleSave}
                onDelete={editingRecord ? () => handleDelete(editingRecord.id) : undefined}
                onViewImage={(images, idx) => setViewerData({ images, index: idx })}
              />
          </div>
        )}

        {view === 'reports' && (
          <div className="max-w-6xl mx-auto space-y-12 py-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h2 className="text-5xl font-black text-slate-950 tracking-tighter">Central de Relatórios</h2>
                <p className="text-slate-400 font-black uppercase text-xs tracking-[0.4em]">Histórico Operacional Detalhado</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => handlePPTXExport(reportFilteredRecords)}
                  disabled={isExporting}
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center space-x-3 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-powerpoint'} text-lg`}></i>
                  <span>{isExporting ? 'Gerando...' : 'Exportar PPTX Filtrado'}</span>
                </button>
              </div>
            </header>
            
            {/* Advanced Filters Bar */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar Termo</label>
                <div className="relative">
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="text" 
                    placeholder="Técnico, título..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Município</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all"
                  value={reportMun}
                  onChange={(e) => setReportMun(e.target.value)}
                >
                  <option value="">Todos</option>
                  {AMAZONAS_MUNICIPALITIES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all"
                  value={reportService}
                  onChange={(e) => setReportService(e.target.value)}
                >
                  <option value="">Todos</option>
                  {Object.values(ServiceType).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Período Início</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Período Fim</label>
                <div className="flex gap-2">
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                  />
                  <button 
                    onClick={() => {
                      setReportSearch('');
                      setReportMun('');
                      setReportService('');
                      setReportStartDate('');
                      setReportEndDate('');
                    }}
                    className="bg-slate-100 text-slate-400 hover:text-red-500 p-3 rounded-2xl transition-colors"
                    title="Limpar Filtros"
                  >
                    <i className="fas fa-filter-circle-xmark"></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-950 p-12 text-white flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-3">
                  <h3 className="text-3xl font-black tracking-tight">Lista de Manutenções</h3>
                  <p className="text-slate-500 text-sm font-medium">Visualizando {reportFilteredRecords.length} atividades filtradas.</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Apresentação</p>
                    <p className="text-xs font-bold text-white/70">Formato Editável</p>
                  </div>
                  <div className="bg-red-600/20 text-red-500 w-14 h-14 rounded-2xl flex items-center justify-center border border-red-500/30">
                    <i className="fas fa-file-powerpoint text-xl"></i>
                  </div>
                </div>
              </div>

              <div className="p-12">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 font-black uppercase tracking-[0.2em] border-b border-slate-50">
                        <th className="pb-8 pr-6 text-[10px]">Data</th>
                        <th className="pb-8 pr-6 text-[10px]">Unidade</th>
                        <th className="pb-8 pr-6 text-[10px]">Técnico</th>
                        <th className="pb-8 pr-6 text-[10px]">Serviço</th>
                        <th className="pb-8 pr-6 text-[10px]">Status</th>
                        <th className="pb-8 pr-6 text-[10px] text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800 font-bold text-sm">
                      {reportFilteredRecords.length > 0 ? (
                        reportFilteredRecords.map(r => (
                          <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                            <td className="py-6 pr-6 text-[11px] text-slate-400">{r.date}</td>
                            <td className="py-6 pr-6 font-black">{AMAZONAS_MUNICIPALITIES.find(m => m.id === r.municipalityId)?.name}</td>
                            <td className="py-6 pr-6 text-xs text-slate-500 uppercase tracking-wider">{r.technician}</td>
                            <td className="py-6 pr-6 text-slate-600">{r.title}</td>
                            <td className="py-6 pr-6">
                              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${r.status === MaintenanceStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {r.status === MaintenanceStatus.COMPLETED ? 'OK' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-6 pr-6 text-right">
                               <div className="flex items-center justify-end space-x-3">
                                  <button 
                                    onClick={() => handlePPTXExport([r])}
                                    className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                    title="Exportar Individual (PPTX)"
                                  >
                                    <i className="fas fa-file-powerpoint"></i>
                                  </button>
                                  <button 
                                    onClick={() => { setEditingRecord(r); setView('form'); }}
                                    className="p-3 text-slate-300 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all"
                                    title="Editar"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(r.id)}
                                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                    title="Excluir"
                                  >
                                    <i className="fas fa-trash-alt"></i>
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                            Nenhum registro encontrado com os filtros aplicados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Image Viewer Modal */}
      {viewerData && (
        <ImageViewer 
          images={viewerData.images} 
          initialIndex={viewerData.index} 
          onClose={() => setViewerData(null)} 
        />
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-12 right-12 md:hidden z-50">
        <button 
          onClick={() => setView(view === 'dashboard' ? 'form' : 'dashboard')}
          className="bg-orange-600 text-white w-20 h-20 rounded-[2.5rem] shadow-2xl flex items-center justify-center text-3xl transition-transform active:scale-90 border-4 border-white/20"
        >
          <i className={`fas ${view === 'dashboard' ? 'fa-plus' : 'fa-th-large'}`}></i>
        </button>
      </div>
    </div>
  );
};

export default App;
