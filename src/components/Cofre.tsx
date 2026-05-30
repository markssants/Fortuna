import React, { useState, useMemo } from 'react';
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
  Info,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar as CalendarIcon,
  Edit2
} from 'lucide-react';
import { doc, setDoc, deleteDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Predefined icons/emojis for the cofre
const VAULT_ICONS = [
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

export interface VaultLog {
  id: string;
  type: 'deposit' | 'withdraw' | 'create';
  amount: number;
  date: string;
  description: string;
}

interface CofreProps {
  vaults: Vault[];
  setVaults: React.Dispatch<React.SetStateAction<Vault[]>>;
  transactions: any[];
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  handleDeleteTransaction: (id: string) => Promise<void>;
  handleUpdateTransaction: (transaction: any) => Promise<void>;
  user: any;
  theme: 'light' | 'dark';
}

export default function Cofre({ 
  vaults, 
  setVaults, 
  transactions,
  setTransactions,
  handleDeleteTransaction,
  handleUpdateTransaction,
  user, 
  theme 
}: CofreProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0]);
  const [updateType, setUpdateType] = useState<'deposit' | 'withdraw'>('deposit');
  const [vaultToDelete, setVaultToDelete] = useState<Vault | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Statement (Extrato) states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isLogDetailModalOpen, setIsLogDetailModalOpen] = useState(false);
  const [isEditingLog, setIsEditingLog] = useState(false);

  // Derived logs from global transactions
  const vaultLogs = React.useMemo(() => {
    if (!selectedVault) return [];
    return transactions
      .filter(t => t.vaultId === selectedVault.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedVault]);

  // Form states for log editing
  const [editLogAmount, setEditLogAmount] = useState('');
  const [editLogDescription, setEditLogDescription] = useState('');
  const [editLogDate, setEditLogDate] = useState('');

  // Form states
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCurrent, setNewCurrent] = useState('');
  const [newIcon, setNewIcon] = useState('🏦');
  const [isCustomIcon, setIsCustomIcon] = useState(false);

  const getVaultsPath = () => {
    return user ? `users/${user.uid}/vaults` : null;
  };

  const handleOpenNewVault = () => {
    setNewName('');
    setNewTarget('');
    setNewCurrent('');
    setNewIcon('🏦');
    setIsCustomIcon(false);
    setIsNewModalOpen(true);
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

    // Construct the initial transaction if any
    const txId = `vtx-${Date.now()}`;
    const initialTx = currentVal > 0 ? {
      id: txId,
      type: 'saida',
      value: currentVal,
      date: new Date().toISOString().split('T')[0],
      category: 'cofre',
      bank: 'Dinheiro',
      method: 'Transferência',
      description: `Depósito inicial: ${newName}`,
      essential: false,
      status: 'pago',
      recurring: false,
      userId: user?.uid,
      vaultId: vaultId
    } as any : null;

    // Optimistic Update
    setVaults(prev => [newVault, ...prev]);
    if (initialTx) {
      setTransactions(prev => [initialTx, ...prev]);
    }

    const path = getVaultsPath();
    if (path) {
      try {
        await setDoc(doc(db, path, vaultId), newVault);
        
        // Sync with main transactions
        if (initialTx && user) {
          const txPath = `users/${user.uid}/transactions`;
          await setDoc(doc(db, txPath, txId), initialTx);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${path}/${vaultId}`);
      }
    }

    // Reset Form
    setNewName('');
    setNewTarget('');
    setNewCurrent('');
    setNewIcon('🏦');
    setIsCustomIcon(false);
    setIsNewModalOpen(false);
  };

  const handleDeleteVault = async (id: string) => {
    // Also delete linked transactions as requested ("linkado", "apagou em um apaga no outro")
    const linkedTxs = transactions.filter(t => t.vaultId === id);
    
    // Optimistic Update
    setVaults(prev => prev.filter(v => v.id !== id));
    setTransactions(prev => prev.filter(t => t.vaultId !== id));

    const path = getVaultsPath();
    if (path && user) {
      try {
        await deleteDoc(doc(db, path, id));
        // Cleanup transactions in Firestore too
        const txPath = `users/${user.uid}/transactions`;
        for (const tx of linkedTxs) {
          await deleteDoc(doc(db, txPath, tx.id));
        }
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
    setUpdateDate(new Date().toISOString().split('T')[0]);
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
    const txId = `vtx-${Date.now()}`;
    const syncTx = {
      id: txId,
      type: updateType === 'deposit' ? 'saida' : 'entrada',
      value: amount,
      date: updateDate,
      category: 'cofre',
      bank: 'Dinheiro',
      method: 'Transferência',
      description: `${updateType === 'deposit' ? 'Depósito' : 'Resgate'}: ${selectedVault.name}`,
      essential: false,
      status: 'pago',
      recurring: false,
      userId: user?.uid,
      vaultId: selectedVault.id
    };

    // Optimistic / Local Update
    setVaults(prev => prev.map(v => v.id === selectedVault.id ? updatedVault : v));
    setTransactions(prev => [syncTx, ...prev]);

    const path = getVaultsPath();
    if (path && user) {
      try {
        await setDoc(doc(db, path, selectedVault.id), updatedVault);
        
        // Sync with main transactions - This creates the "Log"
        const txPath = `users/${user.uid}/transactions`;
        await setDoc(doc(db, txPath, txId), syncTx);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${path}/${selectedVault.id}`);
      }
    }

    setIsUpdateModalOpen(false);
    setSelectedVault(null);
  };

  const handleOpenEdit = (vault: Vault) => {
    setSelectedVault(vault);
    setNewName(vault.name);
    setNewTarget(vault.targetValue.toString());
    const isPredefined = VAULT_ICONS.some(icon => icon.emoji === vault.icon);
    setNewIcon(vault.icon);
    setIsCustomIcon(!isPredefined);
    setIsEditModalOpen(true);
  };

  const handleUpdateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVault || !newName) return;

    const targetVal = parseFloat(newTarget) || 0;

    const updatedVault: Vault = {
      ...selectedVault,
      name: newName,
      targetValue: targetVal,
      icon: newIcon,
    };

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

    setIsEditModalOpen(false);
    setSelectedVault(null);
    // Reset Form
    setNewName('');
    setNewTarget('');
    setNewIcon('🏦');
    setIsCustomIcon(false);
  };

  const handleOpenLogs = (vault: Vault) => {
    setSelectedVault(vault);
    setIsLogModalOpen(true);
  };

  const handleOpenLogDetail = (log: any) => {
    setSelectedLog(log);
    setEditLogAmount(log.value.toString());
    setEditLogDescription(log.description);
    setEditLogDate(log.date);
    setIsEditingLog(false);
    setIsLogDetailModalOpen(true);
  };

  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVault || !selectedLog || !user) return;

    const newAmount = parseFloat(editLogAmount);
    if (isNaN(newAmount) || newAmount < 0) return;

    const updatedTransaction = {
      ...selectedLog,
      value: newAmount,
      description: editLogDescription,
      date: editLogDate
    };

    // Use unified handler from App.tsx - it handles vault balance sync!
    await handleUpdateTransaction(updatedTransaction);

    setIsLogDetailModalOpen(false);
    setIsEditingLog(false);
  };

  const handleDeleteLog = async (log: any) => {
    if (!selectedVault || !user) return;
    
    // Use unified handler from App.tsx - it handles vault balance sync!
    await handleDeleteTransaction(log.id);

    setIsLogDetailModalOpen(false);
  };

  // Calculations for stats
  const totalSaved = vaults.reduce((acc, curr) => acc + curr.currentValue, 0);
  const generalGoal = vaults.reduce((acc, curr) => acc + curr.targetValue, 0);
  const activeVaultsPercent = generalGoal > 0 ? Math.min(100, (totalSaved / generalGoal) * 100) : 0;

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
          onClick={handleOpenNewVault}
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
            onClick={handleOpenNewVault}
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
                onClick={() => handleOpenLogs(vault)}
                className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs relative overflow-hidden transition-colors duration-300 group/card cursor-pointer hover:border-emerald-500/50 dark:hover:border-emerald-500/50"
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(vault);
                        }}
                        className="p-2 text-slate-300 hover:text-emerald-500 transition-colors rounded-lg cursor-pointer"
                        title="Editar cofre"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLogs(vault);
                        }}
                        className="p-2 text-slate-300 hover:text-emerald-500 transition-colors rounded-lg cursor-pointer"
                        title="Ver extrato"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVaultToDelete(vault);
                        }}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-lg cursor-pointer"
                        title="Excluir cofre"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenUpdate(vault, 'deposit');
                    }}
                    className="flex-1 py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    💰 Guardar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenUpdate(vault, 'withdraw');
                    }}
                    className="flex-1 py-2.5 px-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    💸 Resgatar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: VAULT STATEMENT (EXTRATO) */}
      <AnimatePresence>
        {isLogModalOpen && selectedVault && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsLogModalOpen(false);
                setSelectedVault(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-xl">
                    {selectedVault.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-black dark:text-white">Extrato do Cofre</h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{selectedVault.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsLogModalOpen(false);
                    setSelectedVault(null);
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Balance Summary in Log Modal */}
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2.5xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Saldo Atual</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">
                      R$ {selectedVault.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400">Objetivo</p>
                    <p className="text-sm font-black text-slate-500">
                      {selectedVault.targetValue > 0 ? `R$ ${selectedVault.targetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Livre'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-2">
                    <History size={14} /> Histórico de Lançamentos
                  </h4>

{vaultLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-medium">Nenhum lançamento registrado ainda.</p>
                      <p className="text-[10px] mt-1 opacity-70 italic">Transações externas vinculadas aparecerão aqui automaticamente.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {vaultLogs.map((log) => (
                        <div 
                          key={log.id} 
                          onClick={() => handleOpenLogDetail(log)}
                          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs cursor-pointer hover:border-emerald-500/30 transition-colors group/log"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              log.type === 'saida' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' 
                                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'
                            }`}>
                              {log.type === 'saida' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 dark:text-white group-hover/log:text-emerald-600 dark:group-hover/log:text-emerald-400 transition-colors">{log.description}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <CalendarIcon size={10} className="text-slate-400" />
                                <p className="text-[10px] text-slate-400 font-bold">
                                  {format(parseISO(log.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${
                              log.type === 'saida' ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {log.type === 'saida' ? '+' : '-'} R$ {log.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button 
                  onClick={() => setIsLogModalOpen(false)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Fechar Extrato
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: LOG DETAIL & EDIT */}
      <AnimatePresence>
        {isLogDetailModalOpen && selectedLog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsLogDetailModalOpen(false);
                setIsEditingLog(false);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white">Detalhes do Lançamento</h3>
                <div className="flex items-center gap-1">
                  {!isEditingLog && (
                    <button 
                      onClick={() => setIsEditingLog(true)}
                      className="p-2 text-slate-400 hover:text-emerald-500 transition-colors rounded-xl cursor-pointer"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsLogDetailModalOpen(false);
                      setIsEditingLog(false);
                    }} 
                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="rotate-45" size={24} />
                  </button>
                </div>
              </div>

              {isEditingLog ? (
                <form onSubmit={handleUpdateLog} className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Descrição</label>
                    <input 
                      type="text"
                      required
                      value={editLogDescription}
                      onChange={(e) => setEditLogDescription(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Valor (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={editLogAmount}
                      onChange={(e) => setEditLogAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Data</label>
                    <input 
                      type="date"
                      required
                      value={editLogDate}
                      onChange={(e) => setEditLogDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      type="button"
                      onClick={() => setIsEditingLog(false)}
                      className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 space-y-6">
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 ${
                      selectedLog.type === 'saida' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' 
                        : 'bg-rose-50 dark:bg-rose-950/20 text-rose-500'
                    }`}>
                      {selectedLog.type === 'saida' ? <ArrowUpRight size={32} /> : <ArrowDownLeft size={32} />}
                    </div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white">{selectedLog.description}</h4>
                    <p className={`text-2xl font-black mt-1 ${
                      selectedLog.type === 'saida' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {selectedLog.type === 'saida' ? '+' : '-'} R$ {selectedLog.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2.5xl p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase tracking-wider">Tipo</span>
                      <span className="text-slate-600 dark:text-slate-300 capitalize">
                        {selectedLog.type === 'saida' ? 'Depósito (Saída da conta)' : 'Resgate (Entrada na conta)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 uppercase tracking-wider">Data do Lançamento</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {format(parseISO(selectedLog.date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    {selectedLog.bank && (
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400 uppercase tracking-wider">Banco</span>
                        <span className="text-slate-600 dark:text-slate-300">{selectedLog.bank}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsLogDetailModalOpen(false)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3.5 rounded-2xl font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button 
                      onClick={() => handleDeleteLog(selectedLog)}
                      className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-2xl transition-colors cursor-pointer"
                      title="Excluir lançamento"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT COFRE */}
      <AnimatePresence>
        {isEditModalOpen && selectedVault && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedVault(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white">Editar Cofre</h3>
                <button 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedVault(null);
                  }} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateVault} className="p-6 space-y-4">
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
                  <label className="text-xs font-extrabold uppercase text-slate-400 block mb-2">Selecione o Emoji Visual</label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {VAULT_ICONS.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setNewIcon(item.emoji);
                          setIsCustomIcon(false);
                        }}
                        className={`p-3 text-2xl rounded-xl border text-center transition-all duration-250 cursor-pointer ${
                          newIcon === item.emoji && !isCustomIcon
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs scale-105' 
                            : 'bg-slate-50 dark:bg-slate-950/20 border-slate-150 dark:border-slate-800 hover:border-slate-300'
                        }`}
                        title={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomIcon(true);
                        setNewIcon('');
                      }}
                      className={`p-3 text-2xl rounded-xl border text-center transition-all duration-250 cursor-pointer flex items-center justify-center ${
                        isCustomIcon 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs scale-105' 
                          : 'bg-slate-50 dark:bg-slate-950/20 border-slate-150 dark:border-slate-800 hover:border-slate-300'
                      }`}
                      title="Personalizado"
                    >
                      {isCustomIcon && newIcon ? newIcon : <Plus size={24} className="text-emerald-500" />}
                    </button>
                  </div>

                  {isCustomIcon && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3"
                    >
                      <label className="text-[10px] font-extrabold uppercase text-amber-500 block mb-1">Digite seu Emoji</label>
                      <input 
                        type="text"
                        placeholder="Cole um emoji..."
                        maxLength={2}
                        value={newIcon}
                        onChange={(e) => setNewIcon(e.target.value)}
                        className="w-full bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-2.5 text-center text-xl outline-none focus:border-amber-500 transition-all font-medium dark:text-white"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedVault(null);
                    }}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                        onClick={() => {
                          setNewIcon(item.emoji);
                          setIsCustomIcon(false);
                        }}
                        className={`p-3 text-2xl rounded-xl border text-center transition-all duration-250 cursor-pointer ${
                          newIcon === item.emoji && !isCustomIcon
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs scale-105' 
                            : 'bg-slate-50 dark:bg-slate-950/20 border-slate-150 dark:border-slate-800 hover:border-slate-300'
                        }`}
                        title={item.name}
                      >
                        {item.emoji}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomIcon(true);
                        setNewIcon('');
                      }}
                      className={`p-3 text-2xl rounded-xl border text-center transition-all duration-250 cursor-pointer flex items-center justify-center ${
                        isCustomIcon 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs scale-105' 
                          : 'bg-slate-50 dark:bg-slate-950/20 border-slate-150 dark:border-slate-800 hover:border-slate-300'
                      }`}
                      title="Personalizado"
                    >
                      {isCustomIcon && newIcon ? newIcon : <Plus size={24} className="text-emerald-500" />}
                    </button>
                  </div>

                  {isCustomIcon && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3"
                    >
                      <label className="text-[10px] font-extrabold uppercase text-amber-500 block mb-1">Digite seu Emoji</label>
                      <input 
                        type="text"
                        placeholder="Cole um emoji..."
                        maxLength={2}
                        value={newIcon}
                        onChange={(e) => setNewIcon(e.target.value)}
                        className="w-full bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-2.5 text-center text-xl outline-none focus:border-amber-500 transition-all font-medium dark:text-white"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                  <button 
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
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
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${updateType === 'deposit' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    💰 Depositar
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType('withdraw')}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${updateType === 'withdraw' ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-800'}`}
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

                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 block mb-1.5">Data do Lançamento</label>
                  <input 
                    type="date"
                    required
                    value={updateDate}
                    onChange={(e) => setUpdateDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-850 rounded-xl p-3 text-sm font-bold dark:text-white outline-none focus:border-emerald-500 transition-all cursor-pointer"
                  />
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
                Tem certeza de que deseja excluir o cofre <strong className="text-slate-700 dark:text-slate-200 font-extrabold">"{vaultToDelete.name}"</strong>? Os valores guardados não voltarão automaticamente ao saldo total.
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
