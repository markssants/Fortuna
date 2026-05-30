import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  ArrowUpCircle, 
  ArrowDownCircle 
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface CalendarioProps {
  transactions: Transaction[];
  theme: 'light' | 'dark';
  onSelectTransaction: (t: Transaction) => void;
}

const Calendario: React.FC<CalendarioProps> = ({ 
  transactions, 
  theme, 
  onSelectTransaction 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const dayTransactions = selectedDate 
    ? transactions.filter(t => t.date && isSameDay(parseISO(t.date), selectedDate))
    : [];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold dark:text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={prevMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={nextMonth}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            {calendarDays.map((day, idx) => {
              const hasIn = transactions.some(t => t.type === 'entrada' && t.date && isSameDay(parseISO(t.date), day));
              const hasOut = transactions.some(t => t.type === 'saida' && t.date && isSameDay(parseISO(t.date), day));
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[100px] p-2 bg-white dark:bg-slate-900 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 relative ${
                    !isCurrentMonth ? 'opacity-25 grayscale' : ''
                  } ${isSelected ? 'ring-2 ring-inset ring-emerald-500 z-10' : ''}`}
                >
                  <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="mt-2 flex flex-col gap-1">
                    {hasIn && (
                      <div className="h-1.5 w-full bg-emerald-500/20 dark:bg-emerald-400/10 border-l-2 border-emerald-500 rounded-sm"></div>
                    )}
                    {hasOut && (
                      <div className="h-1.5 w-full bg-rose-500/20 dark:bg-rose-400/10 border-l-2 border-rose-500 rounded-sm"></div>
                    )}
                  </div>

                  {isSameDay(day, new Date()) && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300 sticky top-8">
          <div className="mb-6">
            <h4 className="text-lg font-bold dark:text-white">Resumo do Dia</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
              {selectedDate ? format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Selecione um dia'}
            </p>
          </div>

          <div className="space-y-4">
            {dayTransactions.length > 0 ? (
              dayTransactions.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => onSelectTransaction(t)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-805/50 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-105 hover:dark:border-slate-700/50"
                >
                  <div className="flex items-center gap-3">
                    {t.vaultId && (
                      <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                        Cofre
                      </span>
                    )}
                    <div className={`p-2 rounded-xl ${t.type === 'entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {t.type === 'entrada' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-slate-200 flex items-center gap-2">
                        {t.description}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{t.category}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-black ${t.type === 'entrada' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                    {t.type === 'entrada' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-3">
                  <CalendarIcon size={32} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">Nenhuma movimentação neste dia</p>
              </div>
            )}
          </div>
          
          {dayTransactions.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Saldo do Dia</span>
                <span className={`text-lg font-black ${
                  dayTransactions.reduce((acc, t) => acc + (t.type === 'entrada' ? t.value : -t.value), 0) >= 0 
                    ? 'text-emerald-600' 
                    : 'text-rose-600'
                }`}>
                  {dayTransactions.reduce((acc, t) => acc + (t.type === 'entrada' ? t.value : -t.value), 0) >= 0 ? '+' : '-'} 
                  R$ {Math.abs(dayTransactions.reduce((acc, t) => acc + (t.type === 'entrada' ? t.value : -t.value), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Calendario;
