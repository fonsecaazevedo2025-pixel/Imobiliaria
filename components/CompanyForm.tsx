
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

const COMMISSION_OPTIONS = [1.5, 2, 3, 4, 5, 6];

const CONTACT_TYPES: { value: ContactHistoryEntry['type']; label: string; icon: string }[] = [
  { value: 'Telefone', label: 'Telefone', icon: '📞' },
  { value: 'WhatsApp', label: 'WhatsApp', icon: '💬' },
  { value: 'E-mail', label: 'E-mail', icon: '📧' },
  { value: 'Reunião', label: 'Reunião', icon: '🤝' },
  { value: 'Vídeo', label: 'Vídeo', icon: '🎥' },
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

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10 && digits.length !== 11) return false;
    const ddd = parseInt(digits.substring(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    if (digits.length === 11 && digits[2] !== '9') return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    return true;
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
    if (r.length <= 10) {
      return `(${r.substring(0, 2)}) ${r.substring(2, 6)}-${r.substring(6)}`;
    } else {
      return `(${r.substring(0, 2)}) ${r.substring(2, 7)}-${r.substring(7)}`;
    }
  };

  const maskCEP = (v: string) => {
    const clean = v.replace(/\D/g, "").substring(0, 8);
    if (clean.length > 5) {
      return `${clean.substring(0, 5)}-${clean.substring(5)}`;
    }
    return clean;
  };

  const maskCNPJ = (v: string) => v.replace(/\D/g, "").substring(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  const maskCPF = (v: string) => v.replace(/\D/g, "").substring(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  
  const maskCRECI = (v: string) => {
    let clean = v.replace(/[^0-9jfJF]/g, "").toUpperCase();
    if (clean.length > 8) clean = clean.substring(0, 8);
    if (clean.includes('J') || clean.includes('F')) {
      const type = clean.includes('J') ? 'J' : 'F';
      const numbers = clean.replace(/[JF]/g, '');
      return numbers ? `${numbers}-${type}` : type;
    }
    return clean;
  };

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
  const [phoneError, setPhoneError] = useState<string | null>(null);
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
    else {
      const cleanCreci = formData.creci.replace(/[^0-9]/g, '');
      isValid = cleanCreci.length >= 2 && formData.creciUF !== '';
    }
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
    if (clean.length !== 8) return;
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
      setCepError("Falha na conexão");
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
      const masked = maskCRECI(val);
      setFormData({ ...formData, creci: masked });
    }
  };

  const handleURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, website: val }));
    if (val && !validateURL(val)) setUrlError('URL inválida');
    else setUrlError(null);
  };

  const handleSendEmail = () => {
    if (formData.email && validateEmail(formData.email)) {
      window.location.href = `mailto:${formData.email}`;
    } else {
      setEmailError('E-mail inválido para envio.');
    }
  };

  const handleWhatsAppClick = () => {
    if (formData.phone && validatePhone(formData.phone)) {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    } else {
      setPhoneError('Número inválido para WhatsApp.');
    }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docSuccess) {
      alert(`Por favor, insira um ${docType} e UF válidos.`);
      return;
    }
    if (!validateEmail(formData.email)) {
      setEmailError('E-mail inválido.');
      return;
    }
    if (!validatePhone(formData.phone)) {
      setPhoneError('Número de telefone inválido.');
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
                  {docSuccess && (
                    <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 animate-fadeIn">
                      <span className="text-[10px] font-bold text-green-600">Válido</span>
                      <span className="text-xs">✅</span>
                    </div>
                  )}
                </label>
                <div className="flex gap-2">
                  <input required className={`flex-1 px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${docSuccess ? 'border-green-300 bg-green-50/20' : 'border-slate-200'}`} value={formData.creci} onChange={onDocChange} placeholder="00000-J" />
                  <select required className={`w-24 px-2 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${formData.creciUF ? 'border-blue-200' : 'border-slate-200'}`} value={formData.creciUF} onChange={e => setFormData({...formData, creciUF: e.target.value})}>
                    <option value="">UF</option>
                    {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                {!formData.creciUF && formData.creci && <p className="text-[9px] text-blue-500 font-bold ml-1">* Selecione a UF para validar</p>}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                  {docType}
                  {docSuccess && (
                    <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 animate-fadeIn">
                      <span className="text-[10px] font-bold text-green-600">Válido</span>
                    </div>
                  )}
                </label>
                <div className="relative">
                  <input required className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${docSuccess ? 'border-green-300 bg-green-50/20' : 'border-slate-200'}`} value={formData.cnpj} onChange={onDocChange} placeholder={docType === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"} />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {isSearching && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                    {docSuccess && !isSearching && (
                      <span className="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-[10px] shadow-sm animate-bounceIn">
                        ✓
                      </span>
                    )}
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
              <div className="flex gap-2">
                <input required type="email" className={`flex-1 px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${emailError ? 'border-red-400' : 'border-slate-200'}`} value={formData.email} onChange={e => { setFormData({ ...formData, email: e.target.value }); setEmailError(null); }} placeholder="exemplo@empresa.com.br" />
                <button type="button" onClick={handleSendEmail} disabled={!formData.email} className="px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50" title="Enviar e-mail agora">📧</button>
              </div>
              {emailError && <p className="text-[10px] text-red-500 font-bold ml-1">{emailError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Telefone Principal</label>
              <div className="flex gap-2">
                <input required type="text" className={`flex-1 px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${phoneError ? 'border-red-400' : 'border-slate-200'}`} value={formData.phone} onChange={e => { setFormData({ ...formData, phone: maskPhone(e.target.value) }); setPhoneError(null); }} placeholder="(00) 00000-0000" />
                <button 
                  type="button" 
                  onClick={handleWhatsAppClick} 
                  disabled={!validatePhone(formData.phone)} 
                  className="px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-sm disabled:bg-slate-300 disabled:opacity-50 active:scale-95" 
                  title="Iniciar conversa no WhatsApp"
                >
                  💬
                </button>
              </div>
              {phoneError && <p className="text-[10px] text-red-500 font-bold ml-1">{phoneError}</p>}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Site da Empresa</label>
              <input type="text" className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${urlError ? 'border-red-400' : 'border-slate-200'}`} value={formData.website} onChange={handleURLChange} placeholder="www.empresa.com.br" />
              {urlError && <p className="text-[10px] text-red-500 font-bold ml-1">{urlError}</p>}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-slate-50 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CEP</label>
              <div className="relative">
                <input 
                  required 
                  maxLength={9}
                  className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${cepError ? 'border-red-300' : 'border-slate-200'}`} 
                  value={formData.cep} 
                  onChange={e => { 
                    const v = maskCEP(e.target.value); 
                    setFormData({...formData, cep: v}); 
                    if(v.replace(/\D/g, '').length === 8) handleCEPLookup(v); 
                  }} 
                  placeholder="00000-000"
                />
                {isCepLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
              </div>
              {cepError && <p className="text-[10px] text-red-500 font-bold ml-1">{cepError}</p>}
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

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Acordo Comercial</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500">Status do Parceiro</label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button type="button" onClick={() => setFormData({ ...formData, status: 'Ativo' })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.status === 'Ativo' ? 'bg-green-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Ativo</button>
                <button type="button" onClick={() => setFormData({ ...formData, status: 'Inativo' })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.status === 'Inativo' ? 'bg-slate-400 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>Inativo</button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500">Taxa de Comissão (%)</label>
              <div className="grid grid-cols-3 gap-2">
                {COMMISSION_OPTIONS.map((rate) => (
                  <button key={rate} type="button" onClick={() => setFormData({ ...formData, commissionRate: rate })} className={`py-2 text-xs font-bold rounded-lg border transition-all ${formData.commissionRate === rate ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'}`}>{rate}%</button>
                ))}
              </div>
            </div>
            {/* NOVO CAMPO: NÚMERO DE CORRETORES */}
            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-500">Número de Corretores (Força de Vendas)</label>
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">👥</span>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Quantidade de profissionais..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                    value={formData.brokerCount}
                    onChange={e => setFormData({ ...formData, brokerCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex gap-1">
                   {[5, 10, 20, 50].map(val => (
                     <button 
                      key={val}
                      type="button" 
                      onClick={() => setFormData({...formData, brokerCount: val})}
                      className="px-3 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-all"
                     >
                       +{val}
                     </button>
                   ))}
                </div>
              </div>
              <p className="text-[9px] text-slate-400 italic">* Este dado ajuda a IA a calcular o potencial de ROI do parceiro.</p>
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
              
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-blue-600">Canal de Contato</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {CONTACT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setNewHistory({ ...newHistory, type: type.value })}
                      className={`py-2 px-1 flex flex-col items-center justify-center gap-1 rounded-xl border transition-all ${newHistory.type === type.value ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-blue-100 text-blue-700 hover:bg-blue-50'}`}
                    >
                      <span className="text-base">{type.icon}</span>
                      <span className="text-[9px] font-bold uppercase truncate w-full text-center">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-blue-600">Resumo da Conversa (Título)</label>
              <input className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl outline-none text-sm" placeholder="Ex: Demonstração de interesse..." value={newHistory.summary} onChange={e => setNewHistory({...newHistory, summary: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-blue-600">Anotações Detalhadas</label>
              <textarea className="w-full px-4 py-2 bg-white border border-blue-200 rounded-xl outline-none text-sm min-h-[100px] resize-none" placeholder="Detalhes específicos..." value={newHistory.notes} onChange={e => setNewHistory({...newHistory, notes: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-blue-600">Próximo Contato</label>
                <input type="date" className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl outline-none" value={newHistory.nextContactDate} onChange={e => setNewHistory({...newHistory, nextContactDate: e.target.value})} />
              </div>
              <button type="button" onClick={handleAddHistory} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all">Registrar Interação</button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Informações Adicionais</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Responsável Operacional</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.responsible} onChange={e => setFormData({ ...formData, responsible: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Gestor Parceiro</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.partnershipManager} onChange={e => setFormData({ ...formData, partnershipManager: e.target.value })} placeholder="Nome do gestor" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Gestor da Conta (Hub)</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.hiringManager} onChange={e => setFormData({ ...formData, hiringManager: e.target.value })} disabled={isPublic} />
            </div>
          </div>
        </section>

        <div className="flex gap-4 pt-4">
          {!isPublic && <button type="button" onClick={onCancel} className="flex-1 py-4 bg-white text-slate-600 border rounded-xl font-bold">Cancelar</button>}
          <button type="submit" disabled={!docSuccess} className={`flex-[2] py-4 text-white rounded-xl font-bold shadow-xl transition-all active:scale-95 ${docSuccess ? 'bg-blue-600 shadow-blue-200 hover:bg-blue-700' : 'bg-slate-300 shadow-none cursor-not-allowed'}`}>
            {isPublic ? 'Finalizar Cadastro' : (initialData ? 'Atualizar Dados' : 'Concluir Registro')}
          </button>
        </div>
      </form>
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .animate-bounceIn {
          animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </div>
  );
};
