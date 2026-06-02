import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Pencil, 
  Palette, 
  Eye, 
  EyeOff, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  X,
  Layers,
  Scale
} from 'lucide-react';
import { CATEGORIES, getCategoryIconAndStyle } from '../constants';

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
}

interface OrcamentosProps {
  budgets: Record<string, number>;
  transactions: Transaction[];
  categories: { id: string; name: string; color: string; icon?: string }[];
  setIsBudgetModalOpen: (open: boolean) => void;
  setIsCategoryModalOpen: (open: boolean) => void;
  setSelectedBudgetCategory: (catId: string | null) => void;
  setNewBudget: (budget: { categoryId: string; limit: string }) => void;
  setEditingCategoryId: (id: string | null) => void;
  setNewCategory: (cat: { name: string; icon: string; color: string }) => void;
}

const Orcamentos: React.FC<OrcamentosProps> = ({
  budgets,
  transactions,
  categories,
  setIsBudgetModalOpen,
  setIsCategoryModalOpen,
  setSelectedBudgetCategory,
  setNewBudget,
  setEditingCategoryId,
  setNewCategory,
}) => {
  const [hiddenBudgets, setHiddenBudgets] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fortuna_hidden_budgets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showHidden, setShowHidden] = useState<boolean>(() => {
    return localStorage.getItem('fortuna_show_hidden_budgets') === 'true';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_limit' | 'without_limit' | 'exceeded'>('all');

  useEffect(() => {
    localStorage.setItem('fortuna_hidden_budgets', JSON.stringify(hiddenBudgets));
  }, [hiddenBudgets]);

  useEffect(() => {
    localStorage.setItem('fortuna_show_hidden_budgets', String(showHidden));
  }, [showHidden]);

  // Clean invalid/deleted custom categories from hidden list
  const currentCategoryIds = useMemo(() => new Set(categories.map(c => c.id)), [categories]);
  const activeHiddenList = useMemo(() => {
    return hiddenBudgets.filter(id => currentCategoryIds.has(id));
  }, [hiddenBudgets, currentCategoryIds]);

  // Calculate detailed stats per category
  const categoryStats = useMemo(() => {
    const stats: Record<string, { entries: number; exits: number; entriesCount: number; exitsCount: number }> = {};
    
    // Initialize for all active categories
    categories.forEach(c => {
      stats[c.id] = { entries: 0, exits: 0, entriesCount: 0, exitsCount: 0 };
    });

    // Populate from transactions
    transactions.forEach(t => {
      if (stats[t.category]) {
        if (t.type === 'entrada') {
          stats[t.category].entries += t.value;
          stats[t.category].entriesCount += 1;
        } else {
          stats[t.category].exits += t.value;
          stats[t.category].exitsCount += 1;
        }
      }
    });

    return stats;
  }, [categories, transactions]);

  // General dashboard summary stats
  const dashboardStats = useMemo(() => {
    let activeLimits = 0;
    let exceededLimits = 0;
    let totalPlannedLimit = 0;
    let totalSpentInLimited = 0;

    categories.forEach(c => {
      const limit = budgets[c.id] || 0;
      if (limit > 0) {
        activeLimits++;
        totalPlannedLimit += limit;
        
        const spent = categoryStats[c.id]?.exits || 0;
        totalSpentInLimited += spent;
        if (spent > limit) {
          exceededLimits++;
        }
      }
    });

    return {
      activeLimits,
      exceededLimits,
      totalPlannedLimit,
      totalSpentInLimited,
      percentUsed: totalPlannedLimit > 0 ? Math.min((totalSpentInLimited / totalPlannedLimit) * 100, 100) : 0
    };
  }, [categories, budgets, categoryStats]);

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let result = categories;

    // Apply Hidden filter
    if (!showHidden) {
      result = result.filter(c => !activeHiddenList.includes(c.id));
    }

    // Apply Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(query));
    }

    // Apply Quick Filter Type
    if (filterType === 'with_limit') {
      result = result.filter(c => (budgets[c.id] || 0) > 0);
    } else if (filterType === 'without_limit') {
      result = result.filter(c => !(budgets[c.id] || 0));
    } else if (filterType === 'exceeded') {
      result = result.filter(c => {
        const limit = budgets[c.id] || 0;
        const spent = categoryStats[c.id]?.exits || 0;
        return limit > 0 && spent > limit;
      });
    }

    // Sort categories, placing exceeding first, then limited, then unlimited
    return [...result].sort((a, b) => {
      const limitA = budgets[a.id] || 0;
      const limitB = budgets[b.id] || 0;
      const spentA = categoryStats[a.id]?.exits || 0;
      const spentB = categoryStats[b.id]?.exits || 0;

      const isExceededA = limitA > 0 && spentA > limitA ? 1 : 0;
      const isExceededB = limitB > 0 && spentB > limitB ? 1 : 0;

      if (isExceededA !== isExceededB) return isExceededB - isExceededA; // Exceeded goes first
      if ((limitA > 0) !== (limitB > 0)) return (limitB > 0 ? 1 : 0) - (limitA > 0 ? 1 : 0); // With limit goes second
      return a.name.localeCompare(b.name);
    });
  }, [categories, activeHiddenList, showHidden, searchQuery, filterType, budgets, categoryStats]);

  return (
    <motion.div 
      key="budgets"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 p-6 rounded-[2rem] shadow-xs">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Controle de Fluxos</span>
          <h3 className="text-xl font-bold dark:text-white mt-1">Central de Controle de Categorias</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-2xl">
            Acompanhe fluxos de entradas, saídas, volumes de lançamentos e customize limites de gastos mensais ou aparências visuais para cada categoria de forma simplificada.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeHiddenList.length > 0 && (
            <button
              onClick={() => setShowHidden(!showHidden)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 border ${
                showHidden 
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' 
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 select-none'
              }`}
            >
              {showHidden ? <EyeOff size={13} /> : <Eye size={13} />}
              {showHidden ? 'Ocultar Ocultos' : `Ver Ocultos (${activeHiddenList.length})`}
            </button>
          )}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-xs"
          >
            <Plus size={14} /> Nova Categoria
          </button>
        </div>
      </div>

      {/* Stats Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Categories */}
        <div className="bg-slate-100/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 p-4 flex flex-col justify-between rounded-3xl">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total de Categorias</span>
          <div>
            <p className="text-xl font-black text-slate-800 dark:text-slate-100">{categories.length}</p>
            <span className="text-[10px] text-slate-400 font-medium">Categorias cadastradas</span>
          </div>
        </div>

        {/* Categories with Limits */}
        <div className="bg-slate-100/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 p-4 flex flex-col justify-between rounded-3xl">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Limites Ativos</span>
          <div>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{dashboardStats.activeLimits}</p>
            <span className="text-[10px] text-slate-400 font-medium font-mono">
              R$ {dashboardStats.totalPlannedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} planejados
            </span>
          </div>
        </div>

        {/* Consumed limit */}
        <div className="bg-slate-100/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 p-4 flex flex-col justify-between rounded-3xl">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Consumo de Limites</span>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-xl font-black text-rose-700 dark:text-rose-400">
                {dashboardStats.percentUsed.toFixed(0)}%
              </p>
              <span className="text-[10px] text-slate-450 dark:text-slate-400 font-mono font-medium">
                R$ {dashboardStats.totalSpentInLimited.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full transition-all duration-350"
                style={{ width: `${dashboardStats.percentUsed}%` }}
              />
            </div>
          </div>
        </div>

        {/* Exceeded alert */}
        <div className={`border rounded-3xl p-4 flex flex-col justify-between transition-all duration-300 ${
          dashboardStats.exceededLimits > 0
            ? 'bg-rose-100/60 dark:bg-rose-950/30 border-rose-250 dark:border-rose-900/40 text-rose-800 dark:text-rose-400'
            : 'bg-emerald-100/60 dark:bg-emerald-950/30 border-emerald-250 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400'
        }`}>
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">Status Alertas</span>
          <div>
            <div className="flex items-center gap-1.5">
              {dashboardStats.exceededLimits > 0 ? (
                <>
                  <AlertCircle size={15} className="text-rose-600 dark:text-rose-400 animate-pulse animate-duration-1000" />
                  <p className="text-xl font-black">{dashboardStats.exceededLimits} Estourados</p>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xl font-black">Sob Controle</p>
                </>
              )}
            </div>
            <span className="text-[10px] opacity-75 font-medium">
              {dashboardStats.exceededLimits > 0 ? 'Excedeu limite estipulado!' : 'Nenhum orçamento estourado'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters Search Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40">
        {/* Quick Filter Selectors */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Todas ({categories.length})
          </button>
          <button
            onClick={() => setFilterType('with_limit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'with_limit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            <Scale size={11} /> Com Limite
          </button>
          <button
            onClick={() => setFilterType('without_limit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filterType === 'without_limit'
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Sem Limite
          </button>
          <button
            onClick={() => setFilterType('exceeded')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'exceeded'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-450'
            }`}
          >
            <AlertCircle size={11} /> Estourados
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={13} />
          <input
            type="text"
            placeholder="Buscar categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-8 py-2 bg-slate-100/50 hover:bg-slate-100/80 dark:bg-slate-800/70 dark:hover:bg-slate-800/90 border border-slate-200/50 dark:border-slate-700/50 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>
      
      {/* Category Control Panel Cards */}
      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50/20 dark:bg-slate-900/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem]">
          <Layers size={36} className="text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhuma categoria encontrada</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Experimente alterar os filtros ou limpe a pesquisa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredCategories.map((category) => {
            const catId = category.id;
            const isHidden = activeHiddenList.includes(catId);
            
            // Statistics for this category
            const stats = categoryStats[catId] || { entries: 0, exits: 0, entriesCount: 0, exitsCount: 0 };
            const limit = budgets[catId] || 0;
            const numLimit = limit as number;
            const spent = stats.exits;
            
            // Balance calculations
            const balanceNet = stats.entries - stats.exits;
            const percentSum = numLimit > 0 ? Math.min((spent / numLimit) * 100, 100) : 0;
            const isExceeded = numLimit > 0 && spent > numLimit;
            
            return (
              <div 
                key={catId} 
                onClick={() => setSelectedBudgetCategory(catId)}
                className={`p-6 rounded-[2rem] border cursor-pointer transition-all duration-300 active:scale-[0.99] group relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isHidden ? 'opacity-50 saturate-[50%] hover:opacity-85 hover:saturate-100' : ''
                }`}
                style={{ 
                  backgroundColor: `${category.color}08`,
                  borderColor: isExceeded ? '#ef444455' : `${category.color}25`,
                }}
              >
                {/* Visual top decorative accent matching the color */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1 opacity-60"
                  style={{ backgroundColor: category.color }}
                />

                {/* Header Information */}
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const info = getCategoryIconAndStyle(catId);
                      const icon = category.icon || info.icon;
                      const catColor = category.color || '#64748b';
                      
                      return (
                        <div 
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-xs group-hover:scale-105 transition-transform duration-300 shrink-0"
                          style={{ backgroundColor: `${catColor}15`, color: catColor }}
                        >
                          {icon}
                        </div>
                      );
                    })()}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-base text-slate-800 dark:text-slate-100 tracking-tight leading-tight group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
                          {category.name}
                        </span>
                        {isHidden && (
                          <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md tracking-wider">
                            Oculto
                          </span>
                        )}
                        {numLimit > 0 && (
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                            isExceeded 
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400' 
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {isExceeded ? 'Estourou' : 'Limite Ativo'}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest mt-1 block font-mono">
                        {(stats.entriesCount + stats.exitsCount)} lançamentos no total
                      </span>
                    </div>
                  </div>

                  {/* Settings and Config Quick buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-200/20 dark:bg-slate-800/30 p-1 rounded-xl">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewBudget({ categoryId: catId, limit: numLimit > 0 ? numLimit.toString() : '' });
                        setIsBudgetModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-slate-450 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                      title="Definir/Editar Limite"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCategoryId(catId);
                        setNewCategory({
                          name: category.name,
                          icon: category.icon || '',
                          color: category.color || '#64748b'
                        });
                        setIsCategoryModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-450 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer"
                      title="Personalizar Categoria"
                    >
                      <Palette size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isHidden) {
                          setHiddenBudgets(prev => prev.filter(id => id !== catId));
                        } else {
                          setHiddenBudgets(prev => [...prev, catId]);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-450 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                      title={isHidden ? "Exibir Categoria" : "Ocultar Categoria"}
                    >
                      {isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                </div>
                
                {/* Real-time Category Flow (Entradas x Saídas) */}
                <div className="grid grid-cols-2 gap-4 bg-white/45 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/40 mb-4 text-xs">
                  {/* Flow Entrada */}
                  <div>
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wide">
                      <TrendingUp size={11} className="text-emerald-500" />
                      <span>Entradas</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                        R$ {stats.entries.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {stats.entriesCount > 0 && (
                        <span className="text-[9px] text-slate-400 font-mono font-medium">({stats.entriesCount}x)</span>
                      )}
                    </div>
                  </div>

                  {/* Flow Saída */}
                  <div>
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-bold text-[9px] uppercase tracking-wide">
                      <TrendingDown size={11} className="text-rose-700" />
                      <span>Saídas</span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-none">
                        R$ {stats.exits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {stats.exitsCount > 0 && (
                        <span className="text-[9px] text-slate-400 font-mono font-medium">({stats.exitsCount}x)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Net Balance & Budget Limit Progress Bar Container */}
                <div className="space-y-4">
                  {/* Net Balance info */}
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-400 dark:text-slate-500 uppercase text-[9px] tracking-wide">Balanço Líquido</span>
                    <span className={balanceNet > 0 ? 'text-emerald-600 dark:text-emerald-400' : balanceNet < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}>
                      {balanceNet > 0 ? '+' : ''} R$ {balanceNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Budget limits controls split */}
                  {numLimit > 0 ? (
                    <div className="space-y-1.5 pt-1 border-t border-slate-150/40 dark:border-slate-800/30">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400">Progresso do Limite</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className={isExceeded ? 'text-rose-600 dark:text-rose-450 font-extrabold' : 'text-slate-450 dark:text-slate-500'}>
                            R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-slate-350 dark:text-slate-600">/</span>
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            R$ {numLimit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar visual indicator */}
                      <div className="h-2 w-full bg-slate-100 hover:bg-slate-150/40 dark:bg-slate-800 rounded-full overflow-hidden transition-all relative">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${percentSum}%`, 
                            backgroundColor: isExceeded ? '#ef4444' : percentSum > 75 ? '#f59e0b' : category.color 
                          }}
                        />
                      </div>

                      {/* Restante Info Footer card */}
                      <div className="flex justify-between items-center text-[10px] pt-0.5">
                        <span className="text-slate-400 dark:text-slate-500">Saldo Planejado Restante</span>
                        <span className={`font-black ${numLimit - spent < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                          R$ {(numLimit - spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Show visual button/option to set Limit when limit is not defined */
                    <div className="pt-2 border-t border-slate-150/40 dark:border-slate-800/30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewBudget({ categoryId: catId, limit: '' });
                          setIsBudgetModalOpen(true);
                        }}
                        className="w-full py-2.5 px-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all hover:bg-slate-100/30 dark:hover:bg-slate-900/30 cursor-pointer"
                        style={{ 
                          color: category.color,
                          borderColor: `${category.color}15`,
                        }}
                      >
                        <Plus size={11} />
                        Definir Limite de Gasto Mensal
                      </button>
                    </div>
                  )}

                  {/* Card click link indicator */}
                  <div className="flex justify-end pt-1">
                    <span 
                      className="text-[9px] font-black tracking-widest uppercase flex items-center gap-1 group-hover:translate-x-1.5 transition-transform duration-300"
                      style={{ color: category.color }}
                    >
                      Ver Extrato Detalhado ➔
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default Orcamentos;
