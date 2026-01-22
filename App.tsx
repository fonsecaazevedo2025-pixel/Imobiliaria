
import React, { useState, useEffect, useMemo } from 'react';
import { Layout, AppTab } from './components/Layout';
import { CompanyForm } from './components/CompanyForm';
import { InteractiveMap } from './components/InteractiveMap';
import { ReportsView } from './components/ReportsView';
import { CompanyDetailsModal } from './components/CompanyDetailsModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { Company, DashboardStats } from './types';
import { getAIInsights } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Chave do localStorage - mude aqui para criar uma base de dados totalmente nova/separada
const STORAGE_KEY = 'partner_hub_v2_cos';

const ShareLinkModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">🌐</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Link de Cadastro Público</h3>
          <p className="text-sm text-slate-500 mb-6">Compartilhe este link com novos parceiros para que eles mesmos realizem o credenciamento.</p>
          
          <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32 mx-auto mb-6 p-2 border-2 border-slate-100 rounded-2xl bg-white shadow-sm" />
          
          <div className="flex gap-2 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 mb-6">
            <span className="text-[10px] font-mono truncate flex-1 text-slate-500 select-all">{url}</span>
            <button 
              onClick={handleCopy} 
              className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-bold ${copied ? 'bg-green-500 text-white' : 'bg-white border text-blue-600 hover:bg-blue-50'}`}
            >
              {copied ? 'Copiado!' : '📋 Copiar'}
            </button>
          </div>
          
          <button onClick={onClose} className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all active:scale-95 shadow-lg">Fechar</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>();
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [partnershipManagerFilter, setPartnershipManagerFilter] = useState('');
  const [hiringManagerFilter, setHiringManagerFilter] = useState('');

  const [isPublicMode, setIsPublicMode] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minBrokers, setMinBrokers] = useState<string>('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const publicRegistrationUrl = useMemo(() => `${window.location.origin}${window.location.pathname}?mode=register`, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('mode') === 'register') setIsPublicMode(true);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCompanies(JSON.parse(saved));
    } else {
      const mock: Company[] = [{
        id: '1', name: 'Horizonte Imóveis', cnpj: '12.345.678/0001-99', docType: 'CNPJ',
        cep: '01310-100', address: 'Av. Paulista, 1000 - Bela Vista - SP',
        location: { lat: -23.5614, lng: -46.6559 }, responsible: 'Maria Silva',
        partnershipManager: 'Ana Paula Santos',
        hiringManager: 'Ricardo Mendes', email: 'contato@horizonte.com', phone: '(11) 98888-7777',
        registrationDate: '2023-10-15', brokerCount: 15, commissionRate: 5, status: 'Ativo',
        contactHistory: [{ id: 'h1', date: '2024-03-20', type: 'Reunião', summary: 'Definição de novas metas.' }]
      }];
      setCompanies(mock);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mock));
    }
  }, []);

  useEffect(() => {
    if (companies.length >= 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  const stats: DashboardStats = useMemo(() => {
    const totalBrokers = companies.reduce((acc, c) => acc + c.brokerCount, 0);
    return {
      totalCompanies: companies.length,
      totalBrokers,
      avgBrokers: companies.length > 0 ? Math.round(totalBrokers / companies.length) : 0,
      activePercentage: companies.length > 0 ? Math.round((companies.filter(c => c.status === 'Ativo').length / companies.length) * 100) : 0
    };
  }, [companies]);

  const upcomingContacts = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return companies.filter(c => {
      if (!c.nextContactDate) return false;
      const d = new Date(c.nextContactDate);
      return d >= today && d <= nextWeek;
    }).sort((a,b) => new Date(a.nextContactDate!).getTime() - new Date(b.nextContactDate!).getTime());
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.cnpj.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesMin = minBrokers === '' || c.brokerCount >= parseInt(minBrokers);
      
      const matchesPartnershipManager = partnershipManagerFilter === '' || 
                                       c.partnershipManager?.toLowerCase().includes(partnershipManagerFilter.toLowerCase());
      
      const matchesHiringManager = hiringManagerFilter === '' || 
                                  c.hiringManager?.toLowerCase().includes(hiringManagerFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesMin && matchesPartnershipManager && matchesHiringManager;
    });
  }, [companies, searchTerm, statusFilter, minBrokers, partnershipManagerFilter, hiringManagerFilter]);

  const handleSaveCompany = (data: Omit<Company, 'id' | 'registrationDate'>) => {
    if (editingCompany) {
      setCompanies(companies.map(c => c.id === editingCompany.id ? { ...c, ...data } : c));
    } else {
      setCompanies([{ ...data, id: Math.random().toString(36).substr(2, 9), registrationDate: new Date().toISOString().split('T')[0] }, ...companies]);
    }
    if (isPublicMode) setRegistrationSuccess(true);
    else { setShowForm(false); setEditingCompany(undefined); }
  };

  const handleEdit = (c: Company) => { setEditingCompany(c); setShowForm(true); setActiveTab('companies'); };

  const handleDuplicate = (c: Company) => {
    const duplicated: Company = {
      ...c,
      id: Math.random().toString(36).substr(2, 9),
      name: `${c.name} (Cópia)`,
      registrationDate: new Date().toISOString().split('T')[0],
      contactHistory: [] // Histórico não é duplicado por segurança
    };
    setCompanies([duplicated, ...companies]);
    alert(`Parceiro "${c.name}" duplicado com sucesso!`);
  };

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    const res = await getAIInsights(companies);
    setAiInsights(res);
    setLoadingInsights(false);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCompanies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCompanies.map(c => c.id)));
    }
  };

  const handleBulkStatusChange = (newStatus: 'Ativo' | 'Inativo') => {
    if (selectedIds.size === 0) return;
    setCompanies(companies.map(c => 
      selectedIds.has(c.id) ? { ...c, status: newStatus } : c
    ));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} parceiros selecionados?`)) {
      setCompanies(companies.filter(c => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
    }
  };

  if (isPublicMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {registrationSuccess ? (
          <div className="bg-white p-12 rounded-3xl shadow-2xl text-center max-w-md border animate-fadeIn">
            <div className="text-5xl mb-6">✅</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sucesso!</h2>
            <p className="text-slate-500 mb-8">Seus dados foram enviados. Nossa equipe analisará e entrará em contato em breve.</p>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100">Novo Cadastro</button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <header className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-800">PartnerHub</h1>
              <p className="text-slate-500 font-medium mt-1">Portal de Credenciamento Externo</p>
            </header>
            <CompanyForm onSave={handleSaveCompany} onCancel={() => {}} isPublic={true} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} companies={companies} upcomingContacts={upcomingContacts}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Visão Geral da Rede</h3>
              <p className="text-sm text-slate-500">Métricas consolidadas de desempenho e relacionamento.</p>
            </div>
            <button 
              onClick={() => setShowShareModal(true)} 
              className="group flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 border-2 border-transparent hover:border-blue-300"
            >
              <span className="text-lg group-hover:rotate-12 transition-transform">🌐</span>
              Gerar Link de Cadastro Público
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Parceiros</p>
              <h4 className="text-3xl font-black text-slate-800 mt-2">{stats.totalCompanies}</h4>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Equipe Total</p>
              <h4 className="text-3xl font-black text-slate-800 mt-2">{stats.totalBrokers} <span className="text-xs text-slate-400 font-medium">corretores</span></h4>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Atividade</p>
              <h4 className="text-3xl font-black text-green-600 mt-2">{stats.activePercentage}%</h4>
            </div>
            <div className="bg-blue-600 p-6 rounded-2xl shadow-xl text-white">
              <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Ticket Médio</p>
              <h4 className="text-2xl font-bold mt-2">{stats.avgBrokers} <span className="text-xs font-medium">profissionais/empresa</span></h4>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
               <h4 className="text-lg font-bold text-slate-800 mb-6">Volume de Equipe por Parceiro</h4>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={companies.slice(0, 8)}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                     <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                     <Bar dataKey="brokerCount" radius={[6, 6, 0, 0]} fill="#3b82f6" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
            <div className="bg-slate-900 rounded-2xl p-6 shadow-xl text-white">
               <div className="flex justify-between items-center mb-6">
                 <h4 className="font-bold">IA Strategy</h4>
                 <button onClick={fetchAIInsights} disabled={loadingInsights} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-all">{loadingInsights ? '...' : 'Analisar'}</button>
               </div>
               <div className="text-xs leading-relaxed text-slate-400 italic">
                 {aiInsights || "Use a IA para identificar empresas com baixa atividade ou oportunidades de aumento de comissão."}
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'companies' && (
        <div className="space-y-6 animate-fadeIn">
          {!showForm ? (
            <>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 no-print">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block px-1">Busca Geral (Nome/CNPJ)</label>
                    <input type="text" placeholder="Ex: Horizonte Imóveis..." className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="relative flex-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block px-1">Gestor da Parceria (Externo)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🤝</span>
                      <input type="text" placeholder="Nome do gestor..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={partnershipManagerFilter} onChange={e => setPartnershipManagerFilter(e.target.value)} />
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block px-1">Gestor da Conta (Hub)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🆔</span>
                      <input type="text" placeholder="Nome do consultor..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={hiringManagerFilter} onChange={e => setHiringManagerFilter(e.target.value)} />
                    </div>
                  </div>
                  <div className="md:w-auto flex items-end">
                    <button onClick={() => setShowForm(true)} className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">Novo Parceiro</button>
                  </div>
                </div>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center justify-between px-6 py-4 bg-blue-600 text-white rounded-2xl shadow-xl animate-slideDown no-print">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold">{selectedIds.size} itens selecionados</span>
                    <button onClick={() => setSelectedIds(new Set())} className="text-xs bg-white/20 px-3 py-1 rounded-lg hover:bg-white/30 transition-all">Desmarcar Todos</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleBulkStatusChange('Ativo')} className="px-4 py-2 bg-white text-blue-600 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 transition-all">Ativar Selecionados</button>
                    <button onClick={() => handleBulkStatusChange('Inativo')} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-slate-900 transition-all">Inativar Selecionados</button>
                    <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-red-600 transition-all">Excluir</button>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4 w-10">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                          checked={selectedIds.size > 0 && selectedIds.size === filteredCompanies.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-6 py-4">Empresa</th>
                      <th className="px-6 py-4">Gestores</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Corretores</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCompanies.map(c => (
                      <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(c.id) ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{c.cnpj}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                              <span className="opacity-60">P:</span> {c.partnershipManager || 'N/D'}
                            </p>
                            <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                              <span className="opacity-60">H:</span> {c.hiringManager}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${c.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-600">{c.brokerCount}</td>
                        <td className="px-6 py-4 text-right space-x-1">
                          <button onClick={() => setSelectedCompanyForDetails(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalhes">👁️</button>
                          <button onClick={() => handleEdit(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">✏️</button>
                          <button onClick={() => handleDuplicate(c)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Duplicar Parceiro">📑</button>
                          <button onClick={() => setCompanyToDelete(c)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCompanies.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-xl mb-2">🔍</p>
                    <p className="text-sm font-medium">Nenhum parceiro encontrado com os filtros aplicados.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <CompanyForm onSave={handleSaveCompany} onCancel={() => { setShowForm(false); setEditingCompany(undefined); }} initialData={editingCompany} />
          )}
        </div>
      )}

      {activeTab === 'map' && <InteractiveMap companies={companies} />}
      {activeTab === 'reports' && <ReportsView companies={companies} onEdit={handleEdit} onDelete={(id) => setCompanyToDelete(companies.find(c => c.id === id) || null)} onView={setSelectedCompanyForDetails} onDuplicate={handleDuplicate} />}
      
      {selectedCompanyForDetails && <CompanyDetailsModal company={selectedCompanyForDetails} onClose={() => setSelectedCompanyForDetails(null)} />}
      {companyToDelete && <DeleteConfirmationModal company={companyToDelete} onConfirm={() => { setCompanies(companies.filter(x => x.id !== companyToDelete.id)); setCompanyToDelete(null); }} onCancel={() => setCompanyToDelete(null)} />}
      {showShareModal && <ShareLinkModal url={publicRegistrationUrl} onClose={() => setShowShareModal(false)} />}
    </Layout>
  );
};

export default App;
