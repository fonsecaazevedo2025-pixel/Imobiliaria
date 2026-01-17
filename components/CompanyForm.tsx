
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

  // --- Opções de Comissão ---
  const commissionOptions = [];
  for (let i = 1; i <= 8; i += 0.5) {
    commissionOptions.push(i);
  }

  // --- Algoritmos de Validação ---
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

  // --- Máscaras ---
  const maskPhone = (v: string) => {
    let r = v.replace(/\D/g, "").substring(0, 11);
    if (r.length === 11) {
      return r.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (r.length > 2) {
      return r.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
    } else if (r.length > 0) {
      return "(" + r;
    }
    return r;
  };

  const maskCEP = (v: string) => v.replace(/\D/g, "").substring(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
  const maskCNPJ = (v: string) => v.replace(/\D/g, "").substring(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  const maskCPF = (v: string) => v.replace(/\D/g, "").substring(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");

  // --- Estados ---
  const [docType, setDocType] = useState<'CNPJ' | 'CPF' | 'CRECI'>(initialData?.docType || 'CNPJ');
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    cnpj: initialData?.cnpj || '',
    creci: initialData?.creci || '',
    creciUF: initialData?.creciUF || '',
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
    nextContactDate: '',
  });

  const [isSearching, setIsSearching] = useState(false);
  const [docSuccess, setDocSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

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

  // Atualiza validação visual sempre que dados do doc mudam
  useEffect(() => {
    if (docType === 'CNPJ') setDocSuccess(validateCNPJ(formData.cnpj));
    else if (docType === 'CPF') setDocSuccess(validateCPF(formData.cnpj));
    else setDocSuccess(formData.creci.length >= 4 && formData.creciUF !== '');
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
    if (clean.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        setFormData(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }));
        setTimeout(() => numberInputRef.current?.focus(), 100);
      }
    } catch (e) { console.error(e); }
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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, email: val }));
    if (val && !validateEmail(val)) {
      setEmailError('Por favor, insira um e-mail válido.');
    } else {
      setEmailError(null);
    }
  };

  const onCRECIUFChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uf = e.target.value;
    setFormData({ ...formData, creciUF: uf });
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
      nextContactDate: '' 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) {
      setEmailError('Por favor, insira um e-mail válido antes de salvar.');
      return;
    }
    
    if (docType === 'CRECI' && !formData.creciUF) {
        alert("Por favor, selecione a UF do CRECI.");
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

  const isPhoneReadyForWA = formData.phone.replace(/\D/g, '').length >= 10;
  const whatsappUrl = isPhoneReadyForWA ? `https://wa.me/55${formData.phone.replace(/\D/g, '')}` : null;

  return (
    <div className={`bg-white rounded-2xl p-8 shadow-sm border border-slate-200 w-full mx-auto animate-fadeIn ${isPublic ? '' : 'max-w-2xl overflow-y-auto max-h-[90vh]'}`}>
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-800">{isPublic ? 'Credenciamento' : (initialData ? 'Editar Parceiro' : 'Novo Registro')}</h3>
        <p className="text-sm text-slate-500 mt-1">Dados oficiais para a base estratégica de parceiros.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identificação */}
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
                <label className="text-[10px] font-black uppercase text-slate-500">CRECI (Número e UF)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.creci} onChange={onDocChange} placeholder="00000-J" />
                    {docSuccess && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 font-bold">✓</span>}
                  </div>
                  <select required className={`w-24 px-2 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 transition-all ${!formData.creciUF ? 'border-amber-300 focus:ring-amber-200' : 'border-slate-200 focus:ring-blue-500'}`} value={formData.creciUF} onChange={onCRECIUFChange}>
                    <option value="">UF</option>
                    {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500">{docType === 'CNPJ' ? 'CNPJ' : 'CPF'}</label>
                <div className="relative">
                  <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.cnpj} onChange={onDocChange} placeholder={docType === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"} />
                  {docSuccess && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 font-bold">✓</span>}
                  {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Razão Social / Nome Completo</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
          </div>
        </section>

        {/* Gestão e Governança */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gestão e Governança</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Responsável Operacional (Parceiro)</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })} placeholder="Nome do contato principal" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Gestor da Parceria</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.partnershipManager} onChange={e => setFormData({ ...formData, partnershipManager: e.target.value })} placeholder="Diretor / Gestor estratégico" />
            </div>
            {!isPublic && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-500">Gestor da Conta (Interno Hub)</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" value={formData.hiringManager} onChange={e => setFormData({ ...formData, hiringManager: e.target.value })} placeholder="Nome do colaborador interno" />
              </div>
            )}
          </div>
        </section>

        {/* Acordo Comercial */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Acordo Comercial</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Porcentagem Negociada (%)</label>
              <select 
                required 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
                value={formData.commissionRate}
                onChange={e => setFormData({...formData, commissionRate: parseFloat(e.target.value)})}
              >
                {commissionOptions.map(opt => (
                  <option key={opt} value={opt}>{opt.toFixed(1)}%</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Quantidade de Corretores</label>
              <input 
                type="number" 
                min="0"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                value={formData.brokerCount} 
                onChange={e => setFormData({ ...formData, brokerCount: parseInt(e.target.value) || 0 })} 
                placeholder="Ex: 10" 
              />
            </div>
          </div>
        </section>

        {/* Contato */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Canais de Contato</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Telefone Comercial</label>
              <div className="relative flex items-center">
                <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none pr-12" value={formData.phone} onChange={e => setFormData({...formData, phone: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" />
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="absolute right-2 p-2 bg-green-50 text-green-600 rounded-lg border border-green-200 hover:bg-green-100 transition-all">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </a>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">E-mail</label>
              <input required type="email" className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 ${emailError ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-500'}`} value={formData.email} onChange={handleEmailChange} placeholder="exemplo@email.com" />
              {emailError && <p className="text-[10px] font-bold text-red-500 mt-1">{emailError}</p>}
            </div>
          </div>
        </section>

        {/* Endereço */}
        <section className="space-y-4">
          <div className="bg-slate-50 p-6 rounded-2xl grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CEP</label>
              <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl" value={formData.cep} onChange={e => { const v = maskCEP(e.target.value); setFormData({...formData, cep: v}); if(v.length === 9) handleCEPLookup(v); }} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rua</label>
              <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nº</label>
              <input ref={numberInputRef} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cidade / UF</label>
              <div className="px-4 py-3 bg-slate-100 rounded-xl text-slate-600 font-bold">{formData.city ? `${formData.city} / ${formData.state}` : '...'}</div>
            </div>
          </div>
        </section>

        {/* CRM - APENAS INTERNO */}
        {!isPublic && (
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Histórico de Interações (CRM)</span>
            </div>
            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Data do Contato</label>
                  <input type="date" className="w-full p-2.5 rounded-xl text-sm border border-blue-200" value={newHistory.date} onChange={e => setNewHistory({...newHistory, date: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Tipo de Último Contato</label>
                  <select className="w-full p-2.5 rounded-xl text-sm border border-blue-200 bg-white font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none" value={newHistory.type} onChange={e => setNewHistory({...newHistory, type: e.target.value as any})}>
                    <option value="Telefone">📞 Telefone</option>
                    <option value="WhatsApp">💬 WhatsApp</option>
                    <option value="E-mail">📧 E-mail</option>
                    <option value="Reunião">🤝 Reunião</option>
                    <option value="Vídeo">🎥 Vídeo</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Resumo Detalhado da Conversa</label>
                <textarea className="w-full p-3 rounded-xl text-xs border border-blue-200 min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Negociamos aumento de comissão para 6% em lançamentos..." value={newHistory.summary} onChange={e => setNewHistory({...newHistory, summary: e.target.value})} />
              </div>
              <div className="flex flex-col md:flex-row items-end gap-3">
                <div className="flex-1 space-y-1.5 w-full">
                  <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Agendar Próximo Contato (Follow-up)</label>
                  <input type="date" className="w-full p-2.5 rounded-xl text-xs border border-blue-200" value={newHistory.nextContactDate} onChange={e => setNewHistory({...newHistory, nextContactDate: e.target.value})} />
                </div>
                <button type="button" onClick={handleAddHistory} className="w-full md:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95">
                  Registrar Interação
                </button>
              </div>
            </div>
            
            {/* Lista de Histórico no Formulário */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
               {formData.contactHistory.map(h => (
                 <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-[10px]">
                    <div>
                      <span className="font-bold text-slate-700">{new Date(h.date).toLocaleDateString('pt-BR')}</span> - <span className="uppercase font-black text-blue-600">{h.type}</span>
                      <p className="text-slate-500 line-clamp-1 mt-1 italic">"{h.summary}"</p>
                    </div>
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, contactHistory: prev.contactHistory.filter(x => x.id !== h.id) }))} className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors">🗑️</button>
                 </div>
               ))}
            </div>
          </section>
        )}

        <div className="flex gap-4 pt-4">
          {!isPublic && <button type="button" onClick={onCancel} className="flex-1 py-4 bg-white text-slate-600 border rounded-xl font-bold">Cancelar</button>}
          <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-200 transition-transform active:scale-95">
            {isPublic ? 'Finalizar Cadastro' : (initialData ? 'Atualizar Dados' : 'Concluir Registro')}
          </button>
        </div>
      </form>
    </div>
  );
};
