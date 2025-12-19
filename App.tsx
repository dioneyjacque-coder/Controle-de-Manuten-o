
import React, { useState, useMemo } from 'react';
import { MaintenanceRecord, MaintenanceStatus, Municipality, Region, MaintenanceNature, MaintenanceImage } from './types';
import { AMAZONAS_MUNICIPALITIES, INITIAL_RECORDS } from './constants';
import InteractiveMap from './components/InteractiveMap';
import MaintenanceForm from './components/MaintenanceForm';
import ImageViewer from './components/ImageViewer';
import { exportToExcel } from './utils/excelExport';
import { generateSupervisorSummary } from './services/geminiService';

const App: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>(INITIAL_RECORDS);
  const [view, setView] = useState<'dashboard' | 'form' | 'reports'>('dashboard');
  const [filterMun, setFilterMun] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<MaintenanceStatus>(MaintenanceStatus.PENDING);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // State for image viewer
  const [viewerData, setViewerData] = useState<{images: MaintenanceImage[], index: number} | null>(null);

  // General dashboard filtered records (follows the active tab)
  const filteredRecords = useMemo(() => {
    return records.filter(r => 
      (filterMun ? r.municipalityId === filterMun : true) && 
      r.status === activeTab
    );
  }, [records, filterMun, activeTab]);

  // Municipality specific records (shows both status)
  const municipalityRecords = useMemo(() => {
    if (!filterMun) return [];
    return records.filter(r => r.municipalityId === filterMun);
  }, [records, filterMun]);

  const handleSave = (recordData: Partial<MaintenanceRecord>) => {
    if (editingRecord) {
      setRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...recordData } as MaintenanceRecord : r));
    } else {
      const newRecord: MaintenanceRecord = {
        ...recordData,
        id: 'rec-' + Date.now(),
        technician: 'Usuário Conectado'
      } as MaintenanceRecord;
      setRecords(prev => [newRecord, ...prev]);
    }
    setView('dashboard');
    setEditingRecord(undefined);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta manutenção? Esta ação não pode ser desfeita.')) {
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

  const selectedMunicipality = AMAZONAS_MUNICIPALITIES.find(m => m.id === filterMun);

  // Component to render a record card
  const RecordCard: React.FC<{ record: MaintenanceRecord }> = ({ record }) => (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all relative group flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col space-y-1.5">
            <span className={`w-fit px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${record.status === MaintenanceStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {record.status === MaintenanceStatus.COMPLETED ? 'Concluída' : 'Pendente'}
            </span>
            <span className={`w-fit px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${record.nature === MaintenanceNature.EMERGENCY ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
            {record.nature}
            </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-lg">{record.date}</span>
        </div>
      </div>
      
      <h4 className="font-black text-slate-800 text-lg leading-tight mb-2">{record.title}</h4>
      
      <div className="flex items-center text-xs text-slate-400 font-bold mb-4">
         <i className="fas fa-map-marker-alt mr-2 text-orange-400"></i>
         {AMAZONAS_MUNICIPALITIES.find(m => m.id === record.municipalityId)?.name}
      </div>

      <div className="text-sm text-slate-500 font-mono bg-slate-50 p-4 rounded-2xl mb-4 line-clamp-3 border border-slate-100">
         {record.description}
      </div>

      {/* Per-image description highlights */}
      {record.images.length > 0 && (
        <div className="flex-grow space-y-3 mb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes das Etapas:</p>
          <div className="space-y-2">
            {record.images.slice(0, 2).map((img, i) => (
              <div key={img.id} className="flex items-start space-x-3 bg-white border border-slate-100 p-2 rounded-xl shadow-sm">
                <img 
                  src={img.data} 
                  onClick={() => setViewerData({ images: record.images, index: i })}
                  className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:opacity-80 shrink-0" 
                  alt="preview"
                />
                <p className="text-[11px] font-medium text-slate-600 leading-tight italic line-clamp-2">
                  {img.description || "Sem descrição individual."}
                </p>
              </div>
            ))}
            {record.images.length > 2 && (
              <p className="text-[10px] text-orange-600 font-bold italic ml-2">+ {record.images.length - 2} outras evidências detalhadas</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-5 border-t border-slate-50">
        <div className="flex -space-x-2">
          {record.images.length > 0 ? (
            record.images.slice(0, 3).map((img, i) => (
              <img 
                key={img.id} 
                src={img.data} 
                onClick={() => setViewerData({ images: record.images, index: i })}
                className="w-10 h-10 rounded-xl border-2 border-white object-cover shadow-md cursor-pointer hover:scale-110 transition-transform" 
                alt="maint" 
              />
            ))
          ) : (
            <div className="w-10 h-10 rounded-xl border-2 border-white bg-slate-100 flex items-center justify-center">
              <i className="fas fa-image text-slate-300 text-xs"></i>
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => handleDelete(record.id)}
            className="bg-red-50 text-red-600 p-2.5 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white transition-all shadow-sm"
            title="Excluir"
          >
            <i className="fas fa-trash"></i>
          </button>
          <button 
            onClick={() => { setEditingRecord(record); setView('form'); }}
            className="bg-orange-50 text-orange-600 px-4 py-2.5 rounded-xl text-xs font-black hover:bg-orange-600 hover:text-white transition-all flex items-center shadow-sm"
          >
            <i className="fas fa-edit mr-2"></i> Abrir
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar / Navigation */}
      <nav className="w-full md:w-64 bg-slate-900 text-white p-6 flex flex-col shrink-0">
        <div className="flex items-center space-x-3 mb-10">
          <div className="bg-orange-500 p-2 rounded-lg">
            <i className="fas fa-bolt text-xl"></i>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Equipe HV Manut.</h1>
        </div>

        <div className="space-y-2 flex-grow">
          <button 
            onClick={() => { setView('dashboard'); setFilterMun(null); }}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center space-x-3 ${view === 'dashboard' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <i className="fas fa-home"></i>
            <span>Painel Geral</span>
          </button>
          <button 
            onClick={() => { setEditingRecord(undefined); setView('form'); }}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center space-x-3 ${view === 'form' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <i className="fas fa-plus-circle"></i>
            <span>Nova Manutenção</span>
          </button>
          <button 
            onClick={() => setView('reports')}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center space-x-3 ${view === 'reports' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <i className="fas fa-file-excel"></i>
            <span>Relatórios</span>
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800 text-xs text-slate-500">
          <p>Operando em: Amazonas, BR</p>
          <p>© 2024 Equipe HV Manuteções</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 overflow-y-auto">
        {view === 'dashboard' && (
          <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900">Monitoramento HV</h2>
                <p className="text-slate-500 font-medium mt-1">Gestão regional Amazonas</p>
              </div>
              <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
                <button 
                  onClick={() => setActiveTab(MaintenanceStatus.PENDING)}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === MaintenanceStatus.PENDING ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Pendentes ({records.filter(r => r.status === MaintenanceStatus.PENDING).length})
                </button>
                <button 
                  onClick={() => setActiveTab(MaintenanceStatus.COMPLETED)}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === MaintenanceStatus.COMPLETED ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Realizadas ({records.filter(r => r.status === MaintenanceStatus.COMPLETED).length})
                </button>
              </div>
            </header>

            <div className="w-full">
              <InteractiveMap 
                onSelectMunicipality={(id) => setFilterMun(id === filterMun ? null : id)} 
                selectedMunId={filterMun} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 flex items-center">
                      <i className="fas fa-list-ul mr-3 text-orange-500"></i>
                      {filterMun ? `Atividades em ${selectedMunicipality?.name}` : 'Registros Técnicos Recentes'}
                    </h3>
                    {filterMun && (
                      <button 
                        onClick={() => setFilterMun(null)} 
                        className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors"
                      >
                        Ver Todas
                      </button>
                    )}
                  </div>

                  {filterMun ? (
                    <div className="space-y-10">
                      <section>
                        <h4 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] mb-4 flex items-center">
                           <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                           Pendentes ({municipalityRecords.filter(r => r.status === MaintenanceStatus.PENDING).length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {municipalityRecords.filter(r => r.status === MaintenanceStatus.PENDING).map(record => (
                            <RecordCard key={record.id} record={record} />
                          ))}
                          {municipalityRecords.filter(r => r.status === MaintenanceStatus.PENDING).length === 0 && (
                            <div className="col-span-full py-10 text-center bg-slate-100/50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">Nenhuma manutenção pendente</div>
                          )}
                        </div>
                      </section>
                      <section>
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                           Realizadas ({municipalityRecords.filter(r => r.status === MaintenanceStatus.COMPLETED).length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {municipalityRecords.filter(r => r.status === MaintenanceStatus.COMPLETED).map(record => (
                            <RecordCard key={record.id} record={record} />
                          ))}
                          {municipalityRecords.filter(r => r.status === MaintenanceStatus.COMPLETED).length === 0 && (
                            <div className="col-span-full py-10 text-center bg-slate-100/50 rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-bold">Nenhuma manutenção realizada</div>
                          )}
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredRecords.length > 0 ? (
                        filteredRecords.map(record => (
                          <RecordCard key={record.id} record={record} />
                        ))
                      ) : (
                        <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                             <i className="fas fa-clipboard-list text-3xl text-slate-300"></i>
                          </div>
                          <h4 className="text-slate-500 font-bold">Sem atividades filtradas</h4>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-orange-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-orange-200 relative overflow-hidden">
                  <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                  <h4 className="font-black mb-6 text-orange-200 text-xs uppercase tracking-[0.2em]">Status Operacional</h4>
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-4xl font-black">{records.length}</span>
                        <span className="text-sm block text-orange-200 font-bold">Total de Atividades</span>
                      </div>
                      <div className="text-right">
                         <span className="text-xl font-black text-white">{records.filter(r => r.status === MaintenanceStatus.COMPLETED).length}</span>
                         <span className="text-[10px] block text-orange-200 font-bold">Concluídos</span>
                      </div>
                    </div>
                    <div className="w-full bg-orange-800/50 rounded-full h-3">
                      <div className="bg-white h-3 rounded-full transition-all duration-1000" style={{ width: `${records.length > 0 ? (records.filter(r => r.status === MaintenanceStatus.COMPLETED).length / records.length) * 100 : 0}%` }}></div>
                    </div>
                    <div className="bg-orange-700/50 p-4 rounded-2xl border border-orange-500/30">
                        <p className="text-[11px] font-medium leading-relaxed italic opacity-90">Acompanhamento técnico para a rede de alta voltagem do Amazonas.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <h4 className="font-black text-slate-800 mb-6 flex items-center text-lg">
                    <i className="fas fa-rocket text-orange-500 mr-3"></i>
                    Ações Rápidas
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={handleGenerateSummary}
                      disabled={loadingSummary}
                      className="w-full p-5 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all text-left flex items-center space-x-4 group"
                    >
                      <div className="bg-orange-100 text-orange-600 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
                        <i className="fas fa-brain text-xl"></i>
                      </div>
                      <div>
                        <span className="block text-sm font-black text-slate-700">Resumo Inteligente</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Processamento IA</span>
                      </div>
                    </button>
                    <button 
                      onClick={() => exportToExcel(records, AMAZONAS_MUNICIPALITIES)}
                      className="w-full p-5 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left flex items-center space-x-4 group"
                    >
                      <div className="bg-emerald-100 text-emerald-600 w-12 h-12 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                        <i className="fas fa-file-csv text-xl"></i>
                      </div>
                      <div>
                        <span className="block text-sm font-black text-slate-700">Relatório Excel</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Exportação Direta</span>
                      </div>
                    </button>
                  </div>
                </div>

                {aiSummary && (
                  <div className="bg-slate-900 text-slate-200 p-8 rounded-[2.5rem] shadow-2xl animate-fade-in border border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center space-x-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                         <h4 className="font-black text-white text-xs uppercase tracking-widest">IA Analisador Técnico</h4>
                      </div>
                      <button onClick={() => setAiSummary('')} className="text-slate-500 hover:text-white transition-colors">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="prose prose-invert prose-sm">
                      <p className="text-xs leading-relaxed font-medium italic opacity-90">{aiSummary}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="max-w-4xl mx-auto py-8">
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
          <div className="max-w-5xl mx-auto space-y-10 py-8">
            <header>
              <h2 className="text-4xl font-black text-slate-900">Arquivo de Relatórios</h2>
              <p className="text-slate-500 font-bold mt-2 uppercase text-xs tracking-widest">Documentação consolidada para auditoria técnica</p>
            </header>
            
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-900 p-10 text-white flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <h3 className="text-2xl font-black">Consolidação Operacional</h3>
                  <p className="text-slate-400 text-sm mt-2">Dados processados de {records.length} atividades de alta voltagem em campo.</p>
                </div>
                <button 
                  onClick={() => exportToExcel(records, AMAZONAS_MUNICIPALITIES)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black flex items-center space-x-3 transition-all hover:scale-105 shadow-xl"
                >
                  <i className="fas fa-cloud-download-alt text-xl"></i>
                  <span>Baixar Planilha Técnica</span>
                </button>
              </div>

              <div className="p-10">
                <h4 className="font-black text-slate-800 mb-8 border-b border-slate-50 pb-6 text-lg">Histórico de Registros</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-50">
                        <th className="pb-6 pr-4 text-[10px]">Data</th>
                        <th className="pb-6 pr-4 text-[10px]">Município</th>
                        <th className="pb-6 pr-4 text-[10px]">Tipo Serviço</th>
                        <th className="pb-6 pr-4 text-[10px]">Status</th>
                        <th className="pb-6 pr-4 text-[10px] text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600 font-medium">
                      {records.slice(0, 15).map(r => (
                        <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                          <td className="py-5 pr-4 text-xs font-bold">{r.date}</td>
                          <td className="py-5 pr-4 font-black text-slate-800">{AMAZONAS_MUNICIPALITIES.find(m => m.id === r.municipalityId)?.name}</td>
                          <td className="py-5 pr-4 text-xs">{r.title}</td>
                          <td className="py-5 pr-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${r.status === MaintenanceStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {r.status === MaintenanceStatus.COMPLETED ? 'Finalizado' : 'Pendente'}
                            </span>
                          </td>
                          <td className="py-5 pr-4 text-right">
                             <div className="flex items-center justify-end space-x-2">
                                <button 
                                  onClick={() => { setEditingRecord(r); setView('form'); }}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                  onClick={() => handleDelete(r.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
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
      <div className="fixed bottom-8 right-8 md:hidden z-50">
        <button 
          onClick={() => setView(view === 'dashboard' ? 'form' : 'dashboard')}
          className="bg-orange-600 text-white w-16 h-16 rounded-[2rem] shadow-2xl flex items-center justify-center text-2xl transition-transform active:scale-90 border-4 border-white/20"
        >
          <i className={`fas ${view === 'dashboard' ? 'fa-plus' : 'fa-th-large'}`}></i>
        </button>
      </div>
    </div>
  );
};

export default App;
