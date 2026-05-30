import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Plus, Building2, Trash2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface Investment {
  id: string;
  name: string;
  value: number;
  type: string;
}

interface InvestimentosProps {
  investments: Investment[];
  setIsInvestmentModalOpen: (open: boolean) => void;
  setInvestmentToDelete: (inv: Investment) => void;
  theme: string;
}

const Investimentos: React.FC<InvestimentosProps> = ({
  investments,
  setIsInvestmentModalOpen,
  setInvestmentToDelete,
  theme,
}) => {
  const totalInvested = investments.reduce((acc, curr) => acc + curr.value, 0);

  const distributionEntries = Object.entries(
    investments.reduce((acc: Record<string, number>, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + curr.value;
      return acc;
    }, {})
  ).map(([name, value]) => ({
    name,
    value: value as number,
    percentage: totalInvested > 0 ? ((value as number) / totalInvested) * 100 : 0
  }));

  const getPieColor = (type: string, idx: number) => {
    const mapColors: Record<string, string> = {
      'Renda Fixa': '#10b981',
      'Ações': '#3b82f6',
      'Fundos Imobiliários': '#f59e0b',
      'Previdência': '#8b5cf6',
      'Criptomoedas': '#ec4899',
      'Outros': '#6366f1'
    };
    return mapColors[type] || ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'][idx % 6];
  };

  return (
    <motion.div 
      key="investments"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
       <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-slate-400 font-medium mb-1">Patrimônio Investido</p>
              <h3 className="text-4xl font-black mb-4">
                R$ {totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
              <div className="flex gap-4">
                <span className="flex items-center gap-1 text-emerald-400 text-sm font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <TrendingUp size={14} /> +4.2% esse mês
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsInvestmentModalOpen(true)}
              className="self-start sm:self-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all cursor-pointer active:scale-98 shadow-md"
            >
              <Plus size={15} /> Novo Investimento
            </button>
          </div>
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
            <TrendingUp size={160} />
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
            <h4 className="font-bold mb-4 dark:text-white">Ativos na Carteira</h4>
            {investments.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-550">
                <p className="text-3xl mb-2">📈</p>
                <p className="text-sm font-semibold">Nenhum investimento registrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {investments.map((inv, index) => (
                  <div key={inv.id || index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl transition-all group/row hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100/30 dark:border-slate-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <Building2 size={18} className="text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-bold dark:text-slate-100">{inv.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{inv.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-slate-900 dark:text-white">R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <button
                        onClick={() => setInvestmentToDelete(inv)}
                        className="p-1 px-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-450 md:opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition-opacity rounded cursor-pointer"
                        title="Excluir Ativo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col items-center">
            <h4 className="font-bold mb-4 text-center dark:text-white">Diversificação</h4>
            {investments.length === 0 ? (
              <div className="flex items-center justify-center flex-1 py-12 text-slate-350 dark:text-slate-600">
                <p className="text-sm italic">Adicione ativos para ver o gráfico.</p>
              </div>
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionEntries}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        dataKey="value"
                        stroke="none"
                      >
                        {distributionEntries.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={getPieColor(entry.name, idx)} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => `R$ ${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        contentStyle={{ 
                          backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                          borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', 
                          color: theme === 'dark' ? '#f8fafc' : '#0f172a' 
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 w-full space-y-2">
                  {distributionEntries.map((entry, idx) => (
                    <div key={entry.name} className="flex justify-between text-xs items-center">
                      <span className="flex items-center gap-1.5 dark:text-slate-400">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPieColor(entry.name, idx) }}></div> 
                        {entry.name}
                      </span>
                      <span className="font-bold dark:text-slate-200">{entry.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
       </div>
    </motion.div>
  );
};

export default Investimentos;
