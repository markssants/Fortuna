import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  DollarSign, 
  CreditCard,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  CheckCircle,
  Clock,
  Pencil,
  X
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

export interface Recorrente {
  id: string;
  name: string;
  value: number;
  dueDate: number; // day of month (1-31)
  category: string;
  status: 'ativo' | 'pausado';
  bank: string;
  userId?: string;
  createdAt?: string;
}

const CATEGORIES = [
  { id: 'alimentacao', name: 'Alimentação', color: '#10b981' },
  { id: 'transporte', name: 'Transporte', color: '#3b82f6' },
  { id: 'lazer', name: 'Lazer', color: '#f59e0b' },
  { id: 'saude', name: 'Saúde', color: '#ef4444' },
  { id: 'presentes', name: 'Presentes', color: '#ec4899' },
  { id: 'moradia', name: 'Moradia', color: '#8b5cf6' },
  { id: 'assinaturas', name: 'Assinaturas', color: '#06b6d4' },
  { id: 'outros', name: 'Outros', color: '#64748b' },
];

const BANKS = ['Nubank', 'Itaú', 'Inter', 'Bradesco', 'Santander', 'Dinheiro'];

interface RecorrentesProps {
  recurrentes: Recorrente[];
  setRecurrentes: React.Dispatch<React.SetStateAction<Recorrente[]>>;
  user: any;
  theme: 'light' | 'dark';
  onQuickPay?: (recorrente: Recorrente) => void;
  onUndoPay?: (recorrente: Recorrente) => void;
  transactions?: any[];
  triggerUndoToast?: (message: string, type: 'transaction' | 'meta' | 'cofre' | 'recorrente' | 'conta' | 'investment' | 'budget' | 'category', item: any, extraData?: any) => void;
}

const isPaidThisMonth = (item: Recorrente, transactions: any[]) => {
  const currentMonth = new Date().getMonth(); // 0-11
  const currentYear = new Date().getFullYear();
  return transactions.some(t => {
    if (!t.date) return false;
    const tDate = new Date(t.date + 'T12:00:00');
    const isSameMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    if (!isSameMonth) return false;

    // Match by recorrenteId or description match
    return (t.recorrenteId === item.id) || (t.description?.toLowerCase() === `mensal: ${item.name}`.toLowerCase());
  });
};

