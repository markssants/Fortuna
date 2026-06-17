import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Search, X, Filter, ChevronUp, ChevronDown, Copy, MoreHorizontal, Trash2, ArrowUpDown, Calendar } from 'lucide-react';
import { CATEGORIES, BANKS, getCategoryIconAndStyle, formatDateDisplay, getStatusColorClasses } from '../constants';

interface Transaction {
  id: string;
  type: string;
  value: number;
  date: string;
  category: string;
  bank: string;
  method: string;
  description: string;
  essential: boolean;
  status: string;
  recurring: boolean;
  vaultId?: string;
}

interface TransacoesProps {
  transactions: Transaction[];
  categories: { id: string, name: string, color: string, icon?: string }[];
  setSelectedTransaction: (tx: Transaction) => void;
  setTypeMenuTx: (tx: Transaction) => void;
  setTypeMenuAnchor: (anchor: { x: number; y: number }) => void;
  setCategoryMenuTx: (tx: Transaction) => void;
  setCategoryMenuAnchor: (anchor: { x: number; y: number }) => void;
  setBankMenuTx: (tx: Transaction) => void;
  setBankMenuAnchor: (anchor: { x: number; y: number }) => void;
  setStatusMenuTx: (tx: Transaction) => void;
  setStatusMenuAnchor: (anchor: { x: number; y: number }) => void;
  handleQuickFieldUpdate: (tx: Transaction, field: string, value: any) => void;
  inlineEdit: { id: string; field: string } | null;
  setInlineEdit: (edit: { id: string; field: string } | null) => void;
  inlineValue: string;
  setInlineValue: (value: string) => void;
  onDuplicateTransaction: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
}

const getGroupHeaderLabel = (dateStr: string) => {
  if (!dateStr) return 'Sem Data';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    // Today & Yesterday comparison in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(year, month - 1, day);
    targetDate.setHours(0, 0, 0, 0);
    
    let suffix = '';
    if (targetDate.getTime() === today.getTime()) {
      suffix = ' • Hoje';
    } else if (targetDate.getTime() === yesterday.getTime()) {
      suffix = ' • Ontem';
    } else {
      // weekday
      const weekdayStr = targetDate.toLocaleDateString('pt-BR', { weekday: 'long' });
      suffix = ' • ' + weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
    }
    
    const monthStr = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
    const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
    
    return `${day} de ${capitalizedMonth} de ${year}${suffix}`;
  } catch (e) {
    return dateStr;
  }
};

const formatMonthFilterOption = (yearMonthStr: string) => {
  if (!yearMonthStr || yearMonthStr === 'todos') return 'Todos';
  try {
    const [year, month] = yearMonthStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, 1);
    const monthStr = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
    const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
    return `${capitalizedMonth} de ${year}`;
  } catch (e) {
    return yearMonthStr;
  }
};

