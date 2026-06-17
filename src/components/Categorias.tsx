import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tag, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Info, 
  X, 
  Sparkles, 
  Sliders, 
  TrendingDown, 
  TrendingUp, 
  Grid, 
  List, 
  Layers,
  PieChart as PieIcon,
  ChevronRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { CATEGORIES, getCategoryIconAndStyle } from '../constants';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  userId?: string;
  isCustom?: boolean;
}

interface CategoriasProps {
  categories: Category[]; // The merged categories (standard + custom)
  customCategories: Category[];
  transactions: any[];
  user: any;
  theme: 'light' | 'dark';
  triggerUndoToast?: (message: string, type: 'category' | 'transaction' | 'meta' | 'cofre' | 'recorrente' | 'conta' | 'investment' | 'budget', item: any, extraData?: any) => void;
  onOpenCategoryModal?: (catId?: string | null) => void;
  budgets?: Record<string, number>;
}

export default function Categorias({
  categories,
  customCategories,
  transactions,
  user,
  theme,
  triggerUndoToast,
  budgets = {}
}: CategoriasProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Create / Edit Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('📁');
  const [formColor, setFormColor] = useState('#64748b');
  const [formError, setFormError] = useState('');

  // Sample quick emojis/icons for category creation
  const QUICK_EMOJIS = [
    '🍔', '🚗', '🎉', '🩺', '🎁', '🏠', '📺', '💰', '🛡️', '📝',
    '🎓', '🏋️', '✈️', '🐶', '👚', '💻', '💡', '🧹', '🌾', '🍕',
    '☕', '⛽', '🍿', '💈', '🏦', '🎨', '🎸', '🛒', '🚲', '🍹'
  ];

  // Quick Preset Colors
  const PRESET_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', 
    '#8b5cf6', '#06b6d4', '#14b8a6', '#6366f1', '#64748b',
    '#f43f5e', '#a855f7', '#64748b', '#22c55e', '#eab308'
  ];

  // Map user-defined categories vs standard ones
  const categoriesWithOrigin = useMemo(() => {
    return categories.map(cat => {
      const isCustom = customCategories.some(c => c.id === cat.id) || !CATEGORIES.some(c => c.id === cat.id);
      
      // Resolve icon and style
      const styleInfo = getCategoryIconAndStyle(cat.id);
      const icon = cat.icon || styleInfo.icon || '📁';
      
      return {
        ...cat,
        icon,
        isCustom
      };
    });
  }, [categories, customCategories]);

  // Statistics Calculation
  const statsByCategory = useMemo(() => {
    const stats: Record<string, { totalSpend: number; totalReceive: number; count: number }> = {};
    
    // Initialize for all categories
    categoriesWithOrigin.forEach(cat => {
      stats[cat.id] = { totalSpend: 0, totalReceive: 0, count: 0 };
    });

    // Populate from transactions
    transactions.forEach(t => {
      const catId = t.category || 'outros';
      if (!stats[catId]) {
        stats[catId] = { totalSpend: 0, totalReceive: 0, count: 0 };
      }
      
      const val = Math.abs(Number(t.value) || 0);
      if (t.type === 'saida') {
        stats[catId].totalSpend += val;
      } else if (t.type === 'entrada') {
        stats[catId].totalReceive += val;
      }
      stats[catId].count += 1;
    });

    return stats;
  }, [categoriesWithOrigin, transactions]);

  // Total transactions stats
  const totalSpendAll = useMemo(() => {
    return Object.values(statsByCategory).reduce((acc, curr: any) => acc + curr.totalSpend, 0);
  }, [statsByCategory]);

  const totalReceiveAll = useMemo(() => {
    return Object.values(statsByCategory).reduce((acc, curr: any) => acc + curr.totalReceive, 0);
  }, [statsByCategory]);

  // Filter & Search categories
  const filteredCategories = useMemo(() => {
    return categoriesWithOrigin.filter(cat => {
      const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            cat.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (filterType === 'system') return !cat.isCustom;
      if (filterType === 'custom') return cat.isCustom;
      return true;
    });
  }, [categoriesWithOrigin, searchQuery, filterType]);

  // Handle click on category for detail panel
  const handleSelectCategory = (cat: Category & { isCustom: boolean }) => {
    if (selectedCategory && selectedCategory.id === cat.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(cat);
    }
  };

  // Recent transactions of the selected category
  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter(t => t.category === selectedCategory.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedCategory]);

  // Edit action
  const handleStartEdit = (cat: Category & { isCustom: boolean }, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCatId(cat.id);
    setFormName(cat.name);
    setFormIcon(cat.icon || '📁');
    setFormColor(cat.color || '#64748b');
    setFormError('');
    setIsFormOpen(true);
  };

  // Create or Update firebase doc
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formName.trim()) {
      setFormError('O nome do é obrigatório.');
      return;
    }

    const catId = editingCatId || formName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const categoryPath = `users/${user.uid}/categories/${catId}`;

    try {
      await setDoc(doc(db, categoryPath), {
        id: catId,
        name: formName.trim(),
        icon: formIcon,
        color: formColor,
        userId: user.uid
      });

      setIsFormOpen(false);
      setEditingCatId(null);
      setFormName('');
      setFormIcon('📁');
      setFormColor('#64748b');
      setFormError('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, categoryPath);
      setFormError('Erro ao gravar a categoria. Verifique suas permissões.');
    }
  };

  // Delete Action
  const handleDeleteCategory = async (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    const categoryPath = `users/${user.uid}/categories/${catId}`;
    const categoryToDelete = customCategories.find(c => c.id === catId);
    const budgetLimit = budgets[catId];

    try {
      await deleteDoc(doc(db, categoryPath));

      // Also clean matching budget if applicable
      const budgetPath = `users/${user.uid}/budgets/${catId}`;
      await deleteDoc(doc(db, budgetPath));

      if (selectedCategory && selectedCategory.id === catId) {
        setSelectedCategory(null);
      }

      if (categoryToDelete && triggerUndoToast) {
        triggerUndoToast(
          `Categoria "${categoryToDelete.name}" excluída com sucesso`,
          'category',
          categoryToDelete,
          { budget: budgetLimit }
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, categoryPath);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4 py-2">
      {/* Header section with Stats Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Tag size={24} />
            </span>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white transition-colors duration-300">
              Categorias
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Gerencie e personalize categorias para organizar suas despesas e receitas.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            setEditingCatId(null);
            setFormName('');
            setFormIcon('📁');
            setFormColor('#10b981');
            setFormError('');
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-3 rounded-2xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer self-start md:self-auto text-sm"
        >
          <Plus size={18} />
          Nova Categoria
        </button>
      </div>

      {/* Quick stats summarizing categories volume */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total volume spent */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex items-center gap-4 transition-all">
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400">
            <TrendingDown size={22} />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 block">Investimento / Saídas por Categoria</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 block mt-0.5">
              R$ {totalSpendAll.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Total volume received */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex items-center gap-4 transition-all">
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 dark:text-emerald-400">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 block">Entradas por Categoria</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 block mt-0.5">
              R$ {totalReceiveAll.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Category breakdown stats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex items-center gap-4 transition-all">
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/10 text-blue-500 dark:text-blue-400">
            <Layers size={22} />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 block">Total de Categorias</span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 block mt-0.5">
              {categories.length} <span className="text-xs text-slate-400 font-medium font-sans">({customCategories.length} personalizadas)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid showing Search, filtering and actual items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Categories Listings & Filters */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text"
                  placeholder="Buscar categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-2xl pl-11 pr-4 py-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-bold"
                />
              </div>

              {/* Tag filters */}
              <div className="flex bg-slate-50 dark:bg-slate-950/40 p-1 rounded-2xl border border-slate-150/40 dark:border-slate-800/80 shrink-0">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterType('system')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    filterType === 'system'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Padrão
                </button>
                <button
                  onClick={() => setFilterType('custom')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                    filterType === 'custom'
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Criadas (PJ)
                </button>
              </div>
            </div>

            {/* Grid of actual Category cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => {
                  const catStats = statsByCategory[cat.id] || { totalSpend: 0, totalReceive: 0, count: 0 };
                  const isSelected = selectedCategory?.id === cat.id;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat)}
                      className={`group relative p-4 rounded-3xl border text-left cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 ring-1 ring-emerald-500'
                          : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/10'
                      }`}
                    >
                      {/* Top Category visual style */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 font-medium shadow-sm"
                            style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                          >
                            {cat.icon || '📁'}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm">
                              {cat.name}
                            </h4>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500 mt-0.5 block">
                              {cat.isCustom ? 'Personalizada' : 'Padrão do Sistema'}
                            </span>
                          </div>
                        </div>

                        {/* Actions (Only custom categories are editable/deletable) */}
                        {cat.isCustom && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleStartEdit(cat, e)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
                              title="Editar Nome/Estilo"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteCategory(cat.id, e)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                              title="Excluir Categoria"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Spend values */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block">Saídas</span>
                          <span className="font-extrabold text-slate-600 dark:text-slate-300 block mt-0.5">
                            R$ {catStats.totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase block">Lançamentos</span>
                          <span className="font-extrabold text-slate-600 dark:text-slate-300 block mt-0.5">
                            {catStats.count} {catStats.count === 1 ? 'registro' : 'registros'}
                          </span>
                        </div>
                      </div>

                      {/* Tiny color indicator bar at the bottom */}
                      <span 
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-3xl transition-all"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                  <Grid size={40} className="stroke-[1.5] mb-2 text-slate-300" />
                  <span className="font-bold text-sm">Nenhuma categoria encontrada</span>
                  <span className="text-xs text-slate-400 mt-1">Experimente buscar por outros termos ou crie uma categoria.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Category Details Drawer / Sidebar (Contextual) */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selectedCategory ? (
              <motion.div
                key={selectedCategory.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden"
              >
                {/* Header detail */}
                <div className="flex items-center justify-between problem flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-sm font-medium"
                      style={{ backgroundColor: `${selectedCategory.color}15`, color: selectedCategory.color }}
                    >
                      {selectedCategory.icon || '📁'}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                        {selectedCategory.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase">Análise de Fluxo</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCategory(null)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Main Stats specific details */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Total de Saídas</span>
                    <span className="block text-sm font-black text-rose-500 mt-0.5">
                      R$ { (statsByCategory[selectedCategory.id]?.totalSpend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">Total de Entradas</span>
                    <span className="block text-sm font-black text-emerald-500 mt-0.5">
                      R$ { (statsByCategory[selectedCategory.id]?.totalReceive || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Participação nas Saídas:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {totalSpendAll > 0 
                        ? `${(((statsByCategory[selectedCategory.id]?.totalSpend || 0) / totalSpendAll) * 100).toFixed(1)}%` 
                        : '0.0%'
                      }
                    </span>
                  </div>
                </div>

                {/* Sub-breakdown: matching transactions list */}
                <div className="space-y-2">
                  <h5 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <List size={12} />
                    Lançamentos Recentes ({categoryTransactions.length})
                  </h5>

                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {categoryTransactions.length > 0 ? (
                      categoryTransactions.map((tx) => (
                        <div 
                          key={tx.id} 
                          className="p-3 bg-slate-50/30 dark:bg-slate-950/10 border border-slate-100 dark:border-slate-800/40 rounded-2xl flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate leading-tight">
                              {tx.description}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                              {tx.date} • {tx.bank || 'Conta'}
                            </span>
                          </div>
                          <span className={`font-black ${tx.type === 'entrada' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'} shrink-0`}>
                            {tx.type === 'entrada' ? '+' : '-'}R$ {Math.abs(tx.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Não existem lançamentos sob esta categoria.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50/50 dark:bg-slate-900/10 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 min-h-[220px]">
                <PieIcon size={36} className="text-slate-300 dark:text-slate-700 mb-2 stroke-[1.5]" />
                <h5 className="font-extrabold text-sm text-slate-700 dark:text-slate-300">Análise de Categoria</h5>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  Selecione uma categoria listada ao lado para ver estatísticas e lançamentos recentes.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Creation and Edition Modal Dialog */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            {/* Form modal container */}
            <motion.div 
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-500" />
                  {editingCatId ? 'Editar Categoria' : 'Criar Nova Categoria'}
                </h3>
                <button 
                  onClick={() => setIsFormOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-6 space-y-5">
                {formError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <AlertTriangle size={15} />
                    {formError}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">
                    Nome da Categoria
                  </label>
                  <input 
                    type="text"
                    required
                    maxLength={40}
                    placeholder="Ex: Combustível, Faculdade, Farmácia..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-bold"
                  />
                </div>

                {/* Custom Color selection with quick presets */}
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">
                    Cor Tema
                  </label>
                  <div className="flex gap-2 items-center">
                    <input 
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-12 h-12 bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-1 outline-none cursor-pointer"
                    />
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1.5 flex-1 pr-1">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormColor(c)}
                          className="w-6 h-6 rounded-lg border border-white dark:border-slate-900 ring-1 ring-slate-200/50 dark:ring-slate-800 transition-all active:scale-95"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Emoji/Icon custom selection */}
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">
                    Ícone / Emoji
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 max-h-[140px] overflow-y-auto p-2 border border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/10 rounded-2xl">
                    {QUICK_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormIcon(emoji)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all border ${
                          formIcon === emoji
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 scale-105'
                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form buttons */}
                <div className="flex justify-end gap-3 pt-3">
                  <button 
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 font-black text-white rounded-xl shadow-md hover:bg-emerald-500 active:scale-[0.98] transition-all text-xs cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