export default function Recorrentes({ 
  recurrentes, 
  setRecurrentes, 
  user, 
  theme, 
  onQuickPay, 
  onUndoPay,
  transactions,
  triggerUndoToast 
}: RecorrentesProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [recorrenteToDelete, setRecorrenteToDelete] = useState<Recorrente | null>(null);
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativo' | 'pausado' | 'pagos'>('todos');
  const [sortBy, setSortBy] = useState<'dueDate' | 'value'>('dueDate');

  // Form states
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [dueDate, setDueDate] = useState('10');
  const [category, setCategory] = useState('assinaturas');
  const [bank, setBank] = useState('Nubank');

  // Detail & Edit Popup states
  const [selectedRecorrente, setSelectedRecorrente] = useState<Recorrente | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editDueDate, setEditDueDate] = useState('10');
  const [editCategory, setEditCategory] = useState('assinaturas');
  const [editBank, setEditBank] = useState('Nubank');

  const handleOpenDetails = (item: Recorrente) => {
    setSelectedRecorrente(item);
    setIsEditMode(false);
    setEditName(item.name);
    setEditValue(item.value.toString());
    setEditDueDate(item.dueDate.toString());
    setEditCategory(item.category);
    setEditBank(item.bank);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecorrente || !editName || !editValue) return;

    const parsedValue = parseFloat(editValue) || 0;
    const parsedDueDate = parseInt(editDueDate) || 1;

    const updatedRecorrente: Recorrente = {
      ...selectedRecorrente,
      name: editName,
      value: parsedValue,
      dueDate: Math.max(1, Math.min(31, parsedDueDate)),
      category: editCategory,
      bank: editBank,
    };

    // Optimistic Update
    setRecurrentes(prev => prev.map(r => r.id === selectedRecorrente.id ? updatedRecorrente : r));

    const path = getPath();
    if (path) {
      try {
        await setDoc(doc(db, path, selectedRecorrente.id), updatedRecorrente);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${path}/${selectedRecorrente.id}`);
      }
    }

    setSelectedRecorrente(null); // Close modal on save to give a clear success feel
    setIsEditMode(false);
  };

  const getPath = () => {
    return user ? `users/${user.uid}/recurrentes` : null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value) return;

    const parsedValue = parseFloat(value) || 0;
    const parsedDueDate = parseInt(dueDate) || 1;

    const id = Date.now().toString();
    const newRecorrente: Recorrente = {
      id,
      name,
      value: parsedValue,
      dueDate: Math.max(1, Math.min(31, parsedDueDate)),
      category,
      status: 'ativo',
      bank,
      userId: user?.uid || '',
      createdAt: new Date().toISOString()
    };

    // Optimistic state update
    setRecurrentes(prev => [newRecorrente, ...prev]);

    const path = getPath();
    if (path) {
      try {
        await setDoc(doc(db, path, id), newRecorrente);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${id}`);
      }
    }

    // Reset Form
    setName('');
    setValue('');
    setDueDate('10');
    setCategory('assinaturas');
    setBank('Nubank');
    setIsNewModalOpen(false);
  };

  const toggleStatus = async (item: Recorrente) => {
    const newStatus = item.status === 'ativo' ? 'pausado' : 'ativo';
    const updated = { ...item, status: newStatus as 'ativo' | 'pausado' };

    // Optimistic Update
    setRecurrentes(prev => prev.map(r => r.id === item.id ? updated : r));

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
    const recorrenteToDeleteDoc = recurrentes.find(r => r.id === id);
    // Optimistic State Update
    setRecurrentes(prev => prev.filter(r => r.id !== id));

    const path = getPath();
    if (path) {
      try {
        await deleteDoc(doc(db, path, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
      }
    }

    if (recorrenteToDeleteDoc && triggerUndoToast) {
      triggerUndoToast(
        `Recorrência "${recorrenteToDeleteDoc.name}" excluída`,
        'recorrente',
        recorrenteToDeleteDoc
      );
    }

    setRecorrenteToDelete(null);
  };

  const filteredAndSortedList = useMemo(() => {
    return recurrentes
      .filter(r => {
        const isPaid = isPaidThisMonth(r, transactions || []);
        if (filterStatus === 'todos') return true;
        if (filterStatus === 'pagos') return isPaid;
        if (filterStatus === 'ativo') return r.status === 'ativo' && !isPaid;
        return r.status === filterStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'dueDate') {
          return a.dueDate - b.dueDate;
        } else {
          return b.value - a.value;
        }
      });
  }, [recurrentes, filterStatus, sortBy, transactions]);

  // Analytics
  const totalCommit = useMemo(() => {
    return recurrentes
      .filter(r => r.status === 'ativo')
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [recurrentes]);

  const pausedCommit = useMemo(() => {
    return recurrentes
      .filter(r => r.status === 'pausado')
      .reduce((acc, curr) => acc + curr.value, 0);
  }, [recurrentes]);

  const categoryLabels: Record<string, string> = {
    alimentacao: 'Alimentação',
    transporte: 'Transporte',
    lazer: 'Lazer',
    saude: 'Saúde',
    presentes: 'Presentes',
    moradia: 'Moradia',
    assinaturas: 'Assinaturas',
    outros: 'Outros'
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
            <span className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">🔁</span>
            Gastos Recorrentes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Mapeie e gerencie suas assinaturas, parcelas, contas recorrentes de todo mês de maneira prática.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/15 text-xs select-none active:scale-95 transition-all text-center cursor-pointer"
        >
          <Plus size={16} /> Novo Gasto Recorrente
        </button>
      </div>

      {/* SUMMARY STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center text-xl font-bold">
            💸
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Ativo Estimado</p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              R$ {totalCommit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-medium text-slate-400 block">por mês</span>
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-slate-50 dark:bg-slate-950/25 text-slate-500 flex items-center justify-center text-xl font-bold">
            ⏸️
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Pausado / Economizado</p>
            <h3 className="text-lg font-black text-slate-500 mt-0.5 dark:text-slate-400">
              R$ {pausedCommit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-medium text-slate-400 block">não tarifado</span>
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center text-xl font-bold">
            🗓️
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total de Lançamentos</p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {recurrentes.length} itens
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">
                {recurrentes.filter(r => r.status === 'ativo').length} ativos • {recurrentes.filter(r => r.status === 'pausado').length} pausados
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* FILTER & SORT TOOLS */}
      <div className="bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl w-full md:w-auto font-bold shadow-xs">
          <button
            onClick={() => setFilterStatus('todos')}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg transition-all text-center cursor-pointer ${filterStatus === 'todos' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus('ativo')}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg transition-all text-center cursor-pointer ${filterStatus === 'ativo' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Ativos
          </button>
          <button
            onClick={() => setFilterStatus('pausado')}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg transition-all text-center cursor-pointer ${filterStatus === 'pausado' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Pausados
          </button>
          <button
            onClick={() => setFilterStatus('pagos')}
            className={`flex-1 md:flex-initial px-4 py-1.5 rounded-lg transition-all text-center cursor-pointer ${filterStatus === 'pagos' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Pagos
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-slate-400 font-extrabold uppercase text-[10px]">Filtrar/Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'value')}
            className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-150 dark:border-slate-800 rounded-lg p-1.5 px-3 outline-none font-bold"
          >
            <option value="dueDate">Vencimento (Dia)</option>
            <option value="value">Valor (Maior)</option>
          </select>
        </div>
      </div>

      {/* RECURRENT ITEMS GRID */}
      {filteredAndSortedList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-12 text-center transition-colors duration-300">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/20 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">
            🔁
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Nenhum gasto recorrente</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mt-2">
            Mapear despesas fixas ajuda a entender seu custo mínimo de vida por mês, garantindo estabilidade orçamentária.
          </p>
          <button 
            type="button" 
            onClick={() => setIsNewModalOpen(true)}
            className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-3 px-6 rounded-2xl inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10 active:scale-95 transition-all"
          >
            <Plus size={14} /> Adicionar Gasto Fixo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedList.map((item) => {
            const expenseCategory = CATEGORIES.find(c => c.id === item.category);
            const isPaused = item.status === 'pausado';
            const isPaid = isPaidThisMonth(item, transactions || []);

            return (
              <motion.div 
                key={item.id}
                layout
                className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-xs p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 group/item cursor-pointer ${
                  isPaused 
                    ? 'border-slate-100 dark:border-slate-900 opacity-65 grayscale hover:grayscale-35' 
                    : isPaid
                      ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-500/[0.01]'
                      : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-200 hover:shadow-md'
                }`}
                onClick={() => handleOpenDetails(item)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Subscriptions visual indicator */}
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center font-black shadow-3xs text-xl">
                        {item.category === 'assinaturas' ? '📺' : '📦'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 dark:text-white capitalize text-sm">{item.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: expenseCategory?.color || '#a1a1aa' }} />
                          <span className="text-[9px] text-slate-400 font-extrabold pb-0.5 uppercase">
                            {categoryLabels[item.category] || item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isPaid && !isPaused && (
                        <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black flex items-center gap-1 shrink-0">
                          ✓ Quitado
                        </div>
                      )}
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStatus(item); }}
                        className={`p-1.5 rounded-lg border text-slate-500 transition-colors cursor-pointer ${
                          isPaused 
                            ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600' 
                            : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-600'
                        }`}
                        title={isPaused ? 'Ativar cobrança' : 'Pausar cobrança'}
                      >
                        {isPaused ? <Play size={12} className="fill-current" /> : <Pause size={12} className="fill-current" />}
                      </button>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); setRecorrenteToDelete(item); }}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-300 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                        title="Remover assinatura"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Financial displays */}
                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-slate-800/80 pt-3">
                    <div>
                      <p className="text-[9px] font-extrabold uppercase text-slate-400">Todo dia</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                        <Calendar size={13} className="text-slate-400" /> {item.dueDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-extrabold uppercase text-slate-400">Banco / Saída</p>
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 uppercase">
                        {item.bank}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operations footer */}
                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block -mb-0.5">Valor Mensal</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {!isPaused && (
                    isPaid ? (
                      onUndoPay && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onUndoPay(item); }}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/25 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 font-black rounded-xl text-[10px] whitespace-nowrap inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Marcar como não pago e remover da lista de transações"
                        >
                          <X size={10} /> Não Quitado
                        </button>
                      )
                    ) : (
                      onQuickPay && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onQuickPay(item); }}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/25 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 font-black rounded-xl text-[10px] whitespace-nowrap inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <CheckCircle size={10} /> Quitar / Registrar
                        </button>
                      )
                    )
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* CREATE NEW GASTO RECORRENTE MODAL */}
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
                <h3 className="text-lg font-black dark:text-white">Adicionar Gasto Recorrente</h3>
                <button 
                  onClick={() => setIsNewModalOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Descrição / Serviço</label>
                  <input 
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Ex: Netflix Premium, Academia, Energia"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Valor Mensal (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="Ex: 55.90"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-medium font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Dia de Vencimento</label>
                    <input 
                      type="number"
                      min="1"
                      max="31"
                      required
                      placeholder="Ex: 10"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-medium text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Categoria</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-bold"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Banco de Origem</label>
                    <select
                      value={bank}
                      onChange={(e) => setBank(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-bold"
                    >
                      {BANKS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
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
                    Salvar Cobrança
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {recorrenteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRecorrenteToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300 p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500 text-2xl animate-bounce">
                ♻️
              </div>
              
              <h3 className="text-lg font-black dark:text-white">Remover Recorrência</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Tem certeza de que deseja excluir o gasto recorrente <strong className="text-slate-700 dark:text-slate-200 font-extrabold">"{recorrenteToDelete.name}"</strong>? Ele deixará de ser somado e monitorado no planejamento fixo mensal.
              </p>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setRecorrenteToDelete(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-850 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleDelete(recorrenteToDelete.id)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                >
                  Excluir Ativo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED VIEW & EDIT MODAL */}
      <AnimatePresence>
        {selectedRecorrente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedRecorrente(null);
                setIsEditMode(false);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              {/* modal header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                  <span>🔁</span> {isEditMode ? 'Editar Recorrência' : 'Detalhes da Recorrência'}
                </h3>
                <div className="flex items-center gap-2">
                  {!isEditMode && (
                    <button
                      onClick={() => setIsEditMode(true)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-black"
                      title="Editar dados"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedRecorrente(null);
                      setIsEditMode(false);
                    }} 
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {!isEditMode ? (
                /* VIEWING MODE CONTENT */
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/30 p-4 rounded-3xl border border-slate-100/50 dark:border-slate-850/40">
                    <div className="w-14 h-14 rounded-2.5xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center font-black text-2xl shadow-3xs">
                      {selectedRecorrente.category === 'assinaturas' ? '📺' : '📦'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-405 uppercase tracking-widest text-[10px]">Serviço / Assinatura</h4>
                      <h3 className="text-base font-black text-slate-900 dark:text-white capitalize mt-0.5">{selectedRecorrente.name}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2.5xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Valor Mensal</p>
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        R$ {selectedRecorrente.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2.5xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Dia de Cobrança</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5 mt-1">
                        <Calendar size={18} className="text-slate-400" /> {selectedRecorrente.dueDate}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-extrabold uppercase text-[10px]">Categoria</span>
                      <span className="font-extrabold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                        {categoryLabels[selectedRecorrente.category] || selectedRecorrente.category}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-extrabold uppercase text-[10px]">Banco / Origem de Saída</span>
                      <span className="font-extrabold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg uppercase">
                        {selectedRecorrente.bank}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-extrabold uppercase text-[10px]">Status Operacional</span>
                      <span className={`font-black px-3 py-1 rounded-lg ${
                        selectedRecorrente.status === 'ativo' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450' 
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450'
                      }`}>
                        {selectedRecorrente.status === 'ativo' ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-extrabold uppercase text-[10px]">Situação de Pagamento</span>
                      <span className={`font-black px-3 py-1 rounded-lg ${
                        isPaidThisMonth(selectedRecorrente, transactions || [])
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      }`}>
                        {isPaidThisMonth(selectedRecorrente, transactions || []) ? '✓ Quitado este mês' : '⏳ Pendente'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {selectedRecorrente.status === 'ativo' && (
                      isPaidThisMonth(selectedRecorrente, transactions || []) ? (
                        onUndoPay && (
                          <button 
                            type="button"
                            onClick={() => {
                              onUndoPay(selectedRecorrente);
                              setSelectedRecorrente(null);
                            }}
                            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-2xl font-black text-xs cursor-pointer text-center transition-all active:scale-[0.98]"
                          >
                            Marcar Não Quitado
                          </button>
                        )
                      ) : (
                        onQuickPay && (
                          <button 
                            type="button"
                            onClick={() => {
                              onQuickPay(selectedRecorrente);
                              setSelectedRecorrente(null);
                            }}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-black text-xs cursor-pointer text-center transition-all active:scale-[0.98]"
                          >
                            Quitar / Registrar
                          </button>
                        )
                      )
                    )}
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedRecorrente(null);
                        setIsEditMode(false);
                      }}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-white py-3 rounded-2xl font-black text-xs cursor-pointer text-center"
                    >
                      Fechar Detalhes
                    </button>
                  </div>
                </div>
              ) : (
                /* EDITING MODE FORM */
                <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Descrição / Serviço</label>
                    <input 
                      type="text"
                      required
                      maxLength={100}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-500 transition-all font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Valor Mensal (R$)</label>
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Dia de Vencimento</label>
                      <input 
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-medium text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Categoria</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-bold cursor-pointer font-extrabold text-xs"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Banco de Origem</label>
                      <select
                        value={editBank}
                        onChange={(e) => setEditBank(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-indigo-550 transition-all font-bold cursor-pointer font-extrabold text-xs"
                      >
                        {BANKS.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <button 
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
