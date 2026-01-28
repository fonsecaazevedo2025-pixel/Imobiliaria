
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
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
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

  const [isSearching, setIsSearching] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

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
    setDocError(null);
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
    } catch (e) { 
      setDocError("Falha na consulta do CNPJ.");
    } finally { 
      setIsSearching(false); 
    }
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
        setCepError("CEP inexistente.");
      } else {
        setFormData(prev => ({ ...prev, street: data.logradouro, neighborhood: data.bairro, city: data.localidade, state: data.uf }));
        setTimeout(() => numberInputRef.current?.focus(), 100);
      }
    } catch (e) {
      setCepError("Erro ao buscar CEP.");
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleEmailBlur = () => {
    setEmailError(formData.email && !validateEmail(formData.email) ? 'E-mail inválido.' : null);
  };

  const handlePhoneBlur = () => {
    setPhoneError(formData.phone && !validatePhone(formData.phone) ? 'Telefone inválido.' : null);
  };

  const handleWhatsAppClick = () => {
    if (validatePhone(formData.phone)) {
      const digits = formData.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${digits}`, '_blank');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docSuccess || !validateEmail(formData.email) || !validatePhone(formData.phone)) return;

    const fullAddress = `${formData.street}, ${formData.number}${formData.complement ? ` - ${formData.complement}` : ''} - ${formData.neighborhood} - ${formData.city}/${formData.state}`;
    const { street, number, neighborhood, city, state, complement, ...rest } = formData;
    
    onSave({ 
      ...rest, 
      address: fullAddress, 
      docType: docType,
      cnpj: docType === 'CRECI' ? formData.creci : formData.cnpj,
      registrationDate: new Date().toISOString()
    });
  };

  const getAddressPreview = () => {
    if (!formData.street && !formData.city) return "Informe o CEP ou Logradouro...";
    return `${formData.street || '...'}, ${formData.number || 'SN'}${formData.complement ? ` (${formData.complement})` : ''} - ${formData.neighborhood || '...'} - ${formData.city || '...'}/${formData.state || '...'}`;
  };

  return (
    <div className={`bg-white rounded-2xl p-8 shadow-sm border border-slate-200 w-full mx-auto animate-fadeIn ${isPublic ? '' : 'max-w-2xl overflow-y-auto max-h-[90vh]'}`}>
      <div className="mb-8 border-b border-slate-100 pb-4">
        <h3 className="text-xl font-bold text-slate-800">{isPublic ? 'Credenciamento Externo' : (initialData ? 'Editar Parceiro' : 'Novo Registro')}</h3>
        <p className="text-sm text-slate-500 mt-1">Gestão de dados cadastrais e endereçamento.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            {(['CNPJ', 'CPF', 'CRECI'] as const).map(type => (
              <button key={type} type="button" onClick={() => { setDocType(type); setDocSuccess(false); setDocError(null); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${docType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">{docType}</label>
              <div className="relative">
                <input required className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${docError ? 'border-red-400' : 'border-slate-200'}`} value={docType === 'CRECI' ? formData.creci : formData.cnpj} onChange={e => {
                  const val = e.target.value;
                  if (docType === 'CNPJ') {
                    const m = maskCNPJ(val);
                    setFormData({...formData, cnpj: m});
                    if(m.replace(/\D/g, '').length === 14) handleCNPJLookup(m);
                  } else if (docType === 'CPF') {
                    setFormData({...formData, cnpj: maskCPF(val)});
                  } else {
                    setFormData({...formData, creci: maskCRECI(val)});
                  }
                }} placeholder={docType === 'CNPJ' ? "00.000.000/0000-00" : (docType === 'CPF' ? "000.000.000-00" : "00000-J")} />
                {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Razão Social / Nome</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">E-mail</label>
              <input required type="email" className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${emailError ? 'border-red-400' : 'border-slate-200'}`} value={formData.email} onBlur={handleEmailBlur} onChange={e => { setFormData({ ...formData, email: e.target.value }); if(emailError) setEmailError(null); }} />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500">Telefone</label>
              <div className="flex gap-2">
                <input required type="text" className={`flex-1 px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${phoneError ? 'border-red-400' : 'border-slate-200'}`} value={formData.phone} onBlur={handlePhoneBlur} onChange={e => { setFormData({ ...formData, phone: maskPhone(e.target.value) }); if(phoneError) setPhoneError(null); }} placeholder="(00) 00000-0000" />
                <button 
                  type="button" 
                  onClick={handleWhatsAppClick} 
                  disabled={!validatePhone(formData.phone)}
                  title="Abrir WhatsApp direto"
                  className="px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg shadow-green-100 hover:bg-green-600 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:shadow-none flex items-center justify-center"
                >
                  <span className="text-xl">💬</span>
                </button>
              </div>
              {phoneError && <p className="text-[10px] text-red-500 font-bold ml-1">{phoneError}</p>}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-xs font-bold uppercase tracking-widest">Localização e Endereço</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">📍 CEP</label>
                <div className="relative">
                  <input required className={`w-full px-4 py-3 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${cepError ? 'border-red-300' : 'border-slate-200'}`} value={formData.cep} onChange={e => {
                    const v = maskCEP(e.target.value);
                    setFormData({...formData, cep: v});
                    if(v.replace(/\D/g, '').length === 8) handleCEPLookup(v);
                  }} placeholder="00000-000" />
                  {isCepLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                </div>
              </div>

              <div className="md:col-span-3 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Logradouro (Rua, Av, etc)</label>
                <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} placeholder="Ex: Av. das Esmeraldas" />
              </div>

              <div className="md:col-span-1 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Número</label>
                <input ref={numberInputRef} required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} placeholder="123" />
              </div>

              <div className="md:col-span-1 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Complemento</label>
                <input className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.complement} onChange={e => setFormData({...formData, complement: e.target.value})} placeholder="Apto 12, Bl 1" />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Bairro</label>
                <input required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.neighborhood} onChange={e => setFormData({...formData, neighborhood: e.target.value})} placeholder="Nome do Bairro" />
              </div>

              <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Cidade</label>
                  <div className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm min-h-[46px] flex items-center">
                    {formData.city || '...'}
                  </div>
                </div>
                <div className="col-span-1 md:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">UF</label>
                  <div className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm min-h-[46px] flex items-center justify-center">
                    {formData.state || '--'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-blue-100 rounded-xl space-y-2">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Endereço Formatado (Preview)</p>
              <p className="text-xs font-medium text-slate-700 leading-relaxed italic">
                {getAddressPreview()}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500">Gestor da Conta (Hub)</label>
            <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.hiringManager} onChange={e => setFormData({ ...formData, hiringManager: e.target.value })} disabled={isPublic} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500">Comissão (%)</label>
            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={formData.commissionRate} onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}>
              {COMMISSION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}%</option>)}
            </select>
          </div>
        </section>

        <div className="flex gap-4 pt-4">
          {!isPublic && <button type="button" onClick={onCancel} className="flex-1 py-4 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all">Cancelar</button>}
          <button type="submit" disabled={isSearching || isCepLoading} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-[0.98]">
            {isPublic ? 'Finalizar Cadastro' : (initialData ? 'Salvar Alterações' : 'Concluir Cadastro')}
          </button>
        </div>
      </form>
    </div>
  );
};
