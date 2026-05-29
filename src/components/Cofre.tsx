import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  Coins, 
  Trash2, 
  Plus, 
  DollarSign, 
  Award, 
  Sparkles, 
  TrendingUp,
  Info
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';

// Predefined icons/emojis for the cofre
const VAULT_ICONS = [
  { id: 'porquinho', emoji: '🐷', name: 'Porquinho' },
  { id: 'safe', emoji: '🏦', name: 'Cofre Forte' },
  { id: 'bag', emoji: '💰', name: 'Saco de Moedas' },
  { id: 'house', emoji: '🏠', name: 'Casa/Sonho' },
  { id: 'car', emoji: '🚗', name: 'Carro' },
  { id: 'plane', emoji: '✈️', name: 'Viagem' },
  { id: 'emergency', emoji: '🛡️', name: 'Segurança' },
  { id: 'invest', emoji: '📈', name: 'Futuro' },
];

export interface Vault {
  id: string;
  name: string;
  targetValue: number;
  currentValue: number;
  icon: string; // The selected emoji
  userId?: string;
  createdAt?: string;
}

interface CofreProps {
  vaults: Vault[];
  setVaults: React.Dispatch<React.SetStateAction<Vault[]>>;
  user: any;
  theme: 'light' | 'dark';
}

export default function Cofre({ vaults, setVaults, user, theme }: CofreProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateType, setUpdateType] = useState<'deposit' | 'withdraw'>('deposit');
  const [vaultToDelete, setVaultToDelete] = useState<Vault | null>(null);

  // Form states
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCurrent, setNewCurrent] = useState('');
  const [newIcon, setNewIcon] = useState('🐷');

  const getVaultsPath = () => {
    return user ? `users/${user.uid}/vaults` : null;
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const targetVal = parseFloat(newTarget) || 0;
    const currentVal = parseFloat(newCurrent) || 0;

    const vaultId = Date.now().toString();
    const newVault: Vault = {
      id: vaultId,
      name: newName,
      targetValue: targetVal,
      currentValue: currentVal,
      icon: newIcon,
      userId: user?.uid || '',
      createdAt: new Date().toISOString()
    };

    // Optimistic Update
    setVaults(prev => [newVault, ...prev]);

    const path = getVaultsPath();
    if (path) {
      try {
        await setDoc(doc(db, path, vaultId), newVault);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${vaultId}`);
      }
    }

    // Reset Form
    setNewName('');
    setNewTarget('');
    setNewCurrent('');
    setNewIcon('🐷');
    setIsNewModalOpen(false);
  };

  const handleDeleteVault = async (id: string) => {
    // Optimistic Update
    setVaults(prev => prev.filter(v => v.id !== id));

    const path = getVaultsPath();
    if (path) {
      try {
        await deleteDoc(doc(db, path, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
      }
    }
    setVaultToDelete(null);
  };

  const handleOpenUpdate = (vault: Vault, type: 'deposit' | 'withdraw') => {
    setSelectedVault(vault);
    setUpdateType(type);
    setUpdateAmount('');
    setIsUpdateModalOpen(true);
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVault || !updateAmount) return;

    const amount = parseFloat(updateAmount);
    if (isNaN(amount) || amount <= 0) return;

    let newCurrent = selectedVault.currentValue;
    if (updateType === 'deposit') {
      newCurrent += amount;
    } else {
      newCurrent = Math.max(0, newCurrent - amount);
    }

    const updatedVault = { ...selectedVault, currentValue: newCurrent };

    // Optimistic Update
    setVaults(prev => prev.map(v => v.id === selectedVault.id ? updatedVault : v));

    const path = getVaultsPath();
    if (path) {
      try {
        await setDoc(doc(db, path, selectedVault.id), updatedVault);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${path}/${selectedVault.id}`);
      }
    }

    setIsUpdateModalOpen(false);
    setSelectedVault(null);
  };

  // Calculations for stats
  const totalSaved = vaults.reduce((acc, curr) => acc + curr.currentValue, 0);
  const generalGoal = vaults.reduce((acc, curr) => acc + curr.targetValue, 0);
  const activeVaultsPercent = generalGoal > 0 ? Math.min(100, (totalSaved / generalGoal) * 105) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* HEADER SECTION WITH STATS ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">💰</span>
            Cofres Virtuais
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Destaque seu dinheiro do saldo corrente e economize para objetivos específicos de maneira organizada.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 text-xs select-none active:scale-95 transition-all text-center cursor-pointer"
        >
          <Plus size={16} /> Criar Novo Cofre
        </button>
      </div>

      {/* SUMMARY CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center text-xl font-bold">
            🏦
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Total Guardado</p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors duration-300">
          <div className="w-12 h-12 rounded-2.5xl bg-blue-50 dark:bg-blue-950/20 text-blue-500 flex items-center justify-center text-xl font-bold">
            🐷
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Cofres Ativos</p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {vaults.length} {vaults.length === 1 ? 'Cofre' : 'Cofres'}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center transition-colors duration-300">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Meta Consolidada</p>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              {generalGoal > 0 ? `${Math.round(activeVaultsPercent)}%` : 'Sem Valor Alvo'}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
            R$ {generalGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, activeVaultsPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ACTIVE COFRES VIEWS */}
      {vaults.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-12 text-center transition-colors duration-300">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center mx-auto text-4xl mb-4">
            🔒
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Cofre Vazio</h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mt-2">
            Nenhum cofre criado ainda. Guarde seu dinheiro de forma estratégica para realizar seus desejos ou compor uma reserva.
          </p>
          <button 
            type="button" 
            onClick={() => setIsNewModalOpen(true)}
            className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-3 px-6 rounded-2xl inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
          >
            <Plus size={14} /> Começar a Guardar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vaults.map((vault) => {
            const hasTarget = vault.targetValue > 0;
            const completionPercent = hasTarget ? Math.min(100, (vault.currentValue / vault.targetValue) * 100) : 0;
            const isCompleted = hasTarget && completionPercent >= 100;

            return (
              <motion.div 
                key={vault.id}
                layout
                className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs relative overflow-hidden transition-colors duration-300 group/card"
              >
                {/* Visual completion effect badge */}
                {isCompleted && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1">
                    <Award size={11} /> Meta Batida
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-slate-50 dark:bg-slate-950/40 rounded-2.5xl flex items-center justify-center text-3xl shadow-2xs">
                        {vault.icon || '🐷'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 dark:text-white capitalize text-sm">{vault.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full ${vault.currentValue > 0 ? 'bg-amber-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">
                            {vault.currentValue > 0 ? 'Com Saldo' : 'Vazio'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setVaultToDelete(vault)}
                      className="p-1 px-2 text-slate-300 hover:text-rose-500 md:opacity-0 group-hover/card:opacity-100 focus:opacity-100 transition-opacity rounded cursor-pointer"
                      title="Excluir cofre"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Financial displays */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">Guardado</p>
                      <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        R$ {vault.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-slate-400">Meta/Objetivo</p>
                      <p className="text-base font-black text-slate-500 dark:text-slate-400 mt-0.5">
                        {hasTarget ? `R$ ${vault.targetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Livre 🚀'}
                      </p>
                    </div>
                  </div>

                  {/* Progress segment if any target */}
                  {hasTarget && (
                    <div className="mt-5 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400">Progresso</span>
                        <span className="text-emerald-500 dark:text-emerald-400 font-extrabold">{Math.round(completionPercent)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Operations footer buttons */}
                <div className="flex gap-2.5 pt-4 mt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => handleOpenUpdate(vault, 'deposit')}
                    className="flex-1 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    💰 Guardar / Depositar
                  </button>
                  <button
                    onClick={() => handleOpenUpdate(vault, 'withdraw')}
                    className="flex-1 py-2.5 px-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    💸 Resgatar / Retirar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: CREATE NEW COFRE */}
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
                <h3 className="text-lg font-black dark:text-white">Criar Novo Cofre</h3>
                <button 
                  onClick={() => setIsNewModalOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateVault} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Nome do Cofre</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Reserva Estratégica"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Meta / Objetivo (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Sem meta (Livre)"
                      value={newTarget}
                      onChange={(e) => setNewTarget(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Saldo Inicial (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 100"
                      value={newCurrent}
                      onChange={(e) => setNewCurrent(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 block mb-2">Selecione o Emoji Visual</label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {VAULT_ICONS.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setNewIcon(item.emoji)}
                        className={`p-3 text-2xl rounded-xl border text-center transition-all duration-250 cursor-pointer ${
                          newIcon === item.emoji 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs scale-105' 
                            : 'bg-slate-50 dark:bg-slate-950/20 border-slate-150 dark:border-slate-800 hover:border-slate-300'
                        }`}
                        title={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-850 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                  >
                    Criar Cofre
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ACTIONS (DEPOSIT / WITHDRAW COFRE) */}
      <AnimatePresence>
        {isUpdateModalOpen && selectedVault && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsUpdateModalOpen(false);
                setSelectedVault(null);
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
                  <h3 className="text-base font-black dark:text-white">
                    {updateType === 'deposit' ? '💰 Guardar / Depositar' : '💸 Resgatar / Retirar'}
                  </h3>
                  <p className="text-[11px] text-slate-400 capitalize">{selectedVault.name}</p>
                </div>
                <button 
                  onClick={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedVault(null);
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
                    onClick={() => setUpdateType('deposit')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${updateType === 'deposit' ? 'bg-white dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    💰 Depositar
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType('withdraw')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${updateType === 'withdraw' ? 'bg-white dark:bg-slate-850 text-rose-500 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    💸 Retirar
                  </button>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Valor do Lançamento (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-slate-500 text-sm">R$</span>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={updateAmount}
                      onChange={(e) => setUpdateAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 pl-9 text-sm font-bold dark:text-white outline-none focus:border-emerald-500 transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                {updateType === 'withdraw' && selectedVault.currentValue < (parseFloat(updateAmount) || 0) && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/10 rounded-xl border border-rose-100 dark:border-rose-900/20 text-xs text-rose-500 flex gap-2">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>Atenção: O valor excede o saldo atual do cofre (R$ {selectedVault.currentValue.toFixed(2)}). O resgate reduzirá o saldo a zero.</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsUpdateModalOpen(false);
                      setSelectedVault(null);
                    }}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-850 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className={`flex-1 text-white py-3 rounded-xl font-black shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer ${updateType === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/10'}`}
                  >
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {vaultToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVaultToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300 p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500 text-2xl">
                🗑️
              </div>
              
              <h3 className="text-lg font-black dark:text-white">Excluir Cofre</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Tem certeza de que deseja excluir o cofre <strong className="text-slate-705 dark:text-slate-200 font-extrabold">"{vaultToDelete.name}"</strong>? Os valores guardados não voltarão automaticamente ao saldo total.
              </p>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setVaultToDelete(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-850 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteVault(vaultToDelete.id)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                >
                  Excluir Ativo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
