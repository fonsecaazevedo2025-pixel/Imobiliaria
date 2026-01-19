
import React, { useState, useRef, useEffect } from 'react';
import { Company, ContactHistoryEntry } from '../types';

interface CompanyFormProps {
  onSave: (company: Omit<Company, 'id' | 'registrationDate'>) => void;
  onCancel: () => void;
  initialData?: Company;
  isPublic?: boolean;
}

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CompanyForm: React.FC<CompanyFormProps> = ({ onSave, onCancel, initialData, isPublic = false }) => {
  const numberInputRef = useRef<HTMLInputElement>(null);

  const validateCNPJ = (cnpj: string): boolean => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0, pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    size++; numbers = cnpj.substring(0, size);
    sum = 0; pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === parseInt(digits.charAt(1));
  };

  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let sum = 0, remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf.substring(10, 11));
  };

  const validateEmail = (email: string): boolean => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
  };

  const validateURL = (url: string): boolean => {
    if (!url) return true;
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const maskPhone = (v: string) => {
    let r = v.replace(/\D/g, "");
    if (r.length > 11) r = r.substring(0, 11);
    
    if (r.length === 0) return "";
    if (r.length <= 2) return `(${r}`;
    if (r.length <= 6) return `(${r.substring(0, 2)}) ${r.substring(2)}`;
    
    // Se tiver 11 dígitos, é celular: (XX) 9XXXX-XXXX
    // Se tiver 10 ou menos (enquanto digita), assume fixo até o 11º: (XX) XXXX-XXXX
    if (r.length <= 10) {
      return `(${r.substring(0, 2)}) ${r.substring(2, 6)}-${r.substring(6)}`;
    } else {
      return `(${r.substring(0, 2)}) ${r.substring(2, 7)}-${r.substring(7)}`;
    }
  };

  const maskCEP = (v: string) => v.replace(/\D/g, "").substring(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
  const maskCNPJ = (v: string) => v.replace(/\D/g, "").substring(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  const maskCPF = (v: string) => v.replace(/\D/g, "").substring(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");

  const [docType, setDocType] = useState<'CNPJ' | 'CPF' | 'CRECI'>(initialData?.docType || 'CNPJ');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cnpj: initialData?.cnpj || '',
    creci: initialData?.creci || '',
    creciUF: initialData?.creciUF || '',
    website: initialData?.website || '',
    cep: initialData?.cep || '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
    email: initialData?.email || '',
    phone: initialData?.phone ? maskPhone(initialData.phone) : '',
    responsible: initialData?.responsible || '',
    partnershipManager: initialData?.partnershipManager || '',
    hiringManager: initialData?.hiringManager || (isPublic ? 'Cadastro Público' : ''),
    brokerCount: initialData?.brokerCount || 0,
    commissionRate: initialData?.commissionRate || 5,
    status: initialData?.status || 'Ativo',
    notes: initialData?.notes || '',
    contactHistory: initialData?.contactHistory || [] as ContactHistoryEntry[],
    location: initialData?.location || { lat: -23.5505, lng: -46.6333 },
  });

  const [newHistory, setNewHistory] = useState<Omit<ContactHistoryEntry, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Telefone',
    summary: '',
    notes: '',
    nextContactDate: '',
  });

  const [isSearching, setIsSearching] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData?.address) {
      const parts = initialData.address.split(' - ');
      const main = parts[0]?.split(', ') || [];
      setFormData(prev => ({
        ...prev,
        street: main[0] || '',
        number: main[1] || '',
        neighborhood: parts[1] || '',
        city: parts[2]?.split('/')[0] || '',
        state: parts[2]?.split('/')[1] || ''
      }));
    }
  }, [initialData]);

  useEffect(() => {
    let isValid = false;
    if (docType === 'CNPJ') isValid = validateCNPJ(formData.cnpj);
    else if (docType === 'CPF') isValid = validateCPF(formData.cnpj);
    else isValid = formData.creci.trim().length >= 2 && formData.creciUF !== '';
    
    setDocSuccess(isValid);
  }, [formData.cnpj, formData.creci, formData.creciUF, docType]);

  const handleCNPJLookup = async (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14 || !validateCNPJ(clean)) return;
    setIsSearching(true);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (resp.ok) {
        const data = await resp.json();
        setFormData(prev => ({
          ...prev,
          name: data.razao_social || data.nome_fantasia || prev.name,
          cep: maskCEP(data.cep || ''),
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.municipio || '',
          state: data.uf || '',
          number: data.numero || '',
        }));
      }
    } catch (e) { console.error(e); } finally { setIsSearching(false); }
  };

  const handleCEPLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setCepError(clean.length > 0 ? "CEP incompleto" : null);
      return;
    }
    setIsCepLoading(true);
    setCepError(null);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await resp.json();
      if (data.erro) {
        setCepError("CEP não encontrado");
      } else {
        setFormData(prev => ({ 
          ...prev, 
          street: data.logradouro || '', 
          neighborhood: data.bairro || '', 
          city: data.localidade || '', 
          state: data.uf || '' 
        }));
        setTimeout(() => numberInputRef.current?.focus(), 100);
      }
    } catch (e) {
      console.error(e);
      setCepError("Falha na conexão com ViaCEP");
    } finally {
      setIsCepLoading(false);
    }
  };

  const onDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (docType === 'CNPJ') {
      const masked = maskCNPJ(val);
      setFormData({ ...formData, cnpj: masked });
      if (masked.replace(/\D/g, '').length === 14) handleCNPJLookup(masked);
    } else if (docType === 'CPF') {
      const masked = maskCPF(val);
      setFormData({ ...formData, cnpj: masked });
    } else {
      setFormData({ ...formData, creci: val.toUpperCase() });
    }
  };

  const handleURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, website: val }));
    if (val && !validateURL(val)) setUrlError('URL inválida');
    else setUrlError(null);
  };

  const handleAddHistory = () => {
    if (!newHistory.summary) return;
    const entry: ContactHistoryEntry = { 
      ...newHistory, 
      id: Math.random().toString(36).substr(2, 9) 
    };
    setFormData(prev => ({ 
      ...prev, 
      contactHistory: [entry, ...prev.contactHistory] 
    }));
    setNewHistory({ 
      date: new Date().toISOString().split('T')[0], 
      type: 'Telefone', 
      summary: '', 
      notes: '',
      nextContactDate: '' 
    });
  };

  const removeHistoryEntry = (id: string) => {
    setFormData(prev => ({
      ...prev,
      contactHistory: prev.contactHistory.filter(h => h.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docSuccess) {
      alert(`Por favor, insira um ${docType} válido.`);
      return;
    }
    if (!validateEmail(formData.email)) {
      setEmailError('E-mail inválido.');
      return;
    }
    if (formData.website && !validateURL(formData.website)) {
      setUrlError('URL do site inválida.');
      return;
    }
    const fullAddress = `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''} - ${formData.neighborhood} - ${formData.city}/${formData.state}`;
    const { street, number, neighborhood, city, state, complement, ...rest } = formData;
    const latest = formData.contactHistory[0];
    onSave({ 
      ...rest, 
      address: fullAddress, 
      docType: docType,
      cnpj: docType === 'CRECI' ? formData.creci : formData.cnpj,
      lastContactDate: latest?.date,
      lastContactType: latest?.type,
      contactSummary: latest?.summary,
      nextContactDate: latest?.nextContactDate
    });
  };

  return (
    <div className={`bg-white rounded-2xl p-8 shadow-sm border border-slate-200 w-full mx-auto animate-fadeIn ${isPublic ? '' : 'max-w-2xl overflow-y-auto max-h-[90vh]'}`}>
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-800">{isPublic ? 'Credenciamento' : (initialData ? 'Editar Parceiro' : 'Novo Registro')}</h3>
        <p className="text-sm text-slate-500 mt-1">Gestão inteligente de parceiros e corretores.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
            {(['CNPJ', 'CPF', 'CRECI'] as const).map(type => (
              <button key={type} type="button" onClick={() => { setDocType(type); setDocSuccess(false); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${docType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
                {type}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docType === 'CRECI' ? (
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                  Registro CRECI e UF
                  {docSuccess && <span className="text-green-500 animate-fadeIn" title="Válido">✅</span>}
                </label>
                <div className="flex gap-2">
                  <input required className={`flex-1 px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${docSuccess ? 'border-green-200' : 'border-slate-200'}`} value={formData.creci} onChange={onDocChange} placeholder="00000-J" />
                  <select required className={`w-24 px-2 py-3 bg-slate-50 border rounded-xl ${docSuccess ? 'border-green-200' : 'border-slate-200'}`} value={formData.creciUF} onChange={e => setFormData({...formData, creciUF: e.target.value})}>
                    <option value="">UF</option>
                    {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                  {docType}
                  {docSuccess && <span className="text-green-500 animate-fadeIn" title={`${docType} Válido`}>✅</span>}
                </label>
                <div className="relative">
                  <input required className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${docSuccess ? 'border-green-200 bg-green-50/20' : 'border-slate-200'}`} value={formData.cnpj} onChange={onDocChange} placeholder={docType === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"} />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isSearching && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                    {docSuccess && !isSearching && <span className="text-xs">✔️</span>}
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Razão Social / Nome</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">E-mail de Contato</label>
              <input required type="email" className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${emailError ? 'border-red-400' : 'border-slate-200'}`} value={formData.email} onChange={e => { setFormData({ ...formData, email: e.target.value }); setEmailError(null); }} placeholder="exemplo@empresa.com.br" />
              {emailError && <p className="text-[10px] text-red-500 font-bold ml-1">{emailError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Telefone Principal</label>
              <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Site da Empresa</label>
              <input 
                type="text" 
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${urlError ? 'border-red-400' : 'border-slate-200'}`} 
                value={formData.website} 
                onChange={handleURLChange} 
                placeholder="www.empresa.com.br"
              />
              {urlError && <p className="text-[10px] text-red-500 font-bold ml-1">{urlError}</p>}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-slate-50 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CEP</label>
              <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.cep} onChange={e => { const v = maskCEP(e.target.value); setFormData({...formData, cep: v}); if(v.replace(/\D/g, '').length === 8) handleCEPLookup(v); }} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logradouro</label>
              <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nº</label>
              <input ref={numberInputRef} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bairro</label>
              <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cidade/UF</label>
              <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold min-h-[46px]">
                {formData.city ? `${formData.city}/${formData.state}` : '...'}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Histórico de Relacionamento</span>
          </div>
          
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-blue-600">Data da Interação</label>
                <input type="date" className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl outline-none" value={newHistory.date} onChange={e => setNewHistory({...newHistory, date: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-blue-600">Tipo de Último Contato</label>
                <select className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl outline-none font-medium" value={newHistory.type} onChange={e => setNewHistory({...newHistory, type: e.target.value as any})}>
                  <option value="Telefone">📞 Telefone</option>
                  <option value="WhatsApp">💬 WhatsApp</option>
                  <option value="E-mail">📧 E-mail</option>
                  <option value="Reunião">🤝 Reunião</option>
                  <option value="Vídeo">🎥 Vídeo Chamada</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-blue-600">Resumo da Conversa (Título)</label>
              <input className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl outline-none text-sm" placeholder="Ex: Demonstração de interesse..." value={newHistory.summary} onChange={e => setNewHistory({...newHistory, summary: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-blue-600">Anotações Detalhadas</label>
              <textarea className="w-full px-4 py-2 bg-white border border-blue-200 rounded-xl outline-none text-sm min-h-[100px] resize-none" placeholder="Detalhes específicos da conversa, acordos feitos, pontos de atenção..." value={newHistory.notes} onChange={e => setNewHistory({...newHistory, notes: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-blue-600">Próximo Contato (Agendamento)</label>
                <input type="date" className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl outline-none" value={newHistory.nextContactDate} onChange={e => setNewHistory({...newHistory, nextContactDate: e.target.value})} />
              </div>
              <button type="button" onClick={handleAddHistory} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all">
                Registrar Interação
              </button>
            </div>
          </div>

          {formData.contactHistory.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Registros Recentes</p>
              <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
                {formData.contactHistory.map(h => (
                  <div key={h.id} className="p-4 flex flex-col hover:bg-white transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">{h.type}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <button type="button" onClick={() => removeHistoryEntry(h.id)} className="text-slate-300 hover:text-red-500 p-1">✕</button>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">{h.summary}</p>
                    {h.notes && <p className="text-xs text-slate-500 line-clamp-2 italic">"{h.notes}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Informações Adicionais</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Responsável Operacional</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Gestor da Conta (Hub)</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.hiringManager} onChange={e => setFormData({ ...formData, hiringManager: e.target.value })} disabled={isPublic} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500">Observações Gerais (Cadastro)</label>
            <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none text-sm" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Notas internas, diferenciais competitivos ou restrições..." />
          </div>
        </section>

        <div className="flex gap-4 pt-4">
          {!isPublic && <button type="button" onClick={onCancel} className="flex-1 py-4 bg-white text-slate-600 border rounded-xl font-bold">Cancelar</button>}
          <button type="submit" disabled={!docSuccess} className={`flex-[2] py-4 text-white rounded-xl font-bold shadow-xl transition-all active:scale-95 ${docSuccess ? 'bg-blue-600 shadow-blue-200 hover:bg-blue-700' : 'bg-slate-300 shadow-none cursor-not-allowed'}`}>
            {isPublic ? 'Finalizar Cadastro' : (initialData ? 'Atualizar Dados' : 'Concluir Registro')}
          </button>
        </div>
      </form>
    </div>
  );
};
