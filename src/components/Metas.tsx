import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Trash2, 
  Plus, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Info,
  Edit2,
  TrendingUp,
  Award
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

// Predefined fun goal categories with beautiful emojis
const GOAL_CATEGORIES = [
  { id: 'reserva', name: 'Reserva de Emergência', emoji: '🛡️' },
  { id: 'viagem', name: 'Viagem & Férias', emoji: '✈️' },
  { id: 'carro', name: 'Carro Novo', emoji: '🚗' },
  { id: 'casa', name: 'Casa Própria', emoji: '🏠' },
  { id: 'tecnologia', name: 'Eletrônicos/PC', emoji: '💻' },
  { id: 'educacao', name: 'Cursos & Estudos', emoji: '🎓' },
  { id: 'outros', name: 'Outros Objetivos', emoji: '🎯' },
];

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  deadline: string;
  category: string;
  userId?: string;
}

interface MetasProps {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  user: any;
  theme: 'light' | 'dark';
}

export default function Metas({ goals, setGoals, user, theme }: MetasProps) {
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateType, setUpdateType] = useState<'add' | 'subtract'>('add');
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Form states for new goal
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCurrent, setNewCurrent] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newCategory, setNewCategory] = useState('outros');

  const getGoalsPath = () => {
    return user ? `users/${user.uid}/goals` : null;
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newTarget || !newDeadline) return;

    const targetVal = parseFloat(newTarget);
    const currentVal = parseFloat(newCurrent) || 0;

    const goalId = Date.now().toString();
    const newGoal: Goal = {
      id: goalId,
      title: newTitle,
      target: targetVal,
      current: currentVal,
      deadline: newDeadline,
      category: newCategory,
      ...(user && { userId: user.uid })
    };

    // Optimistic state update
    setGoals(prev => [newGoal, ...prev]);

    // Firestore sync
    const path = getGoalsPath();
    if (path) {
      try {
        await setDoc(doc(db, path, goalId), newGoal);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${goalId}`);
      }
    }

    // Reset Form
    setNewTitle('');
    setNewTarget('');
    setNewCurrent('');
    setNewDeadline('');
    setNewCategory('outros');
    setIsNewGoalModalOpen(false);
  };

  const handleDeleteGoal = async (id: string) => {
    // Optimistic state update
    setGoals(prev => prev.filter(g => g.id !== id));

    // Firestore sync
    const path = getGoalsPath();
    if (path) {
      try {
        await deleteDoc(doc(db, path, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
      }
    }
    setGoalToDelete(null);
  };

  const handleOpenUpdateBalance = (goal: Goal) => {
    setSelectedGoal(goal);
    setUpdateAmount('');
    setUpdateType('add');
    setIsUpdateModalOpen(true);
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !updateAmount) return;

    const amount = parseFloat(updateAmount);
    if (isNaN(amount) || amount <= 0) return;

    let newCurrent = selectedGoal.current;
    if (updateType === 'add') {
      newCurrent += amount;
    } else {
      newCurrent = Math.max(0, newCurrent - amount);
    }

    const updatedGoal = { ...selectedGoal, current: newCurrent };

    // Update state
    setGoals(prev => prev.map(g => g.id === selectedGoal.id ? updatedGoal : g));

    // Firestore sync
    const path = getGoalsPath();
    if (path) {
      try {
        await setDoc(doc(db, path, selectedGoal.id), updatedGoal);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${path}/${selectedGoal.id}`);
      }
    }

    setIsUpdateModalOpen(false);
    setSelectedGoal(null);
  };

  // Helper metrics
  const totalTarget = goals.reduce((acc, curr) => acc + curr.target, 0);
  const totalSaved = goals.reduce((acc, curr) => acc + curr.current, 0);
  const generalProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const completedGoals = goals.filter(g => g.current >= g.target).length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Visual Top Summary Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/30 px-3 py-1 rounded-full border border-emerald-400/20">
              Planejamento e Sonhos
            </span>
            <p className="text-white/80 font-medium pt-1">Total Guardado em Metas</p>
            <h3 className="text-4xl font-black">
              R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-250/90 text-white/70">
              Total planejado: R$ {totalTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <span className="text-xs text-white/50 block font-bold uppercase">Progresso Geral</span>
              <span className="text-2xl font-black block">{generalProgress.toFixed(0)}%</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10">
              <span className="text-xs text-white/50 block font-bold uppercase">Metas Concluídas</span>
              <span className="text-2xl font-black block">{completedGoals} de {goals.length}</span>
            </div>
          </div>
        </div>
        
        {/* Absolute Background element */}
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <Target size={160} />
        </div>
      </div>

      {/* Grid of Goals */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black dark:text-white">Minhas Metas Financeiras</h3>
          <p className="text-xs text-slate-450 dark:text-slate-400">Poupe e controle o progresso dos seus maiores sonhos</p>
        </div>
        
        <button
          onClick={() => setIsNewGoalModalOpen(true)}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xs">
          <p className="text-5xl mb-4">🎯</p>
          <h4 className="text-lg font-bold dark:text-white">Nenhuma meta criada ainda</h4>
          <p className="text-slate-405 dark:text-slate-400 text-sm max-w-sm mx-auto mt-2 mb-6">
            Defina objetivos claros como uma viagem, reserva de emergência ou compra importante para economizar com foco!
          </p>
          <button
            onClick={() => setIsNewGoalModalOpen(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm transition-all shadow-sm cursor-pointer"
          >
            Adicionar Primeira Meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const categoryObj = GOAL_CATEGORIES.find(c => c.id === goal.category);
            const emoji = categoryObj?.emoji || '🎯';
            const progressPercent = Math.min((goal.current / goal.target) * 100, 100);
            const isCompleted = goal.current >= goal.target;

            return (
              <motion.div
                key={goal.id}
                layout
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between relative group hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/80 transition-all duration-300"
              >
                {isCompleted && (
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs border border-emerald-400/20 z-10">
                    <Award size={10} /> Concluída!
                  </div>
                )}

                <div className="space-y-4">
                  {/* Goal Header */}
                  <div className="flex items-start gap-3">
                    <span className="text-3xl shrink-0 select-none bg-slate-50 dark:bg-slate-805/50 w-12 h-12 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800">
                      {emoji}
                    </span>
                    <div className="min-w-0 flex-1 pr-6">
                      <h4 className="font-bold dark:text-white text-base truncate" title={goal.title}>
                        {goal.title}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                        {categoryObj?.name || goal.category}
                      </p>
                    </div>
                  </div>

                  {/* Progress info */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">Progresso</span>
                      <span className="text-sm font-black dark:text-white">
                        {progressPercent.toFixed(0)}%
                      </span>
                    </div>

                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-550 ${
                          isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-emerald-600 to-teal-650'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs font-semibold pt-1">
                      <div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-550 uppercase">Guardado</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {goal.current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 dark:text-slate-550 uppercase">Alvo</p>
                        <p className="font-bold dark:text-slate-200">
                          R$ {goal.target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date and Details */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/20 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <CalendarIcon size={12} className="text-slate-400" />
                    <span>Prazo: {goal.deadline.split('-').reverse().join('/')}</span>
                  </div>
                </div>

                {/* Actions bottom dock */}
                <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleOpenUpdateBalance(goal)}
                    className="flex-1 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <DollarSign size={13} /> Lançar Valor
                  </button>
                  <button
                    onClick={() => setGoalToDelete(goal)}
                    className="p-2 border border-slate-150 dark:border-slate-800 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 rounded-xl transition-all cursor-pointer"
                    title="Excluir meta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: NEW GOAL */}
      <AnimatePresence>
        {isNewGoalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewGoalModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white">Criar Nova Meta</h3>
                <button 
                  onClick={() => setIsNewGoalModalOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Nome / Objetivo</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Viagem para o Japão"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Valor Alvo (R$)</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      placeholder="5000"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Já guardado (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={newCurrent}
                      onChange={(e) => setNewCurrent(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Categoria / Ícone</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-semibold"
                    >
                      {GOAL_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Data Limite</label>
                    <input 
                      type="date"
                      required
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsNewGoalModalOpen(false)}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3.5 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-650 text-white py-3.5 rounded-2xl font-black shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
                  >
                    Criar Meta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: UPDATE GOAL BALANCE */}
      <AnimatePresence>
        {isUpdateModalOpen && selectedGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsUpdateModalOpen(false);
                setSelectedGoal(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black dark:text-white">Lançar valor na Meta</h3>
                  <p className="text-[11px] text-slate-400 capitalize">{selectedGoal.title}</p>
                </div>
                <button 
                  onClick={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedGoal(null);
                  }} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateBalance} className="p-6 space-y-4">
                {/* Segmented control for add/subtract */}
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-bold shadow-xs">
                  <button
                    type="button"
                    onClick={() => setUpdateType('add')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${updateType === 'add' ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    💰 Adicionar Saldo
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType('subtract')}
                    className={`flex-1 py-2 rounded-lg transition-all text-center cursor-pointer ${updateType === 'subtract' ? 'bg-white dark:bg-slate-850 text-rose-500 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    💸 Retirar/Resgatar
                  </button>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Valor do Lançamento (R$)</label>
                  <input 
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    autoFocus
                    placeholder="250.00"
                    value={updateAmount}
                    onChange={(e) => setUpdateAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-base dark:text-white outline-none focus:border-emerald-500 transition-all font-black"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-550 italic block mt-1">
                    Saldo atual da meta: R$ {selectedGoal.current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsUpdateModalOpen(false);
                      setSelectedGoal(null);
                    }}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className={`flex-1 text-white py-3 rounded-xl font-black shadow-md transition-all text-xs cursor-pointer ${
                      updateType === 'add' 
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/10' 
                        : 'bg-rose-550 hover:bg-rose-500 shadow-rose-550/10'
                    }`}
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EXCLUIR META */}
      <AnimatePresence>
        {goalToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGoalToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300 p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                <Trash2 size={28} />
              </div>
              
              <h3 className="text-lg font-black dark:text-white">Excluir Meta</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Tem certeza de que deseja excluir a meta <strong className="text-slate-705 dark:text-slate-200 font-extrabold">"{goalToDelete.title}"</strong>? Esta ação não pode ser desfeita.
              </p>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setGoalToDelete(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteGoal(goalToDelete.id)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                >
                  Excluir Meta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
