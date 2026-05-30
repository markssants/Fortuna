import React from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Palette } from 'lucide-react';
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
  categories: { id: string, name: string, color: string, icon?: string }[];
  setIsBudgetModalOpen: (open: boolean) => void;
  setIsCategoryModalOpen: (open: boolean) => void;
  setSelectedBudgetCategory: (catId: string | null) => void;
  setNewBudget: (budget: { categoryId: string, limit: string }) => void;
  setEditingCategoryId: (id: string | null) => void;
  setNewCategory: (cat: { name: string, icon: string, color: string }) => void;
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
  return (
    <motion.div 
      key="budgets"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold dark:text-white">Meus Limites de Gastos</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Defina limites mensais para cada categoria de gasto.
          </p>
        </div>
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-98 shadow-sm"
        >
          <Plus size={14} /> Nova Categoria
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {categories.map((category) => {
          const catId = category.id;
          const limit = budgets[catId] || 0;
          const numLimit = limit as number;
          const spent = transactions
            .filter(t => t.type === 'saida' && t.category === catId)
            .reduce((acc, curr) => acc + curr.value, 0);
          const percent = numLimit > 0 ? Math.min((spent / numLimit) * 100, 100) : (spent > 0 ? 100 : 0);
          
          return (
            <div 
              key={catId} 
              onClick={() => setSelectedBudgetCategory(catId)}
              className="p-6 rounded-[2rem] border cursor-pointer transition-all duration-300 active:scale-[0.98] group relative overflow-hidden shadow-sm hover:shadow-md"
              style={{ 
                backgroundColor: `${category.color}15`,
                borderColor: `${category.color}40`,
              }}
            >
              <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  {(() => {
                    const info = getCategoryIconAndStyle(catId);
                    // Handle dynamic icon if available
                    const icon = category.icon || info.icon;
                    const catColor = category.color || '#64748b';
                    
                    return (
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: `${catColor}15`, color: catColor }}
                      >
                        {icon}
                      </div>
                    );
                  })()}
                  <span className="font-bold text-lg dark:text-slate-100">{category.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 dark:text-slate-500 text-xs block">Limite: R$ {numLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <div className="flex items-center justify-end gap-2 mt-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewBudget({ categoryId: catId, limit: numLimit > 0 ? numLimit.toString() : '' });
                        setIsBudgetModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer"
                      style={{ 
                        '--hover-bg': `${category.color}20`,
                        '--hover-text': category.color 
                      } as any}
                      title="Editar Limite"
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
                      className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                      title="Editar Nome, Ícone e Cor da Categoria"
                    >
                      <Palette size={12} />
                    </button>
                    <span 
                      className="text-[10px] font-bold tracking-wider group-hover:translate-x-1 block transition-transform duration-200 uppercase whitespace-nowrap"
                      style={{ color: category.color }}
                    >
                      Ver Extrato ➔
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 relative z-10">
                <div 
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${percent}%`, 
                    backgroundColor: percent > 90 ? '#ef4444' : percent > 70 ? '#f59e0b' : category.color 
                  }}
                ></div>
              </div>
              
              <div className="flex justify-between items-end relative z-10">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Gasto</p>
                  <p className="text-xl font-black dark:text-white">R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Restante</p>
                  <p className={`font-bold ${numLimit - spent < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    R$ {(numLimit - spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default Orcamentos;
