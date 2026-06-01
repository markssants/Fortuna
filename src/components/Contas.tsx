import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  DollarSign, 
  CreditCard,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  FileText,
  Clock,
  ExternalLink,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

export interface Conta {
  id: string;
  name: string;
  value: number;
  dueDate: string; // 'YYYY-MM-DD'
  category: string;
  status: 'pendente' | 'pago' | 'atrasado';
  bank: string;
  barcode?: string;
  notes?: string;
  userId?: string;
  createdAt?: string;
}

const CATEGORIES = [
  { id: 'moradia', name: 'Moradia (Aluguel, Condomínio)', color: '#8b5cf6', icon: '🏠' },
  { id: 'servicos', name: 'Contas de Consumo (Água, Luz, Net)', color: '#06b6d4', icon: '⚡' },
  { id: 'saude', name: 'Saúde (Convênio, Farmácia)', color: '#ef4444', icon: '❤️' },
  { id: 'educacao', name: 'Educação (Escola, Cursos)', color: '#3b82f6', icon: '🎓' },
  { id: 'transporte', name: 'Transporte (IPVA, Seguro, Uber)', color: '#f59e0b', icon: '🚗' },
  { id: 'assinaturas', name: 'Assinaturas & Lazer', color: '#ec4899', icon: '📺' },
  { id: 'outros', name: 'Outros Boletos & Contas', color: '#64748b', icon: '📄' },
];

const BANKS = ['Nubank', 'Itaú', 'Inter', 'Bradesco', 'Santander', 'Dinheiro', 'C6 Bank', 'Outro'];

interface ContasProps {
  contas: Conta[];
  setContas: React.Dispatch<React.SetStateAction<Conta[]>>;
  user: any;
  theme: 'light' | 'dark';
  onQuickPay?: (conta: Conta) => void;
}

