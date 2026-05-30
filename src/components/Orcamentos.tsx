import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
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
  setIsBudgetModalOpen: (open: boolean) => void;
  setSelectedBudgetCategory: (catId: string | null) => void;
}

const Orcamentos: React.FC<OrcamentosProps> = ({
  budgets,
  transactions,
  setIsBudgetModalOpen,
  setSelectedBudgetCategory,
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
            Meta de economia: <span className="font-bold text-emerald-600 dark:text-emerald-400">20%</span>
          </p>
        </div>
        <button
          onClick={() => setIsBudgetModalOpen(true)}
          className="px-4 py-2 bg-slate-900 border border-transparent hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-98 shadow-sm"
        >
          <Plus size={14} /> Novo Limite
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {CATEGORIES.map((category) => {
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
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 active:scale-[0.99] group relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  {(() => {
                    const info = getCategoryIconAndStyle(catId);
                    return (
                      <div className={`w-10 h-10 rounded-xl ${info.bg} flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                        {info.icon}
                      </div>
                    );
                  })()}
                  <span className="font-bold text-lg dark:text-slate-100">{category.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 dark:text-slate-500 text-xs block">Limite: R$ {numLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <span className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold tracking-wider group-hover:translate-x-1 block mt-0.5 transition-transform duration-200">VER EXTRATO ➔</span>
                </div>
              </div>
              
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 relative z-10">
                <div 
                  className={`h-full transition-all duration-500 ${percent > 90 ? 'bg-rose-500' : percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percent}%` }}
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
