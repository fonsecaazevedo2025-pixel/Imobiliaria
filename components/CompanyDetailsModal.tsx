
import React from 'react';
import { Company } from '../types';

interface CompanyDetailsModalProps {
  company: Company;
  onClose: () => void;
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({ company, onClose }) => {
  const isUpcoming = (dateStr?: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    return target >= today;
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'WhatsApp': return '💬';
      case 'Telefone': return '📞';
      case 'Reunião': return '🤝';
      case 'E-mail': return '📧';
      case 'Vídeo': return '🎥';
      default: return '📱';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800">Prontuário do Parceiro</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 text-2xl">×</button>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto">
          {/* Top Info */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">🏢</div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">{company.name}</h4>
              <p className="text-xs text-slate-500 font-mono">
                {company.docType === 'CRECI' 
                  ? `CRECI ${company.creci} / ${company.creciUF}` 
                  : company.cnpj}
              </p>
              <div className="flex gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${company.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{company.status}</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700">{company.commissionRate}% Comissão</span>
              </div>
            </div>
          </div>

          {/* Contact Directory */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase">Resp. Operacional</p>
               <p className="text-xs font-bold text-slate-700 truncate">{company.responsible}</p>
             </div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase">Gestor da Parceria</p>
               <p className="text-xs font-bold text-slate-700 truncate">{company.partnershipManager || 'N/A'}</p>
             </div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase">Gestor Hub</p>
               <p className="text-xs font-bold text-blue-600 truncate">{company.hiringManager}</p>
             </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Linha do Tempo de Relacionamento</h5>
            
            <div className="space-y-6 relative ml-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
              {company.contactHistory && company.contactHistory.length > 0 ? (
                company.contactHistory.map((h, i) => (
                  <div key={h.id} className="relative pl-8">
                    <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${i === 0 ? 'bg-blue-500 ring-4 ring-blue-50' : 'bg-slate-300'}`}></div>
                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-slate-700 uppercase">{getIcon(h.type)} {h.type}</span>
                        <span className="text-[10px] text-slate-400">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <p className="text-xs text-slate-600 italic">"{h.summary}"</p>
                      {h.nextContactDate && (
                        <div className={`mt-2 pt-2 border-t border-slate-100 text-[9px] font-bold ${isUpcoming(h.nextContactDate) ? 'text-blue-600' : 'text-slate-400'}`}>
                          Próximo contato agendado: {new Date(h.nextContactDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic pl-8">Nenhum registro encontrado.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 flex justify-between border-t">
          <div className="flex gap-2">
            <a href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all">💬</a>
            <a href={`mailto:${company.email}`} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all">📧</a>
          </div>
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm">Fechar</button>
        </div>
      </div>
    </div>
  );
};
