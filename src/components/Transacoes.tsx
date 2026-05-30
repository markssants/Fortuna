import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Search, X, Filter, ChevronUp, ChevronDown } from 'lucide-react';
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
}

const Transacoes: React.FC<TransacoesProps> = ({
  transactions,
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
}) => {
  // Filter states moved from App.tsx
  const [typeFilter, setTypeFilter] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [bankFilter, setBankFilter] = useState('todos');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('todos');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  
  // Removed local inline edit states as they are now props

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
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
  }, [transactions, typeFilter, statusFilter, paymentMethodFilter, bankFilter, categoryFilter, startDateFilter, endDateFilter, txSearchQuery]);

  const activeFiltersCount = useMemo(() => {
    return (statusFilter !== 'todos' ? 1 : 0) +
           (paymentMethodFilter !== 'todos' ? 1 : 0) +
           (bankFilter !== 'todos' ? 1 : 0) +
           (categoryFilter !== 'todos' ? 1 : 0) +
           (startDateFilter ? 1 : 0) +
           (endDateFilter ? 1 : 0);
  }, [statusFilter, paymentMethodFilter, bankFilter, categoryFilter, startDateFilter, endDateFilter]);

  const clearAllFilters = () => {
    setTypeFilter('todos');
    setStatusFilter('todos');
    setCategoryFilter('todos');
    setBankFilter('todos');
    setPaymentMethodFilter('todos');
    setStartDateFilter('');
    setEndDateFilter('');
    setTxSearchQuery('');
  };

  return (
    <motion.div 
      key="transactions"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* ADVANCED FILTER SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-black dark:text-white">Listagem Completa</h3>
            
            {/* Segmented Type Filter */}
            <div className="flex bg-slate-100/50 dark:bg-slate-800/80 p-0.5 rounded-xl text-[10px] font-bold border border-slate-200/40 dark:border-slate-700/50 shadow-xs shrink-0 select-none backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setTypeFilter('todos')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${typeFilter === 'todos' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('entrada')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${typeFilter === 'entrada' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'}`}
              >
                <Plus size={10} /> Entradas
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('saida')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${typeFilter === 'saida' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500'}`}
              >
                <Minus size={10} /> Saídas
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 lg:flex-initial min-w-[200px] lg:min-w-[285px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10" size={14} />
              <input
                type="text"
                placeholder="Buscar por descrição, valor ou banco..."
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 bg-slate-100/50 hover:bg-slate-100/80 dark:bg-slate-800/70 dark:hover:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 backdrop-blur-sm relative"
              />
              {txSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTxSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors z-10"
                >
                  <X size={12} />
                </button>
              )}
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
                className="px-3 py-2.5 rounded-2xl text-xs font-bold border border-dashed text-rose-500 hover:text-rose-600 dark:text-rose-455 dark:hover:text-rose-400 border-rose-200 hover:border-rose-350 dark:border-rose-900/40 hover:dark:border-rose-800 transition-all flex items-center gap-1 hover:bg-rose-50/20"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
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

                {/* Filter Categoria */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Categoria</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-700 dark:text-slate-100 cursor-pointer capitalize transition-all backdrop-blur-md"
                  >
                    <option value="todos" className="dark:bg-slate-900">Todas Categorias</option>
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.name}</option>
                    ))}
                    <option value="salario" className="dark:bg-slate-900">Salário</option>
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
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xs border border-slate-100 dark:border-slate-800 overflow-hidden relative">
        {filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55 dark:bg-slate-905 border-b border-slate-100 dark:border-slate-800/80">
                  <th className="p-4 pl-6 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Tipo</th>
                  <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Descrição</th>
                  <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider text-left">Valor</th>
                  <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Data</th>
                  <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Categoria</th>
                  <th className="p-4 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider">Banco</th>
                  <th className="p-4 pr-6 font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredTransactions.map(t => (
                  <tr 
                    key={t.id} 
                    onClick={() => setSelectedTransaction(t)}
                    className={`transition-all duration-300 cursor-pointer ${getStatusColorClasses(t.status, true)}`}
                  >
                <td className="p-4">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setTypeMenuTx(t);
                      setTypeMenuAnchor({ x: e.clientX, y: e.clientY });
                    }}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase whitespace-nowrap cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all ${
                      t.type === 'entrada' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300'
                    }`}
                    title="Trocar tipo de transação"
                  >
                    {t.type === 'entrada' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {t.vaultId && (
                      <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                        Cofre
                      </span>
                    )}
                    <span className="text-xl shrink-0 select-none" title={CATEGORIES.find(c => c.id === t.category)?.name || t.category}>
                      {getCategoryIconAndStyle(t.category).icon}
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
                          className="px-2 py-0.5 text-sm font-semibold border-b-2 border-emerald-500 bg-slate-100 dark:bg-slate-800 rounded outline-none w-48 animate-fade-in"
                        />
                      ) : (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setInlineEdit({ id: t.id, field: 'description' });
                            setInlineValue(t.description);
                          }}
                          className="font-semibold dark:text-slate-200 cursor-pointer hover:underline decoration-dotted decoration-emerald-500/80 flex items-center gap-2"
                          title="Clique para editar descrição"
                        >
                          {t.description}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 uppercase tracking-tighter">{t.method}</span>
                    </div>
                  </div>
                </td>
                <td className={`p-4 text-sm font-bold text-left whitespace-nowrap ${t.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
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
                      className="px-2 py-0.5 text-xs text-left font-bold border-b-2 border-emerald-500 bg-slate-100 dark:bg-slate-800 rounded outline-none w-24"
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
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
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
                      className="px-1.5 py-0.5 text-xs border-b border-emerald-500 bg-slate-100 dark:bg-slate-800 rounded outline-none"
                    />
                  ) : (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setInlineEdit({ id: t.id, field: 'date' });
                        setInlineValue(t.date);
                      }}
                      className="cursor-pointer hover:underline decoration-dotted decoration-emerald-500/80"
                      title="Alterar data"
                    >
                      {formatDateDisplay(t.date)}
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryMenuTx(t);
                      setCategoryMenuAnchor({ x: e.clientX, y: e.clientY });
                    }}
                    className="px-2 py-1 bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-700/70 rounded text-xs font-semibold text-slate-600 dark:text-slate-400 capitalize cursor-pointer hover:ring-2 hover:ring-emerald-500/30 transition-all whitespace-nowrap"
                    title="Mudar categoria"
                  >
                    {CATEGORIES.find(c => c.id === t.category)?.name || t.category}
                  </span>
                </td>
                <td className="p-4 text-sm font-medium whitespace-nowrap dark:text-slate-300">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      setBankMenuTx(t);
                      setBankMenuAnchor({ x: e.clientX, y: e.clientY });
                    }}
                    className="cursor-pointer hover:text-emerald-500 hover:underline px-1.5 py-1 rounded transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Alterar banco"
                  >
                    {t.bank}
                  </span>
                </td>
                <td className="p-4 text-center">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Transacoes;
