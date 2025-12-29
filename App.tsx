
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
  const [reportSearch, setReportSearch] = useState('');
  const [reportMun, setReportMun] = useState('');
  const [viewerData, setViewerData] = useState<{images: MaintenanceImage[], index: number} | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter(r => (filterMun ? r.municipalityId === filterMun : true) && r.status === activeTab);
  }, [records, filterMun, activeTab]);

  const reportFilteredRecords = useMemo(() => {
    return records.filter(r => {
      const search = reportSearch.toLowerCase();
      return (search === '' || r.technician.toLowerCase().includes(search) || r.title.toLowerCase().includes(search)) && (reportMun === '' || r.municipalityId === reportMun);
    });
  }, [records, reportSearch, reportMun]);

  const handleSave = (recordData: Partial<MaintenanceRecord>) => {
    if (editingRecord) {
      setRecords(prev => prev.map(r => r.id === editingRecord.id ? { ...r, ...recordData } as MaintenanceRecord : r));
    } else {
      setRecords(prev => [{ ...recordData, id: 'rec-' + Date.now() } as MaintenanceRecord, ...prev]);
    }
    setView('dashboard');
    setEditingRecord(undefined);
  };

  const handleImportEditable = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pptx';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const newRecord: MaintenanceRecord = {
          id: 'imp-' + Date.now(),
          municipalityId: 'm1',
          title: file.name.replace('.pptx', ''),
          nature: MaintenanceNature.PREVENTIVE_PROGRAMMED,
          description: `IMPORTADO: ${file.name}. Por favor, popule as evidências abaixo para gerar o novo PPTX padrão Aggreko.`,
          date: new Date().toISOString().split('T')[0],
          status: MaintenanceStatus.COMPLETED,
          stages: [],
          technician: 'Importador',
          isLegacy: true
        };
        setEditingRecord(newRecord);
        setView('form');
      }
    };
    input.click();
  };

  const handlePPTXExport = async (recs: MaintenanceRecord[]) => {
    setIsExporting(true);
    try {
      await exportToPPTX(recs, AMAZONAS_MUNICIPALITIES);
    } catch (e) {
      alert("Erro ao exportar.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <nav className="w-full md:w-64 bg-slate-950 text-white p-8 flex flex-col shrink-0">
        <div className="flex items-center space-x-4 mb-12">
          <div className="bg-orange-600 p-3 rounded-2xl shadow-lg shadow-orange-600/20"><i className="fas fa-bolt text-xl"></i></div>
          <h1 className="text-xl font-black tracking-tighter">EQUIPE HV</h1>
        </div>
        <div className="space-y-4 flex-grow">
          <button onClick={() => { setView('dashboard'); setFilterMun(null); }} className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center space-x-4 ${view === 'dashboard' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}><i className="fas fa-th-large"></i><span className="font-bold text-sm">Dashboard</span></button>
          <button onClick={() => { setEditingRecord(undefined); setView('form'); }} className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center space-x-4 ${view === 'form' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}><i className="fas fa-plus-circle"></i><span className="font-bold text-sm">Novo Relatório</span></button>
          <button onClick={() => setView('reports')} className={`w-full text-left px-5 py-4 rounded-2xl transition-all flex items-center space-x-4 ${view === 'reports' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}><i className="fas fa-file-export"></i><span className="font-bold text-sm">Central PPTX</span></button>
        </div>
      </nav>

      <main className="flex-grow p-4 md:p-10 lg:p-16 overflow-y-auto">
        {view === 'dashboard' && (
          <div className="max-w-7xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-2"><h2 className="text-5xl font-black text-slate-950 tracking-tighter">Base Manaus</h2><p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aggreko Operações Amazonas</p></div>
              <div className="flex bg-white p-2 rounded-2xl shadow-sm border"><button onClick={() => setActiveTab(MaintenanceStatus.PENDING)} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === MaintenanceStatus.PENDING ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>PENDENTES</button><button onClick={() => setActiveTab(MaintenanceStatus.COMPLETED)} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === MaintenanceStatus.COMPLETED ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>CONCLUÍDAS</button></div>
            </header>
            <InteractiveMap onSelectMunicipality={(id) => setFilterMun(id === filterMun ? null : id)} selectedMunId={filterMun} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRecords.map(r => (
                <div key={r.id} className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col h-full hover:shadow-xl transition-all">
                  <div className="flex justify-between items-start mb-6"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${r.status === MaintenanceStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{r.status === MaintenanceStatus.COMPLETED ? 'Concluída' : 'Pendente'}</span><span className="text-[10px] font-black text-slate-400">{r.date}</span></div>
                  <h4 className="text-xl font-black text-slate-900 mb-2">{r.title}</h4>
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-6"><i className="fas fa-map-marker-alt text-orange-600 mr-2"></i>{AMAZONAS_MUNICIPALITIES.find(m => m.id === r.municipalityId)?.name}</p>
                  <div className="flex-grow space-y-3 mb-8">{r.stages.map(s => <div key={s.id} className="text-[10px] font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border flex items-center"><div className="w-1.5 h-1.5 bg-orange-600 rounded-full mr-3" />{s.name}</div>)}</div>
                  <div className="flex justify-between items-center pt-6 border-t"><button onClick={() => { setEditingRecord(r); setView('form'); }} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg">Editar</button><button onClick={() => handlePPTXExport([r])} className="text-slate-300 hover:text-red-600 text-lg transition-colors"><i className="fas fa-file-powerpoint"></i></button></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'form' && <MaintenanceForm municipalities={AMAZONAS_MUNICIPALITIES} initialData={editingRecord} onCancel={() => setView('dashboard')} onSave={handleSave} onViewImage={(imgs, idx) => setViewerData({ images: imgs, index: idx })} />}

        {view === 'reports' && (
          <div className="max-w-6xl mx-auto space-y-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2"><h2 className="text-5xl font-black text-slate-950 tracking-tighter">Central PPTX</h2><p className="text-slate-400 font-black uppercase text-xs tracking-widest">Gestão de Relatórios Aggreko</p></div>
              <div className="flex space-x-4">
                <button onClick={handleImportEditable} className="bg-slate-950 text-white px-8 py-4 rounded-3xl font-black uppercase text-[10px] shadow-xl"><i className="fas fa-file-import mr-2"></i>Importar PPTX Antigo</button>
                <button onClick={() => handlePPTXExport(reportFilteredRecords)} disabled={isExporting} className="bg-red-600 text-white px-8 py-4 rounded-3xl font-black uppercase text-[10px] shadow-xl active:scale-95"><i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-powerpoint'} mr-2`}></i>Exportar Selecionados</button>
              </div>
            </header>
            <div className="bg-white rounded-[3rem] shadow-2xl border p-12 overflow-hidden">
               <table className="w-full text-left"><thead className="border-b"><tr className="text-slate-400 font-black uppercase text-[10px]"><th className="pb-8">Data</th><th className="pb-8">Unidade</th><th className="pb-8">Serviço</th><th className="pb-8 text-right">Ações</th></tr></thead><tbody className="text-slate-800 font-bold text-sm">{reportFilteredRecords.map(r => <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors"><td className="py-6 text-slate-400">{r.date}</td><td className="py-6 font-black">{AMAZONAS_MUNICIPALITIES.find(m => m.id === r.municipalityId)?.name}</td><td className="py-6">{r.title}</td><td className="py-6 text-right space-x-4"><button onClick={() => { setEditingRecord(r); setView('form'); }} className="text-slate-300 hover:text-orange-600"><i className="fas fa-edit"></i></button><button onClick={() => handlePPTXExport([r])} className="text-slate-300 hover:text-red-600"><i className="fas fa-file-powerpoint"></i></button></td></tr>)}</tbody></table>
            </div>
          </div>
        )}
      </main>
      {viewerData && <ImageViewer images={viewerData.images} initialIndex={viewerData.index} onClose={() => setViewerData(null)} />}
    </div>
  );
};

export default App;