export default function Contas({ contas, setContas, user, theme, onQuickPay }: ContasProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<Conta | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'pendente' | 'pago' | 'atrasada'>('todas');
  const [sortBy, setSortBy] = useState<'dueDate' | 'value'>('dueDate');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState('servicos');
  const [bank, setBank] = useState('Nubank');
  const [barcode, setBarcode] = useState('');
  const [notes, setNotes] = useState('');

  const getPath = () => {
    return user ? `users/${user.uid}/contas` : null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value || !dueDate) return;

    const parsedValue = parseFloat(value) || 0;
    const id = Date.now().toString();

    // Determine default status based on date
    const todayStr = new Date().toISOString().split('T')[0];
    const initialStatus = dueDate < todayStr ? 'atrasado' : 'pendente';

    const newConta: Conta = {
      id,
      name,
      value: parsedValue,
      dueDate,
      category,
      status: initialStatus,
      bank,
      barcode: barcode.trim() || undefined,
      notes: notes.trim() || undefined,
      userId: user?.uid || '',
      createdAt: new Date().toISOString()
    };

    // Optimistic Update
    setContas(prev => [newConta, ...prev]);

    const path = getPath();
    if (path) {
      try {
        await setDoc(doc(db, path, id), newConta);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${id}`);
      }
    }

    // Reset Form
    setName('');
    setValue('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setCategory('servicos');
    setBank('Nubank');
    setBarcode('');
    setNotes('');
    setIsNewModalOpen(false);
  };

  const toggleStatus = async (item: Conta) => {
    const newStatus = item.status === 'pago' ? 'pendente' : 'pago';
    const updated = { ...item, status: newStatus as 'pago' | 'pendente' };

    // Optimistic Update
    setContas(prev => prev.map(c => c.id === item.id ? updated : c));

    const path = getPath();
    if (path) {
      try {
        await setDoc(doc(db, path, item.id), updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${path}/${item.id}`);
      }
    }
  };

  const handleQuickPayAction = async (item: Conta) => {
    // 1. If we have onQuickPay callback, execute it (logs a transaction automatically!)
    if (onQuickPay) {
      onQuickPay(item);
    }

    // 2. Mark this bill as 'pago' (paid)
    const updated = { ...item, status: 'pago' as const };
    setContas(prev => prev.map(c => c.id === item.id ? updated : c));

    const path = getPath();
    if (path) {
      try {
        await setDoc(doc(db, path, item.id), updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${path}/${item.id}`);
      }
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic Update
    setContas(prev => prev.filter(c => c.id !== id));

    const path = getPath();
    if (path) {
      try {
        await deleteDoc(doc(db, path, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
      }
    }
    setContaToDelete(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Live status update: if a pending bill is past its due date, treat it as overdue
  const processedContas = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return contas.map(c => {
      if (c.status === 'pendente' && c.dueDate < todayStr) {
        return { ...c, status: 'atrasado' as const };
      }
      return c;
    });
  }, [contas]);

  const filteredAndSortedList = useMemo(() => {
    return processedContas
      .filter(c => {
        // Search Term filter
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                              c.bank.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (!matchesSearch) return false;

        // Status filter
        if (filterStatus === 'todas') return true;
        if (filterStatus === 'atrasada') return c.status === 'atrasado';
        return c.status === filterStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'dueDate') {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else {
          return b.value - a.value;
        }
      });
  }, [processedContas, searchTerm, filterStatus, sortBy]);

  // Summary analysis calculations
  const stats = useMemo(() => {
    let pendenteSum = 0;
    let pagoSum = 0;
    let atrasadoSum = 0;
    
    processedContas.forEach(c => {
      if (c.status === 'pago') pagoSum += c.value;
      else if (c.status === 'atrasado') atrasadoSum += c.value;
      else pendenteSum += c.value;
    });

    return {
      pendenteSum,
      pagoSum,
      atrasadoSum,
      totalCount: processedContas.length,
      pendingCount: processedContas.filter(c => c.status !== 'pago').length
    };
  }, [processedContas]);

  // Helper date formatter
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getCategoryDetails = (catId: string) => {
    return CATEGORIES.find(c => c.id === catId) || { name: 'Outros', color: '#64748b', icon: '📄' };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">📄</span>
            Contas a Pagar / Boletos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize seus boletos, faturas de cartão, aluguel e utilidades. Marque como pago e registre a transação automaticamente!
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15 text-xs select-none active:scale-95 transition-all text-center cursor-pointer"
        >
          <Plus size={16} /> Adicionar Conta / Boleto
        </button>
      </div>

      {/* SUMMARY INDEXES CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Pending */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-blue-50 dark:bg-blue-950/20 text-blue-500 flex items-center justify-center text-xl font-bold shrink-0">
            ⏳
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Pendente</p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 truncate">
              R$ {stats.pendenteSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Total Overdue */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center text-xl font-bold shrink-0">
            🚨
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Atrasado</p>
            <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 truncate">
              R$ {stats.atrasadoSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center text-xl font-bold shrink-0">
            ✅
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Pago</p>
            <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-405 mt-0.5 truncate">
              R$ {stats.pagoSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Counters */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-slate-100 dark:bg-slate-850 text-slate-500 flex items-center justify-center text-xl font-bold shrink-0">
            📊
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Compromissos</p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {stats.pendingCount} pendentes
              <span className="text-[10px] font-medium text-slate-400 block truncate">de {stats.totalCount} cadastrados</span>
            </h3>
          </div>
        </div>
      </div>

      {/* FILTER, SEARCH & SORT BAR */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-120 dark:border-slate-800/80 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nome, observação ou banco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-805 rounded-2xl py-2.5 pl-10 pr-4 text-xs dark:text-white outline-none focus:border-indigo-500 transition-all font-medium"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filters & Sorters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex bg-slate-150 dark:bg-slate-955 p-1 rounded-2xl w-full sm:w-auto font-black shadow-xs text-xs">
            <button
              onClick={() => setFilterStatus('todas')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all text-center cursor-pointer ${filterStatus === 'todas' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus('pendente')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all text-center cursor-pointer ${filterStatus === 'pendente' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-3xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              A Vencer
            </button>
            <button
              onClick={() => setFilterStatus('atrasada')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all text-center cursor-pointer ${filterStatus === 'atrasada' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-455 shadow-3xs' : 'text-slate-500 hover:text-rose-800'}`}
            >
              Atrasadas
            </button>
            <button
              onClick={() => setFilterStatus('pago')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all text-center cursor-pointer ${filterStatus === 'pago' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-3xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              Pagas
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <SlidersHorizontal size={14} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'value')}
              className="bg-slate-50 dark:bg-slate-900 text-slate-705 dark:text-slate-200 border border-slate-150 dark:border-slate-800 rounded-xl p-2 px-3 outline-none font-bold text-xs cursor-pointer"
            >
              <option value="dueDate">Vencimento (Mais Próximo)</option>
              <option value="value">Valor (Maior)</option>
            </select>
          </div>
        </div>
      </div>

      {/* BILLS GRID LIST */}
      {filteredAndSortedList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-12 text-center transition-colors duration-300">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/20 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">
            💸
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Nenhuma conta encontrada</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mt-2">
            Organize e controle seus vencimentos de faturas, água, luz e outros compromissos para evitar juros de atraso.
          </p>
          <button 
            type="button" 
            onClick={() => setIsNewModalOpen(true)}
            className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-3 px-6 rounded-2xl inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 active:scale-95 transition-all"
          >
            <Plus size={14} /> Cadastrar Novo Boleto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedList.map((item) => {
            const categoryDetails = getCategoryDetails(item.category);
            const isPaid = item.status === 'pago';
            const isOverdue = item.status === 'atrasado';

            return (
              <motion.div 
                key={item.id}
                layout
                className={`bg-white dark:bg-slate-900 rounded-[1.8rem] border shadow-xs p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group/item ${
                  isPaid 
                    ? 'border-slate-100 dark:border-slate-920 opacity-70 hover:opacity-100' 
                    : isOverdue 
                    ? 'border-rose-100/50 dark:border-rose-950/30 hover:shadow-md' 
                    : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 hover:shadow-md'
                }`}
              >
                {/* Visual Aura for status */}
                {!isPaid && isOverdue && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 dark:bg-rose-500/10 rounded-bl-full pointer-events-none" />
                )}

                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Category icon */}
                      <div className="w-11 h-11 shrink-0 rounded-2xl bg-slate-55 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center font-black shadow-3xs text-xl">
                        {categoryDetails.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 dark:text-white capitalize text-sm truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: categoryDetails.color }} />
                          <span className="text-[9px] text-slate-400 font-extrabold pb-0.5 uppercase tracking-wider truncate">
                            {categoryDetails.name.split(' (')[0]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Toggle payed status indicator */}
                      <button
                        onClick={() => toggleStatus(item)}
                        className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                          isPaid 
                            ? 'bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600' 
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 border-slate-100 dark:border-slate-750 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                        title={isPaid ? 'Marcar como Pendente' : 'Marcar como Pago'}
                      >
                        {isPaid ? <CheckCircle2 size={13} /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                      </button>
                      
                      <button
                        onClick={() => setContaToDelete(item)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                        title="Remover Conta"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Financial displays */}
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-50 dark:border-slate-800/80 pt-3.5">
                    <div>
                      <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Vencimento</p>
                      <p className={`text-xs font-black flex items-center gap-1.5 mt-0.5 ${
                        isPaid 
                          ? 'text-slate-400 line-through' 
                          : isOverdue 
                          ? 'text-rose-600 dark:text-rose-400 font-extrabold' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        {formatDate(item.dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Cobrado via / Banco</p>
                      <p className="text-xs font-black text-slate-600 dark:text-slate-400 mt-1 uppercase truncate" title={item.bank}>
                        {item.bank}
                      </p>
                    </div>
                  </div>

                  {/* Additional: Barcode / Notes / Warnings */}
                  {(item.barcode || item.notes) && (
                    <div className="mt-4 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950/20 border border-slate-100/50 dark:border-slate-800/40 text-[11px] space-y-1.5">
                      {item.barcode && (
                        <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-450">
                          <span className="font-mono truncate select-all">{item.barcode}</span>
                          <button
                            onClick={() => copyToClipboard(item.barcode!, item.id)}
                            className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-md transition-colors text-indigo-650 dark:text-indigo-400 cursor-pointer flex items-center gap-0.5 shrink-0"
                            title="Copiar código de barras"
                          >
                            {copiedId === item.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            <span className="font-extrabold text-[9px]">{copiedId === item.id ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-slate-405 dark:text-slate-400 italic">
                          💡 {item.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Operations footer */}
                <div className="mt-5 pt-3.5 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block -mb-0.5 tracking-wider">Valor total</span>
                    <span className={`text-base font-black ${isPaid ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {!isPaid && (
                    <button
                      onClick={() => handleQuickPayAction(item)}
                      className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 font-black rounded-xl text-[10px] whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <CheckCircle2 size={12} /> Pagar Conta
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW BILL MODAL */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                  <span>📄</span> Adicionar Conta / Boleto
                </h3>
                <button 
                  onClick={() => setIsNewModalOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-405 dark:text-slate-500 block mb-1.5">Descrição da Conta</label>
                  <input 
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Ex: Conta de Luz CPFL, Aluguel, Boleto Nu"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-405 block mb-1.5">Valor (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="Ex: 150.00"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-405 block mb-1.5">Data de Vencimento</label>
                    <input 
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 font-bold">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-405 block mb-1.5">Categoria</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-855 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-405 block mb-1.5">Banco de Origem</label>
                    <select
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-855 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all cursor-pointer"
                    >
                      {BANKS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-405 dark:text-slate-500 block mb-1.5">Código de Barras / Copia-PIX (Opcional)</label>
                  <input 
                    type="text"
                    maxLength={150}
                    placeholder="Cole a chave Pix ou linha digitável para facilitar na hora de pagar"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs dark:text-white outline-none focus:border-indigo-550 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-405 dark:text-slate-500 block mb-1.5">Observações (Opcional)</label>
                  <textarea 
                    maxLength={200}
                    rows={2}
                    placeholder="Observações adicionais (ex: parcelado 3/10, etc)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs dark:text-white outline-none focus:border-indigo-550 transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                  >
                    Salvar Conta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {contaToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setContaToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300 p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500 text-2xl animate-bounce">
                🗑️
              </div>
              
              <h3 className="text-lg font-black dark:text-white">Remover Lançamento de Conta</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Tem certeza de que deseja excluir a conta <strong className="text-slate-700 dark:text-slate-200 font-extrabold">"{contaToDelete.name}"</strong>? Ela será deletada permanentemente do seu histórico de boletos.
              </p>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setContaToDelete(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-850 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleDelete(contaToDelete.id)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