const Transacoes: React.FC<TransacoesProps> = ({
  transactions,
  categories,
  setSelectedTransaction,
  setTypeMenuTx,
  setTypeMenuAnchor,
  setCategoryMenuTx,
  setCategoryMenuAnchor,
  setBankMenuTx,
  setBankMenuAnchor,
  setStatusMenuTx,
  setStatusMenuAnchor,
  handleQuickFieldUpdate,
  inlineEdit,
  setInlineEdit,
  inlineValue,
  setInlineValue,
  onDuplicateTransaction,
  onDeleteTransaction,
}) => {
  // Filter states moved from App.tsx
  const [boxFilter, setBoxFilter] = useState<'todos' | 'em_conta' | 'futuro' | 'pendente' | 'total_gasto' | 'total_entrado' | 'saldo_total' | 'contas'>('todos');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [bankFilter, setBankFilter] = useState('todos');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('todos');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Dynamically compute unique months present in the transactions
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.substring(0, 7)); // YYYY-MM
      }
    });
    // Add current month if empty
    if (monthsSet.size === 0) {
      const today = new Date();
      const yr = today.getFullYear();
      const mo = String(today.getMonth() + 1).padStart(2, '0');
      monthsSet.add(`${yr}-${mo}`);
    }
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Action Menu state
  const [actionsMenuTx, setActionsMenuTx] = useState<Transaction | null>(null);
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  
  // Date sorting state
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');

  // Status cycling state/function
  const cycleStatusFilter = () => {
    const statuses = ['todos', 'pago', 'pendente', 'atrasado', 'futuro'];
    const nextIdx = (statuses.indexOf(statusFilter) + 1) % statuses.length;
    setStatusFilter(statuses[nextIdx]);
  };
  
  // Removed local inline edit states as they are now props

  const statsLocal = useMemo(() => {
    const totalIn = transactions.filter(t => t.type === 'entrada').reduce((acc, curr) => acc + curr.value, 0);
    const totalOut = transactions.filter(t => t.type === 'saida').reduce((acc, curr) => acc + curr.value, 0);
    
    // Status-based balances
    const receivedIn = transactions.filter(t => t.type === 'entrada' && t.status === 'pago').reduce((acc, curr) => acc + curr.value, 0);
    const receivedOut = transactions.filter(t => t.type === 'saida' && t.status === 'pago').reduce((acc, curr) => acc + curr.value, 0);
    const balanceRecebido = receivedIn - receivedOut;

    const futureIn = transactions.filter(t => t.type === 'entrada' && t.status === 'futuro').reduce((acc, curr) => acc + curr.value, 0);
    const futureOut = transactions.filter(t => t.type === 'saida' && t.status === 'futuro').reduce((acc, curr) => acc + curr.value, 0);
    const balanceFuturo = futureIn - futureOut;

    const pendingIn = transactions.filter(t => t.type === 'entrada' && t.status === 'pendente').reduce((acc, curr) => acc + curr.value, 0);
    const pendingOut = transactions.filter(t => t.type === 'saida' && (t.status === 'pendente' || t.status === 'atrasado')).reduce((acc, curr) => acc + curr.value, 0);
    const balancePendente = pendingIn - pendingOut;

    // Helper to identify a bill/conta transaction
    const isContaTx = (t: Transaction) => {
      return t.category === 'servicos' || t.description?.startsWith('Conta: ') || !!(t as any).linkedContaId;
    };

    // Helper to identify a subscription
    const isAssinaturaTx = (t: Transaction) => {
      return t.category === 'assinaturas';
    };

    const totalContas = transactions.filter(t => (isContaTx(t) || isAssinaturaTx(t)) && t.type === 'saida').reduce((acc, curr) => acc + curr.value, 0);

    return {
      balance: totalIn - totalOut,
      balanceRecebido,
      balanceFuturo,
      balancePendente,
      totalOut,
      totalIn,
      totalContas,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const list = transactions.filter(t => {
      // 0. Box Filter
      if (boxFilter === 'em_conta') {
        if (t.status !== 'pago') return false;
      } else if (boxFilter === 'futuro') {
        if (t.status !== 'futuro') return false;
      } else if (boxFilter === 'pendente') {
        if (t.status !== 'pendente' && t.status !== 'atrasado') return false;
      } else if (boxFilter === 'total_gasto') {
        if (t.type !== 'saida') return false;
      } else if (boxFilter === 'total_entrado') {
        if (t.type !== 'entrada') return false;
      } else if (boxFilter === 'contas') {
        const isConta = t.category === 'servicos' || t.description?.startsWith('Conta: ') || !!(t as any).linkedContaId;
        const isAssinatura = t.category === 'assinaturas';
        if (!isConta && !isAssinatura) return false;
      }

      // 1. Type
      if (typeFilter !== 'todos' && t.type !== typeFilter) return false;
      // 2. Status
      if (statusFilter !== 'todos' && t.status !== statusFilter) return false;
      // 3. Payment Method
      if (paymentMethodFilter !== 'todos' && t.method !== paymentMethodFilter) return false;
      // 4. Bank
      if (bankFilter !== 'todos' && t.bank !== bankFilter) return false;
      // 5. Category
      if (categoryFilter !== 'todos' && t.category !== categoryFilter) return false;
      // 6. Dates
      if (startDateFilter && t.date < startDateFilter) return false;
      if (endDateFilter && t.date > endDateFilter) return false;
      
      // 6.5. Month Filter
      if (monthFilter !== 'todos' && (!t.date || !t.date.startsWith(monthFilter))) return false;
      
      // 7. Search
      if (txSearchQuery.trim()) {
        const q = txSearchQuery.toLowerCase();
        const descMatches = t.description?.toLowerCase().includes(q);
        const valFormatted = t.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).toLowerCase();
        const valStr = t.value?.toString().toLowerCase();
        const valMatches = valStr?.includes(q) || valFormatted?.includes(q);
        const bankMatches = t.bank?.toLowerCase().includes(q);
        const catMatches = t.category?.toLowerCase().includes(q);
        const methodMatches = t.method?.toLowerCase().includes(q);
        const statusMatches = t.status?.toLowerCase().includes(q);
        if (!descMatches && !valMatches && !bankMatches && !catMatches && !methodMatches && !statusMatches) return false;
      }
      return true;
    });

    // Sort by date based on dateSortOrder
    list.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const cmp = dateSortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      return b.id.localeCompare(a.id); // stability
    });

    return list;
  }, [transactions, boxFilter, typeFilter, statusFilter, paymentMethodFilter, bankFilter, categoryFilter, startDateFilter, endDateFilter, txSearchQuery, dateSortOrder, monthFilter]);

  const activeFiltersCount = useMemo(() => {
    return (boxFilter !== 'todos' ? 1 : 0) +
           (statusFilter !== 'todos' ? 1 : 0) +
           (paymentMethodFilter !== 'todos' ? 1 : 0) +
           (bankFilter !== 'todos' ? 1 : 0) +
           (categoryFilter !== 'todos' ? 1 : 0) +
           (startDateFilter ? 1 : 0) +
           (endDateFilter ? 1 : 0) +
           (monthFilter !== 'todos' ? 1 : 0);
  }, [boxFilter, statusFilter, paymentMethodFilter, bankFilter, categoryFilter, startDateFilter, endDateFilter, monthFilter]);

  const groupedByDate = useMemo(() => {
    const groups: { 
      date: string; 
      label: string; 
      list: Transaction[]; 
      total: number;
      entries: number;
      exits: number;
      accumulatedBalance: number;
    }[] = [];

    filteredTransactions.forEach(t => {
      let group = groups.find(g => g.date === t.date);
      if (!group) {
        group = {
          date: t.date,
          label: getGroupHeaderLabel(t.date),
          list: [],
          total: 0,
          entries: 0,
          exits: 0,
          accumulatedBalance: 0
        };
        groups.push(group);
      }
      group.list.push(t);
      if (t.type === 'entrada') {
        group.entries += t.value;
        group.total += t.value;
      } else {
        group.exits += t.value;
        group.total -= t.value;
      }
    });

    // Compute accumulated balances chronologically (oldest first)
    const sortedDates = [...groups].sort((a, b) => a.date.localeCompare(b.date));
    let runningAccum = 0;
    sortedDates.forEach(g => {
      // Calculate total of 'pago' (paid) transactions for this date group
      let dayPaidTotal = 0;
      g.list.forEach(t => {
        if (t.status === 'pago') {
          if (t.type === 'entrada') {
            dayPaidTotal += t.value;
          } else {
            dayPaidTotal -= t.value;
          }
        }
      });
      runningAccum += dayPaidTotal;
      g.accumulatedBalance = runningAccum;
    });

    return groups;
  }, [filteredTransactions]);

  const clearAllFilters = () => {
    setBoxFilter('todos');
    setTypeFilter('todos');
    setStatusFilter('todos');
    setCategoryFilter('todos');
    setBankFilter('todos');
    setPaymentMethodFilter('todos');
    setStartDateFilter('');
    setEndDateFilter('');
    setTxSearchQuery('');
    setMonthFilter('todos');
  };

  return (
    <motion.div 
      key="transactions"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Resumo de Saldos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {/* Card Em Conta */}
        <div 
          onClick={() => setBoxFilter(prev => prev === 'em_conta' ? 'todos' : 'em_conta')}
          className={`p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${
            boxFilter === 'em_conta'
              ? 'bg-teal-100/70 dark:bg-teal-950/40 border-teal-400 dark:border-teal-500 ring-2 ring-teal-500/30 shadow-md scale-[1.02]'
              : boxFilter !== 'todos'
              ? 'opacity-45 saturate-[45%] scale-[0.96] border-transparent bg-teal-50/40 dark:bg-teal-950/10'
              : 'bg-teal-50/40 dark:bg-teal-950/10 border border-teal-100/50 dark:border-teal-900/30 hover:shadow-xs hover:bg-teal-50/60 dark:hover:bg-teal-950/15'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-700 dark:text-teal-400 mb-1 block">
            ✅ Em Conta {boxFilter === 'em_conta' && '• Ativo'}
          </span>
          <p className="text-base font-black tracking-tight text-teal-900 dark:text-teal-100">
            R$ {statsLocal.balanceRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card Futuro */}
        <div 
          onClick={() => setBoxFilter(prev => prev === 'futuro' ? 'todos' : 'futuro')}
          className={`p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${
            boxFilter === 'futuro'
              ? 'bg-sky-100/70 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500 ring-2 ring-sky-500/30 shadow-md scale-[1.02]'
              : boxFilter !== 'todos'
              ? 'opacity-45 saturate-[45%] scale-[0.96] border-transparent bg-sky-50/40 dark:bg-sky-950/10'
              : 'bg-sky-50/40 dark:bg-sky-950/10 border border-teal-100/50 dark:border-teal-900/30 hover:shadow-xs hover:bg-sky-50/60 dark:hover:bg-sky-950/15'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-700 dark:text-sky-400 mb-1 block">
            🔮 Futuro {boxFilter === 'futuro' && '• Ativo'}
          </span>
          <p className="text-base font-black tracking-tight text-sky-900 dark:text-sky-100">
            R$ {statsLocal.balanceFuturo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card Pendente */}
        <div 
          onClick={() => setBoxFilter(prev => prev === 'pendente' ? 'todos' : 'pendente')}
          className={`p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${
            boxFilter === 'pendente'
              ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 ring-2 ring-amber-500/30 shadow-md scale-[1.02]'
              : boxFilter !== 'todos'
              ? 'opacity-45 saturate-[45%] scale-[0.96] border-transparent bg-amber-50/40 dark:bg-amber-950/10'
              : 'bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/30 hover:shadow-xs hover:bg-amber-50/60 dark:hover:bg-amber-950/15'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1 block">
            ⏳ Pendente {boxFilter === 'pendente' && '• Ativo'}
          </span>
          <p className="text-base font-black tracking-tight text-amber-900 dark:text-amber-100">
            R$ {statsLocal.balancePendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card Total Entrado */}
        <div 
          onClick={() => setBoxFilter(prev => prev === 'total_entrado' ? 'todos' : 'total_entrado')}
          className={`p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${
            boxFilter === 'total_entrado'
              ? 'bg-emerald-100/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500 ring-2 ring-emerald-500/30 shadow-md scale-[1.02]'
              : boxFilter !== 'todos'
              ? 'opacity-45 saturate-[45%] scale-[0.96] border-transparent bg-emerald-50/40 dark:bg-emerald-950/10'
              : 'bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 hover:shadow-xs hover:bg-emerald-50/60 dark:hover:bg-emerald-950/15'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-1 block">
            💰 Entrado {boxFilter === 'total_entrado' && '• Ativo'}
          </span>
          <p className="text-base font-black tracking-tight text-emerald-900 dark:text-emerald-100">
            R$ {statsLocal.totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card Total Gasto */}
        <div 
          onClick={() => setBoxFilter(prev => prev === 'total_gasto' ? 'todos' : 'total_gasto')}
          className={`p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${
            boxFilter === 'total_gasto'
              ? 'bg-rose-100/70 dark:bg-rose-950/40 border-rose-400 dark:border-rose-500 ring-2 ring-rose-500/30 shadow-md scale-[1.02]'
              : boxFilter !== 'todos'
              ? 'opacity-45 saturate-[45%] scale-[0.96] border-transparent bg-rose-50/40 dark:bg-rose-950/10'
              : 'bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/30 hover:shadow-xs hover:bg-rose-50/60 dark:hover:bg-rose-950/15'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-800 dark:text-rose-400 mb-1 block">
            💸 Gasto {boxFilter === 'total_gasto' && '• Ativo'}
          </span>
          <p className="text-base font-black tracking-tight text-rose-900 dark:text-rose-100">
            R$ {statsLocal.totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card Saldo Total */}
        <div 
          onClick={() => setBoxFilter(prev => prev === 'saldo_total' ? 'todos' : 'saldo_total')}
          className={`p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${
            boxFilter === 'saldo_total'
              ? 'bg-indigo-100/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/30 shadow-md scale-[1.02]'
              : boxFilter !== 'todos'
              ? 'opacity-45 saturate-[45%] scale-[0.96] border-transparent bg-indigo-50/50 dark:bg-indigo-950/10'
              : 'bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/30 hover:shadow-xs hover:bg-indigo-50/70 dark:hover:bg-indigo-950/15'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 dark:text-indigo-400 mb-1 block">
            💵 Saldo {boxFilter === 'saldo_total' && '• Ativo'}
          </span>
          <p className="text-base font-black tracking-tight text-indigo-900 dark:text-indigo-100">
            R$ {statsLocal.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Card Contas */}
        <div 
          onClick={() => setBoxFilter(prev => prev === 'contas' ? 'todos' : 'contas')}
          className={`p-4 rounded-3xl flex flex-col justify-between transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${
            boxFilter === 'contas'
              ? 'bg-violet-100/70 dark:bg-violet-950/40 border-violet-400 dark:border-violet-500 ring-2 ring-violet-500/30 shadow-md scale-[1.02]'
              : boxFilter !== 'todos'
              ? 'opacity-45 saturate-[45%] scale-[0.96] border-transparent bg-violet-50/40 dark:bg-violet-950/10'
              : 'bg-violet-50/40 dark:bg-violet-950/10 border border-violet-100/50 dark:border-violet-900/30 hover:shadow-xs hover:bg-violet-50/60 dark:hover:bg-violet-950/15'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-800 dark:text-violet-400 mb-1 block">
            🧾 Contas {boxFilter === 'contas' && '• Ativo'}
          </span>
          <p className="text-base font-black tracking-tight text-violet-900 dark:text-violet-100">
            R$ {statsLocal.totalContas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* ADVANCED FILTER SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-black dark:text-white">Listagem Completa</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search Bar */}
            <div className={`relative transition-all duration-300 ease-in-out overflow-hidden rounded-full ${isSearchFocused || txSearchQuery ? 'w-40 sm:w-48' : 'w-9'}`}>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" size={13} />
              <input
                type="text"
                placeholder={isSearchFocused || txSearchQuery ? "Buscar..." : ""}
                value={txSearchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className={`w-full h-9 pl-8 pr-8 py-2 bg-slate-100/50 hover:bg-slate-100/80 dark:bg-slate-800/70 dark:hover:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-slate-200 transition-all backdrop-blur-sm relative ${
                  isSearchFocused || txSearchQuery 
                    ? 'placeholder:text-slate-400 dark:placeholder:text-slate-500 cursor-text' 
                    : 'placeholder:text-transparent cursor-pointer'
                }`}
              />
              {txSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setTxSearchQuery('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors z-10"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Month Filter Selector */}
            <div className="relative flex-1 lg:flex-initial min-w-[160px] lg:min-w-[190px]">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-slate-100/50 hover:bg-slate-100/80 dark:bg-slate-800/70 dark:hover:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer transition-all backdrop-blur-sm appearance-none outline-none"
              >
                <option value="todos" className="dark:bg-slate-900 font-semibold">Mês: Todos</option>
                {availableMonths.map(m => (
                  <option key={m} value={m} className="dark:bg-slate-900 font-semibold">
                    {formatMonthFilterOption(m)}
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                <Calendar size={13} />
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                <ChevronDown size={11} />
              </div>
            </div>

            {/* Advanced Filters Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 cursor-pointer transition-all ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50'
                  : 'bg-slate-100/50 hover:bg-slate-100/80 dark:bg-slate-800/80 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 backdrop-blur-sm'
              }`}
            >
              <Filter size={13} />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="bg-emerald-500 text-white rounded-full text-[10px] px-1.5 py-0.5 font-black scale-90 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              {showAdvancedFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {/* Clear Filters Button */}
            {(activeFiltersCount > 0 || typeFilter !== 'todos') && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-3 py-2.5 rounded-2xl text-xs font-bold border border-dashed text-rose-700 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300 border-rose-200 hover:border-rose-350 dark:border-rose-900/40 hover:dark:border-rose-800 transition-all flex items-center gap-1 hover:bg-rose-50/20"
                title="Limpar todos os filtros"
              >
                <X size={12} />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden border-t border-slate-100 dark:border-slate-800/60 pt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
                {/* Filter Tipo */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Tipo</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as 'todos' | 'entrada' | 'saida')}
                    className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer transition-all backdrop-blur-md"
                  >
                    <option value="todos" className="dark:bg-slate-900">Todos Tipos</option>
                    <option value="entrada" className="dark:bg-slate-900">Entrada</option>
                    <option value="saida" className="dark:bg-slate-900">Saída</option>
                  </select>
                </div>

                {/* Filter Categoria */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Categoria</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer capitalize transition-all backdrop-blur-md"
                  >
                    <option value="todos" className="dark:bg-slate-900">Todas Categorias</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Banco */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Banco</label>
                  <select
                    value={bankFilter}
                    onChange={(e) => setBankFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer transition-all backdrop-blur-md"
                  >
                    <option value="todos" className="dark:bg-slate-900">Todos Bancos</option>
                    {BANKS.map(b => (
                      <option key={b} value={b} className="dark:bg-slate-900">{b}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer transition-all backdrop-blur-md"
                  >
                    <option value="todos" className="dark:bg-slate-900">Todos Status</option>
                    <option value="pago" className="dark:bg-slate-900">Pago</option>
                    <option value="pendente" className="dark:bg-slate-900">Pendente</option>
                    <option value="atrasado" className="dark:bg-slate-900">Atrasado</option>
                    <option value="futuro" className="dark:bg-slate-900">Futuro</option>
                  </select>
                </div>

                {/* Filter Método */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Método</label>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer transition-all backdrop-blur-md"
                  >
                    <option value="todos" className="dark:bg-slate-900">Todos Métodos</option>
                    {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'Transferência'].map(m => (
                      <option key={m} value={m} className="dark:bg-slate-900">{m}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Data Inicial */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Data Inicial</label>
                  <input
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer transition-all backdrop-blur-md"
                  />
                </div>

                {/* Filter Data Final */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Data Final</label>
                  <input
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer transition-all backdrop-blur-md"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

       {/* LIST CONTAINER */}
      <div className="relative">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xs border border-slate-100 dark:border-slate-800 overflow-hidden p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full text-slate-400 dark:text-slate-500 mb-2">
              <Filter size={32} />
            </div>
            <h4 className="font-bold text-slate-700 dark:text-slate-350">Nenhuma transação encontrada</h4>
            <p className="text-xs text-slate-450 dark:text-slate-500 max-w-sm leading-relaxed">Não encontramos transações correspondentes aos filtros aplicados. Tente limpar os filtros selecionados.</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl active:scale-95 transition-all cursor-pointer shadow-md"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* COLUMN HEADERS TABLE - RENDERED ONCE AT THE TOP */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800/80 overflow-hidden pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/40 dark:bg-slate-900/40">
                      <th 
                        onClick={() => {
                          setTypeFilter(prev => {
                            if (prev === 'todos') return 'entrada';
                            if (prev === 'entrada') return 'saida';
                            return 'todos';
                          });
                        }}
                        className="p-4 pl-6 font-black text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-[0.1em] bg-slate-50/30 dark:bg-slate-800/20 w-28 min-w-[112px] max-w-[112px] cursor-pointer select-none transition-all hover:text-indigo-600 dark:hover:text-indigo-400 group/type-header"
                        title="Filtrar Tipo: Todos -> Entradas -> Saídas"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Tipo</span>
                          {typeFilter === 'todos' && <Filter size={11} className="text-slate-400 dark:text-slate-500 group-hover/type-header:scale-110 transition-transform" />}
                          {typeFilter === 'entrada' && <Plus size={11} className="text-emerald-500 dark:text-emerald-400 scale-110 font-bold animate-pulse" />}
                          {typeFilter === 'saida' && <Minus size={11} className="text-rose-500 dark:text-rose-450 scale-110 font-bold animate-pulse" />}
                        </div>
                      </th>
                      <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider min-w-[150px]">Descrição</th>
                      <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider text-left w-32 min-w-[128px] max-w-[128px]">Valor</th>
                      <th 
                        onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="p-4 font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-[10px] uppercase tracking-wider w-32 min-w-[128px] max-w-[128px] cursor-pointer select-none transition-all group/date-header"
                        title={dateSortOrder === 'desc' ? 'Ordenar por data mais antiga' : 'Ordenar por data mais recente'}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Data</span>
                          <ArrowUpDown 
                            size={12} 
                            className={`transition-all duration-300 ${
                              dateSortOrder === 'asc' 
                                ? 'rotate-180 text-emerald-500 dark:text-emerald-400' 
                                : 'text-indigo-600 dark:text-indigo-400'
                            } group-hover/date-header:scale-110`} 
                          />
                        </div>
                      </th>
                      <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider w-36 min-w-[144px] max-w-[144px]">Categoria</th>
                      <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider w-28 min-w-[112px] max-w-[112px]">Banco</th>
                      <th 
                        onClick={cycleStatusFilter}
                        className="p-4 font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-[10px] uppercase tracking-wider text-center w-28 min-w-[112px] max-w-[112px] cursor-pointer select-none transition-all group/status-header"
                        title={`Filtrar por Status (Atual: ${statusFilter === 'todos' ? 'Todos' : statusFilter === 'pago' ? 'Pago' : statusFilter === 'pendente' ? 'Pendente' : statusFilter === 'atrasado' ? 'Atrasado' : 'Futuro'}) - Clique para alternar`}
                        id="status-column-header"
                      >
                        <div className="flex items-center justify-center gap-1.5 mx-auto">
                          <span>Status</span>
                          <ArrowUpDown 
                            size={11} 
                            className={`transition-all duration-300 ${
                              statusFilter !== 'todos' 
                                ? 'text-emerald-500 dark:text-emerald-400 scale-110 font-black' 
                                : 'text-slate-400 dark:text-slate-600 group-hover/status-header:text-indigo-600 dark:group-hover/status-header:text-indigo-400'
                            } group-hover/status-header:scale-110`} 
                          />
                        </div>
                        {statusFilter !== 'todos' && (
                          <span className="block text-[8px] font-black tracking-widest text-emerald-500 dark:text-emerald-400 mt-0.5 animate-pulse uppercase">
                            {statusFilter}
                          </span>
                        )}
                      </th>
                      <th className="p-2 pr-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider text-center w-16 min-w-[64px] max-w-[64px]">Ações</th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>

            {/* DAILY BOXES GROUPED BY DATE */}
            {groupedByDate.map(group => (
              <div 
                key={group.date}
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-800/80 overflow-hidden relative transition-all duration-300 hover:shadow-2xs hover:border-slate-250 dark:hover:border-slate-700/80 group/daybox ml-0.5 mr-0.5"
              >
                {/* Day Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-slate-50/40 dark:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800/30 transition-colors gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      {group.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">
                      {group.list.length} {group.list.length === 1 ? 'lançamento' : 'lançamentos'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:-translate-y-[1.5px]">
                    {/* Sum of entries */}
                    {group.entries > 0 && group.exits > 0 && (
                      <div className="flex items-center gap-1 bg-emerald-50/50 dark:bg-emerald-950/25 px-2.5 py-1 rounded-full border border-emerald-100/50 dark:border-emerald-900/40">
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Entrou:</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {group.entries.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    
                    {/* Sum of exits */}
                    {group.entries > 0 && group.exits > 0 && (
                      <div className="flex items-center gap-1 bg-rose-50/50 dark:bg-rose-950/25 px-2.5 py-1 rounded-full border border-rose-100/50 dark:border-rose-900/40">
                        <span className="text-[8px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">Saiu:</span>
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                          R$ {group.exits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* Day Balance */}
                    <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-200/10 dark:border-slate-700/20">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Saldo Dia:</span>
                      <span className={`text-xs font-black tracking-wide ${group.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {group.total >= 0 ? '+' : ''} R$ {group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Accumulated Balance */}
                    <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">SALDO EM CONTA:</span>
                      <span className="text-xs font-black tracking-wide text-slate-800 dark:text-slate-200">
                        R$ {group.accumulatedBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Day Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {group.list.map(t => (
                        <tr 
                          key={t.id}
                          onClick={() => setSelectedTransaction(t)}
                          className="transition-all duration-300 cursor-pointer hover:bg-slate-50/30 dark:hover:bg-slate-800/10 group/row"
                        >
                          <td className={`p-4 pl-6 transition-colors duration-300 font-bold w-28 min-w-[112px] max-w-[112px] ${
                            t.type === 'entrada' 
                              ? 'bg-emerald-50/35 dark:bg-emerald-900/5 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-50/35 dark:bg-rose-900/5 text-rose-700 dark:text-rose-400'
                          }`}>
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setTypeMenuTx(t);
                                setTypeMenuAnchor({ x: e.clientX, y: e.clientY });
                              }}
                              className="flex items-center gap-2.5 cursor-pointer uppercase text-[10px] tracking-[0.1em]"
                              title="Trocar tipo de transação"
                            >
                              <div className={`w-1.5 h-3 rounded-full ${t.type === 'entrada' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {t.type === 'entrada' ? 'Entrada' : 'Saída'}
                            </div>
                          </td>
                          <td className={`p-4 transition-colors duration-300 min-w-[150px] ${getStatusColorClasses(t.status, true)}`}>
                            <div className="flex items-center gap-3">
                              {t.vaultId && (
                                <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                                  Cofre
                                </span>
                              )}
                              <span className="text-xl shrink-0 select-none" title={categories.find(c => c.id === t.category)?.name || t.category}>
                                {categories.find(c => c.id === t.category)?.icon || getCategoryIconAndStyle(t.category).icon}
                              </span>
                              <div className="flex flex-col">
                                {inlineEdit?.id === t.id && inlineEdit?.field === 'description' ? (
                                  <input
                                    type="text"
                                    value={inlineValue}
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setInlineValue(e.target.value)}
                                    onBlur={() => {
                                      handleQuickFieldUpdate(t, 'description', inlineValue);
                                      setInlineEdit(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleQuickFieldUpdate(t, 'description', inlineValue);
                                        setInlineEdit(null);
                                      } else if (e.key === 'Escape') {
                                        setInlineEdit(null);
                                      }
                                    }}
                                    className="px-2 py-0.5 text-sm font-semibold border-b-2 border-emerald-500 bg-white dark:bg-slate-800 rounded outline-none w-48 animate-fade-in"
                                  />
                                ) : (
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInlineEdit({ id: t.id, field: 'description' });
                                      setInlineValue(t.description);
                                    }}
                                    className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer hover:underline decoration-dotted decoration-emerald-500/80 flex items-center gap-2"
                                    title="Clique para editar descrição"
                                  >
                                    {t.description}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{t.method}</span>
                              </div>
                            </div>
                          </td>
                          <td className={`p-4 text-sm font-bold text-left whitespace-nowrap transition-colors duration-300 w-32 min-w-[128px] max-w-[128px] ${getStatusColorClasses(t.status, true)} ${t.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {inlineEdit?.id === t.id && inlineEdit?.field === 'value' ? (
                              <input
                                type="text"
                                value={inlineValue}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onBlur={() => {
                                  handleQuickFieldUpdate(t, 'value', inlineValue);
                                  setInlineEdit(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleQuickFieldUpdate(t, 'value', inlineValue);
                                    setInlineEdit(null);
                                  } else if (e.key === 'Escape') {
                                    setInlineEdit(null);
                                  }
                                }}
                                className="px-2 py-0.5 text-xs text-left font-bold border-b-2 border-emerald-500 bg-white dark:bg-slate-800 rounded outline-none w-24"
                              />
                            ) : (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInlineEdit({ id: t.id, field: 'value' });
                                  setInlineValue(t.value.toString());
                                }}
                                className="cursor-pointer hover:underline decoration-dotted decoration-emerald-500/80"
                                title="Clique para editar valor"
                              >
                                R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                          <td className={`p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap transition-colors duration-300 w-32 min-w-[128px] max-w-[128px] ${getStatusColorClasses(t.status, true)}`}>
                            {inlineEdit?.id === t.id && inlineEdit?.field === 'date' ? (
                              <input
                                type="date"
                                value={inlineValue}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setInlineValue(e.target.value)}
                                onBlur={() => {
                                  handleQuickFieldUpdate(t, 'date', inlineValue);
                                  setInlineEdit(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleQuickFieldUpdate(t, 'date', inlineValue);
                                    setInlineEdit(null);
                                  } else if (e.key === 'Escape') {
                                    setInlineEdit(null);
                                  }
                                }}
                                className="px-1.5 py-0.5 text-xs border-b border-emerald-500 bg-white dark:bg-slate-800 rounded outline-none"
                              />
                            ) : (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInlineEdit({ id: t.id, field: 'date' });
                                  setInlineValue(t.date);
                                }}
                                className="cursor-pointer hover:underline decoration-dotted decoration-emerald-505"
                                title="Alterar data"
                              >
                                {formatDateDisplay(t.date)}
                              </span>
                            )}
                          </td>
                          <td className={`p-4 transition-colors duration-300 w-36 min-w-[144px] max-w-[144px] ${getStatusColorClasses(t.status, true)}`}>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setCategoryMenuTx(t);
                                setCategoryMenuAnchor({ x: e.clientX, y: e.clientY });
                              }}
                              className="px-2 py-1 bg-white/40 dark:bg-slate-800/60 hover:bg-white/60 dark:hover:bg-slate-700/70 rounded text-xs font-semibold text-slate-600 dark:text-slate-400 capitalize cursor-pointer hover:ring-2 hover:ring-emerald-500/30 transition-all whitespace-nowrap"
                              title="Mudar categoria"
                            >
                              {categories.find(c => c.id === t.category)?.name || t.category}
                            </span>
                          </td>
                          <td className={`p-4 text-sm font-medium whitespace-nowrap dark:text-slate-300 transition-colors duration-300 w-28 min-w-[112px] max-w-[112px] ${getStatusColorClasses(t.status, true)}`}>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setBankMenuTx(t);
                                setBankMenuAnchor({ x: e.clientX, y: e.clientY });
                              }}
                              className="cursor-pointer hover:text-emerald-500 hover:underline px-1.5 py-1 rounded transition-all hover:bg-white/50 dark:hover:bg-slate-800/80"
                              title="Alterar banco"
                            >
                              {t.bank}
                            </span>
                          </td>
                          <td className={`p-4 text-center transition-colors duration-300 w-28 min-w-[112px] max-w-[112px] ${getStatusColorClasses(t.status, true)}`}>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setStatusMenuTx(t);
                                setStatusMenuAnchor({ x: e.clientX, y: e.clientY });
                              }}
                              className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase whitespace-nowrap cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all ${
                                t.status === 'atrasado' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300' : 
                                t.status === 'pago' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300' : 
                                t.status === 'futuro' ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300' :
                                'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'
                              }`}
                            >
                              {t.status === 'pago' ? 'Pago' : t.status === 'atrasado' ? 'Atrasado' : t.status === 'futuro' ? 'Futuro' : 'Pendente'}
                            </span>
                          </td>
                          <td className="p-2 pr-4 text-center w-16 min-w-[64px] max-w-[64px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionsMenuTx(t);
                                setActionsMenuAnchor({ x: e.clientX, y: e.clientY });
                              }}
                              className="p-1 bg-slate-50 dark:bg-slate-800 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-500 transition-all cursor-pointer inline-flex items-center justify-center border border-slate-100 dark:border-slate-800"
                              title="Opções"
                            >
                              <MoreHorizontal size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK ACTIONS POPUP MENU */}
      <AnimatePresence>
        {actionsMenuTx && actionsMenuAnchor && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => {
                setActionsMenuTx(null);
                setActionsMenuAnchor(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.12 }}
              style={{ 
                position: 'fixed',
                top: Math.min(actionsMenuAnchor.y + 12, window.innerHeight - 150),
                left: Math.min(actionsMenuAnchor.x - 120, window.innerWidth - 180),
              }}
              className="z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 w-40 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300"
            >
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                Opções
              </div>
              <button
                type="button"
                onClick={() => {
                  onDuplicateTransaction(actionsMenuTx);
                  setActionsMenuTx(null);
                  setActionsMenuAnchor(null);
                }}
                className="w-full px-3.5 py-2 text-xs font-black text-left flex items-center gap-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
              >
                <Copy size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                Duplicar
              </button>
              {onDeleteTransaction && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTransaction(actionsMenuTx.id);
                    setActionsMenuTx(null);
                    setActionsMenuAnchor(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-bold text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer text-rose-600 dark:text-rose-400"
                >
                  <Trash2 size={13} className="text-rose-500" />
                  Apagar
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Transacoes;
