import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Plus, 
  Minus, 
  LayoutDashboard, 
  List, 
  Menu, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter,
  Wallet,
  PieChart as PieChartIcon,
  Building2,
  User,
  Bookmark,
  Target,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Shield,
  Trash2,
  Info,
  Tag,
  Pencil,
  Copy,
  Utensils,
  Car,
  Sparkles,
  Activity,
  Gift,
  Home,
  Tv,
  Briefcase,
  HelpCircle,
  Trophy,
  Lock,
  Repeat,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

import { auth, db, googleProvider, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import Metas from './components/Metas';
import Cofre, { Vault } from './components/Cofre';
import Recorrentes, { Recorrente } from './components/Recorrentes';
import Contas, { Conta } from './components/Contas';
import Orcamentos from './components/Orcamentos';
import Investimentos from './components/Investimentos';
import Transacoes from './components/Transacoes';
import Calendario from './components/Calendario';
import Empresas from './components/Empresas';
import Categorias from './components/Categorias';
import { CATEGORIES, getCategoryIconAndStyle, BANKS, formatDateDisplay, getStatusColorClasses } from './constants';

const renderPieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, icon, percent } = props;
  if (!icon || percent < 0.05) return null; // Avoid overlapping small slices
  const RADIAN = Math.PI / 180;
  // Position closer to the middle of the donut slice
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      textAnchor="middle" 
      dominantBaseline="central" 
      className="text-xs select-none pointer-events-none"
    >
      {icon}
    </text>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showPasswordWall, setShowPasswordWall] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPessoalOpen, setIsPessoalOpen] = useState(true);

  // Auto-expand "Pessoal" master tab when a child tab is active
  useEffect(() => {
    const personalTabs = ['transactions', 'budgets', 'contas', 'recurrentes', 'cofre', 'goals', 'investments', 'calendar', 'categories'];
    if (personalTabs.includes(activeTab)) {
      setIsPessoalOpen(true);
    }
  }, [activeTab]);

  // States
  const [transactions, setTransactions] = useState<any[]>([
    { id: '1', type: 'saida', value: 150.50, date: '2024-05-01', category: 'alimentacao', bank: 'Nubank', method: 'Cartão de Crédito', description: 'Supermercado', essential: true, status: 'pago', recurring: false },
    { id: '2', type: 'entrada', value: 5000.00, date: '2024-05-05', category: 'salario', bank: 'Itaú', method: 'PIX', description: 'Salário Mensal', essential: true, status: 'pago', recurring: true },
    { id: '3', type: 'saida', value: 450.00, date: '2024-05-10', category: 'moradia', bank: 'Inter', method: 'Boleto', description: 'Condomínio', essential: true, status: 'atrasado', recurring: true },
    { id: '4', type: 'saida', value: 29.90, date: '2024-05-12', category: 'assinaturas', bank: 'Nubank', method: 'Cartão de Crédito', description: 'Netflix', essential: false, status: 'pago', recurring: true },
    { id: '5', type: 'saida', value: 120.00, date: '2024-05-15', category: 'transporte', bank: 'Nubank', method: 'PIX', description: 'Gasolina', essential: true, status: 'pago', recurring: false },
  ]);

  const [budgets, setBudgets] = useState<Record<string, number>>({
    alimentacao: 800,
    transporte: 400,
    lazer: 300,
    saude: 200,
    presentes: 150,
    moradia: 0,
    assinaturas: 0,
    outros: 0,
  });

  const [investments, setInvestments] = useState<any[]>([
    { id: '1', name: 'CDB Pós-Fixado', value: 10500.40, type: 'Renda Fixa' },
    { id: '2', name: 'Ações WEGE3', value: 2450.20, type: 'Ações' },
  ]);

  const [goals, setGoals] = useState<any[]>([
    { id: '1', title: 'Reserva de Emergência', target: 10000, current: 4500, deadline: '2400-12-31', category: 'reserva' },
    { id: '2', title: 'Viagem de Férias', target: 5000, current: 1500, deadline: '2026-12-25', category: 'viagem' },
  ]);

  const [vaults, setVaults] = useState<Vault[]>([
    { id: '1', name: 'Reserva Especial', targetValue: 5000, currentValue: 1200, icon: '🛡️' },
    { id: '2', name: 'Viagem de Fim de Ano', targetValue: 3050, currentValue: 450, icon: '✈️' }
  ]);

  const [recurrentes, setRecurrentes] = useState<Recorrente[]>([
    { id: '1', name: 'Netflix Premium', value: 55.90, dueDate: 10, category: 'assinaturas', status: 'ativo', bank: 'Nubank' },
    { id: '2', name: 'Academia', value: 110.00, dueDate: 5, category: 'lazer', status: 'ativo', bank: 'Itaú' },
    { id: '3', name: 'Aluguel', value: 1200.00, dueDate: 1, category: 'moradia', status: 'ativo', bank: 'Inter' }
  ]);

  const [contas, setContas] = useState<Conta[]>([
    { id: '1', name: 'Aluguel do mês', value: 1200.00, dueDate: '2026-06-10', category: 'moradia', status: 'pendente', bank: 'Nubank', notes: 'Pagar via boleto no DDA' },
    { id: '2', name: 'Conta de Energia (CPFL)', value: 185.40, dueDate: '2026-06-12', category: 'servicos', status: 'pendente', bank: 'Itaú', notes: 'Débito automático' },
    { id: '3', name: 'Conta de Água', value: 85.20, dueDate: '2026-06-05', category: 'servicos', status: 'pendente', bank: 'Inter' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    type: 'saida',
    value: '',
    date: new Date().toISOString().split('T')[0],
    category: 'outros',
    bank: 'Nubank',
    method: 'PIX',
    description: '',
    essential: false,
    status: 'pago',
    recurring: false
  });

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [statusMenuTx, setStatusMenuTx] = useState<any | null>(null);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  
  // New quick popup menu states
  const [typeMenuTx, setTypeMenuTx] = useState<any | null>(null);
  const [typeMenuAnchor, setTypeMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  const [categoryMenuTx, setCategoryMenuTx] = useState<any | null>(null);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  const [bankMenuTx, setBankMenuTx] = useState<any | null>(null);
  const [bankMenuAnchor, setBankMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  // Inline inputs for description, value, and date
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: 'description' | 'value' | 'date' } | null>(null);
  const [inlineValue, setInlineValue] = useState<string>('');

  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<string | null>(null);
  const [dashboardPopupType, setDashboardPopupType] = useState<'entradas' | 'saidas' | 'atrasadas' | 'receber' | null>(null);
  const [customCategories, setCustomCategories] = useState<any[]>([]);

  // 8 Seconds Undo Toast State
  interface UndoToast {
    id: string;
    message: string;
    type: 'transaction' | 'meta' | 'cofre' | 'recorrente' | 'conta' | 'investment' | 'budget' | 'category';
    item: any;
    extraData?: any;
  }
  const [activeUndoToast, setActiveUndoToast] = useState<UndoToast | null>(null);
  const [toastProgress, setToastProgress] = useState(100);

  const triggerUndoToast = (
    message: string, 
    type: 'transaction' | 'meta' | 'cofre' | 'recorrente' | 'conta' | 'investment' | 'budget' | 'category', 
    item: any, 
    extraData?: any
  ) => {
    setActiveUndoToast({
      id: String(Date.now()),
      message,
      type,
      item,
      extraData
    });
    setToastProgress(100);
  };

  useEffect(() => {
    if (!activeUndoToast) return;

    setToastProgress(100);
    const totalDuration = 8000; // 8 seconds
    const intervalTime = 50; // update scale / bar every 50ms
    const decrement = (intervalTime / totalDuration) * 100;

    const interval = setInterval(() => {
      setToastProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(interval);
          setActiveUndoToast(null);
          return 0;
        }
        return prev - decrement;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [activeUndoToast]);

  const handleUndoDelete = async () => {
    if (!activeUndoToast) return;
    const { type, item, extraData } = activeUndoToast;

    try {
      if (type === 'transaction') {
        if (user) {
          const path = `users/${user.uid}/transactions`;
          await setDoc(doc(db, path, item.id), item);
          
          // Restore vault balance
          if (item.vaultId) {
            const vault = vaults.find(v => v.id === item.vaultId);
            if (vault) {
              const amount = Number(item.value) || 0;
              const logContrib = item.type === 'entrada' ? -amount : amount;
              await setDoc(doc(db, `users/${user.uid}/vaults`, vault.id), {
                ...vault,
                currentValue: Math.max(0, vault.currentValue + logContrib)
              });
            }
          }

          // Restore linked bill (Conta) if any was deleted
          if (extraData?.linkedConta) {
            const contaPath = `users/${user.uid}/contas`;
            await setDoc(doc(db, contaPath, extraData.linkedConta.id), extraData.linkedConta);
          }
        } else {
          setTransactions(prev => [item, ...prev]);
          
          if (item.vaultId) {
            const vault = vaults.find(v => v.id === item.vaultId);
            if (vault) {
              const amount = Number(item.value) || 0;
              const logContrib = item.type === 'entrada' ? -amount : amount;
              setVaults(prev => prev.map(v => v.id === vault.id ? { ...v, currentValue: Math.max(0, v.currentValue + logContrib) } : v));
            }
          }

          if (extraData?.linkedConta) {
            setContas(prev => [extraData.linkedConta, ...prev]);
          }
        }
      } else if (type === 'conta') {
        if (user) {
          const path = `users/${user.uid}/contas`;
          await setDoc(doc(db, path, item.id), item);
          
          if (extraData?.linkedTx) {
            await setDoc(doc(db, `users/${user.uid}/transactions`, extraData.linkedTx.id), extraData.linkedTx);
          }
        } else {
          setContas(prev => [item, ...prev]);
          if (extraData?.linkedTx) {
            setTransactions(prev => [extraData.linkedTx, ...prev]);
          }
        }
      } else if (type === 'recorrente') {
        if (user) {
          const path = `users/${user.uid}/recurrentes`;
          await setDoc(doc(db, path, item.id), item);
        } else {
          setRecurrentes(prev => [item, ...prev]);
        }
      } else if (type === 'meta') {
        if (user) {
          const path = `users/${user.uid}/goals`;
          await setDoc(doc(db, path, item.id), item);
        } else {
          setGoals(prev => [item, ...prev]);
        }
      } else if (type === 'cofre') {
        if (user) {
          const path = `users/${user.uid}/vaults`;
          await setDoc(doc(db, path, item.id), item);
          
          if (extraData?.linkedTxs) {
            const txPath = `users/${user.uid}/transactions`;
            for (const tx of extraData.linkedTxs) {
              await setDoc(doc(db, txPath, tx.id), tx);
            }
          }
        } else {
          setVaults(prev => [item, ...prev]);
          if (extraData?.linkedTxs) {
            setTransactions(prev => [...extraData.linkedTxs, ...prev]);
          }
        }
      } else if (type === 'investment') {
        if (user) {
          const path = `users/${user.uid}/investments`;
          await setDoc(doc(db, path, item.id), item);
        } else {
          setInvestments(prev => [item, ...prev]);
        }
      } else if (type === 'budget') {
        if (user) {
          const path = `users/${user.uid}/budgets`;
          await setDoc(doc(db, path, item.categoryId), {
            categoryId: item.categoryId,
            limit: item.limit,
            userId: user.uid
          });
        } else {
          setBudgets(prev => ({ ...prev, [item.categoryId]: item.limit }));
        }
      } else if (type === 'category') {
        if (user) {
          const categoryPath = `users/${user.uid}/categories/${item.id}`;
          await setDoc(doc(db, categoryPath), item);
          
          if (extraData?.budget) {
            const budgetPath = `users/${user.uid}/budgets/${item.id}`;
            await setDoc(doc(db, budgetPath), {
              categoryId: item.id,
              limit: extraData.budget,
              userId: user.uid
            });
          }
        } else {
          setCustomCategories(prev => [item, ...prev]);
          if (extraData?.budget !== undefined) {
            setBudgets(prev => ({ ...prev, [item.id]: extraData.budget }));
          }
        }
      }
      
      setActiveUndoToast(null);
    } catch (error) {
      console.error("Erro ao desfazer exclusão:", error);
    }
  };

  // States, useMemo filters, and clearAllFilters moved to Transacoes.tsx

  // Budgets and Investments states
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  
  // States moved to Transacoes.tsx:
  // typeFilter, txSearchQuery, showAdvancedFilters, statusFilter, categoryFilter, bankFilter, paymentMethodFilter, startDateFilter, endDateFilter

  const [newBudget, setNewBudget] = useState({ categoryId: 'alimentacao', limit: '' });
  const [newCategory, setNewCategory] = useState({ name: '', icon: '', color: '#64748b' });
  const [isInvestmentModalOpen, setIsInvestmentModalOpen] = useState(false);
  const [newInvestment, setNewInvestment] = useState({ name: '', value: '', type: 'Renda Fixa' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [balanceType, setBalanceType] = useState<'total' | 'recebido' | 'futuro' | 'pendente' | 'gasto'>(() => {
    const saved = localStorage.getItem('fortuna_balance_type');
    return (saved as 'total' | 'recebido' | 'futuro' | 'pendente' | 'gasto') || 'total';
  });

  useEffect(() => {
    localStorage.setItem('fortuna_balance_type', balanceType);
  }, [balanceType]);

  const [isBalanceCardExpanded, setIsBalanceCardExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('fortuna_balance_expanded');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('fortuna_balance_expanded', String(isBalanceCardExpanded));
  }, [isBalanceCardExpanded]);

  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [investmentToDelete, setInvestmentToDelete] = useState<any | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync state with Firestore once authenticated
  useEffect(() => {
    if (!user) return;

    // A. Sync profile info
    const syncUserProfile = async () => {
      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };
    syncUserProfile();

    // B. Live sync transactions
    const transactionsPath = `users/${user.uid}/transactions`;
    const unsubTransactions = onSnapshot(collection(db, transactionsPath), (snapshot) => {
      const txs: any[] = [];
      snapshot.forEach((d) => {
        txs.push(d.data());
      });
      txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, transactionsPath);
    });

    // C. Live sync budgets
    const budgetsPath = `users/${user.uid}/budgets`;
    const unsubBudgets = onSnapshot(collection(db, budgetsPath), (snapshot) => {
      const bdgs: Record<string, number> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        bdgs[data.categoryId] = data.limit;
      });
      setBudgets(bdgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, budgetsPath);
    });

    // D. Live sync investments
    const investmentsPath = `users/${user.uid}/investments`;
    const unsubInvestments = onSnapshot(collection(db, investmentsPath), (snapshot) => {
      const invs: any[] = [];
      snapshot.forEach((d) => {
        invs.push(d.data());
      });
      setInvestments(invs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, investmentsPath);
    });

    // E. Live sync goals
    const goalsPath = `users/${user.uid}/goals`;
    const unsubGoals = onSnapshot(collection(db, goalsPath), (snapshot) => {
      const gls: any[] = [];
      snapshot.forEach((d) => {
        gls.push(d.data());
      });
      // Sort goals so they stay in consistent order
      gls.sort((a, b) => b.id.localeCompare(a.id));
      setGoals(gls);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, goalsPath);
    });

    // F. Live sync vaults
    const vaultsPath = `users/${user.uid}/vaults`;
    const unsubVaults = onSnapshot(collection(db, vaultsPath), (snapshot) => {
      const vts: Vault[] = [];
      snapshot.forEach((d) => {
        vts.push(d.data() as Vault);
      });
      vts.sort((a, b) => b.id.localeCompare(a.id));
      setVaults(vts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, vaultsPath);
    });

    // G. Live sync recurrentes
    const recurrentesPath = `users/${user.uid}/recurrentes`;
    const unsubRecurrentes = onSnapshot(collection(db, recurrentesPath), (snapshot) => {
      const rts: Recorrente[] = [];
      snapshot.forEach((d) => {
        rts.push(d.data() as Recorrente);
      });
      rts.sort((a, b) => b.id.localeCompare(a.id));
      setRecurrentes(rts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, recurrentesPath);
    });

    // I. Live sync contas
    const contasPath = `users/${user.uid}/contas`;
    const unsubContas = onSnapshot(collection(db, contasPath), (snapshot) => {
      const cts: Conta[] = [];
      snapshot.forEach((d) => {
        cts.push(d.data() as Conta);
      });
      cts.sort((a, b) => b.id.localeCompare(a.id));
      setContas(cts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, contasPath);
    });

    // H. Live sync custom categories
    const categoriesPath = `users/${user.uid}/categories`;
    const unsubCategories = onSnapshot(collection(db, categoriesPath), (snapshot) => {
      const cats: any[] = [];
      snapshot.forEach((d) => {
        cats.push(d.data());
      });
      setCustomCategories(cats);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, categoriesPath);
    });

    return () => {
      unsubTransactions();
      unsubBudgets();
      unsubInvestments();
      unsubGoals();
      unsubVaults();
      unsubRecurrentes();
      unsubContas();
      unsubCategories();
    };
  }, [user]);

  const mergedCategories = useMemo(() => {
    const customIds = new Set(customCategories.map(c => c.id));
    const filteredBase = CATEGORIES.filter(c => !customIds.has(c.id));
    const base = [...filteredBase, ...customCategories];
    const existingIds = new Set(base.map(c => c.id));
    
    // Add any categories from budgets that might not be in base
    Object.keys(budgets).forEach(budgetId => {
      if (!existingIds.has(budgetId)) {
        base.push({
          id: budgetId,
          name: budgetId.charAt(0).toUpperCase() + budgetId.slice(1),
          color: '#64748b',
          icon: '📊'
        });
        existingIds.add(budgetId);
      }
    });

    return base.sort((a, b) => a.name.localeCompare(b.name));
  }, [customCategories, budgets]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed: ", error);
    }
  };

  const handleVerifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === 'Lince7') {
      setPasswordError('');
      handleLogin();
    } else {
      setPasswordError('Senha incorreta! Digite novamente ou use uma das opções abaixo.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsDemoMode(false);
      setShowPasswordWall(false);
      setPasswordInput('');
      setPasswordError('');
      // Reset back to mock data on sign out so there's always something to view
      setTransactions([
        { id: '1', type: 'saida', value: 150.50, date: '2024-05-01', category: 'alimentacao', bank: 'Nubank', method: 'Cartão de Crédito', description: 'Supermercado', essential: true, status: 'pago', recurring: false },
        { id: '2', type: 'entrada', value: 5000.00, date: '2024-05-05', category: 'salario', bank: 'Itaú', method: 'PIX', description: 'Salário Mensal', essential: true, status: 'pago', recurring: true },
        { id: '3', type: 'saida', value: 450.00, date: '2024-05-10', category: 'moradia', bank: 'Inter', method: 'Boleto', description: 'Condomínio', essential: true, status: 'atrasado', recurring: true },
        { id: '4', type: 'saida', value: 29.90, date: '2024-05-12', category: 'assinaturas', bank: 'Nubank', method: 'Cartão de Crédito', description: 'Netflix', essential: false, status: 'pago', recurring: true },
        { id: '5', type: 'saida', value: 120.00, date: '2024-05-15', category: 'transporte', bank: 'Nubank', method: 'PIX', description: 'Gasolina', essential: true, status: 'pago', recurring: false },
      ]);
      setBudgets({
        alimentacao: 800,
        transporte: 400,
        lazer: 300,
        saude: 200,
        presentes: 150,
        moradia: 0,
        assinaturas: 0,
        outros: 0,
      });
      setInvestments([
        { id: '1', name: 'CDB Pós-Fixado', value: 10500.40, type: 'Renda Fixa' },
        { id: '2', name: 'Ações WEGE3', value: 2450.20, type: 'Ações' },
      ]);
      setGoals([
        { id: '1', title: 'Reserva de Emergência', target: 10000, current: 4500, deadline: '2400-12-31', category: 'reserva' },
        { id: '2', title: 'Viagem de Férias', target: 5000, current: 1500, deadline: '2026-12-25', category: 'viagem' },
      ]);
      setVaults([
        { id: '1', name: 'Reserva Especial', targetValue: 5000, currentValue: 1200, icon: '🛡️' },
        { id: '2', name: 'Viagem de Fim de Ano', targetValue: 3050, currentValue: 450, icon: '✈️' }
      ]);
      setRecurrentes([
        { id: '1', name: 'Netflix Premium', value: 55.90, dueDate: 10, category: 'assinaturas', status: 'ativo', bank: 'Nubank' },
        { id: '2', name: 'Academia', value: 110.00, dueDate: 5, category: 'lazer', status: 'ativo', bank: 'Itaú' },
        { id: '3', name: 'Aluguel', value: 1200.00, dueDate: 1, category: 'moradia', status: 'ativo', bank: 'Inter' }
      ]);
      setContas([
        { id: '1', name: 'Aluguel do mês', value: 1200.00, dueDate: '2026-06-10', category: 'moradia', status: 'pendente', bank: 'Nubank', notes: 'Pagar via boleto no DDA' },
        { id: '2', name: 'Conta de Energia (CPFL)', value: 185.40, dueDate: '2026-06-12', category: 'servicos', status: 'pendente', bank: 'Itaú', notes: 'Débito automático' },
        { id: '3', name: 'Conta de Água', value: 85.20, dueDate: '2026-06-05', category: 'servicos', status: 'pendente', bank: 'Inter' }
      ]);
    } catch (error) {
      console.error("Logout failed: ", error);
    }
  };

  const getStatusColorClasses = (status: string, isRow: boolean = false) => {
    switch (status) {
      case 'pago':
        return isRow 
          ? 'bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10' 
          : 'bg-emerald-50/40 dark:bg-emerald-500/10 hover:bg-emerald-100/60 dark:hover:bg-emerald-500/20 shadow-sm shadow-emerald-100/50 dark:shadow-none';
      case 'atrasado':
        return isRow 
          ? 'bg-rose-50/40 dark:bg-rose-500/5 hover:bg-rose-100/50 dark:hover:bg-rose-500/10' 
          : 'bg-rose-50/60 dark:bg-rose-500/10 hover:bg-rose-100/80 dark:hover:bg-rose-500/20 shadow-sm shadow-rose-100/50 dark:shadow-none';
      case 'pendente':
        return isRow 
          ? 'bg-amber-50/30 dark:bg-amber-500/5 hover:bg-amber-100/50 dark:hover:bg-amber-500/10' 
          : 'bg-amber-50/40 dark:bg-amber-500/10 hover:bg-amber-100/60 dark:hover:bg-amber-500/20 shadow-sm shadow-amber-100/50 dark:shadow-none';
      case 'futuro':
        return isRow 
          ? 'bg-sky-50/30 dark:bg-sky-500/5 hover:bg-sky-100/50 dark:hover:bg-sky-500/10' 
          : 'bg-sky-50/40 dark:bg-sky-500/10 hover:bg-sky-100/60 dark:hover:bg-sky-500/20 shadow-sm shadow-sky-100/50 dark:shadow-none';
      default:
        return isRow 
          ? 'hover:bg-slate-50 dark:hover:bg-slate-800/50' 
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
    }
  };

  const stats = useMemo(() => {
    const totalIn = transactions.filter(t => t.type === 'entrada').reduce((acc, curr) => acc + curr.value, 0);
    const totalOut = transactions.filter(t => t.type === 'saida').reduce((acc, curr) => acc + curr.value, 0);
    const overdue = transactions.filter(t => t.type === 'saida' && t.status === 'atrasado').reduce((acc, curr) => acc + curr.value, 0);
    const toReceive = transactions.filter(t => t.type === 'entrada' && t.status === 'pendente').reduce((acc, curr) => acc + curr.value, 0);
    
    // Status-based balances
    const receivedIn = transactions.filter(t => t.type === 'entrada' && t.status === 'pago').reduce((acc, curr) => acc + curr.value, 0);
    const receivedOut = transactions.filter(t => t.type === 'saida' && t.status === 'pago').reduce((acc, curr) => acc + curr.value, 0);
    const balanceRecebido = receivedIn - receivedOut;

    const futureIn = transactions.filter(t => t.type === 'entrada' && t.status === 'futuro').reduce((acc, curr) => acc + curr.value, 0);
    const futureOut = transactions.filter(t => t.type === 'saida' && t.status === 'futuro').reduce((acc, curr) => acc + curr.value, 0);
    const balanceFuturo = futureIn - futureOut;

    const pendingIn = transactions.filter(t => t.type === 'entrada' && t.status === 'pendente').reduce((acc, curr) => acc + curr.value, 0);
    const pendingOut = transactions.filter(t => t.type === 'saida' && (t.status === 'pendente' || t.status === 'atrasado')).reduce((acc, curr) => acc + curr.value, 0);
    const balancePendente = pendingIn - pendingOut;
    
    return {
      balance: totalIn - totalOut,
      balanceRecebido,
      balanceFuturo,
      balancePendente,
      totalIn,
      totalOut,
      overdue,
      toReceive
    };
  }, [transactions]);

  const dashboardPopupTransactions = useMemo(() => {
    if (!dashboardPopupType) return [];
    let list = [];
    if (dashboardPopupType === 'entradas') {
      list = transactions.filter(t => t.type === 'entrada');
    } else if (dashboardPopupType === 'saidas') {
      list = transactions.filter(t => t.type === 'saida');
    } else if (dashboardPopupType === 'atrasadas') {
      list = transactions.filter(t => t.type === 'saida' && t.status === 'atrasado');
    } else if (dashboardPopupType === 'receber') {
      list = transactions.filter(t => t.type === 'entrada' && t.status === 'pendente');
    }
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, dashboardPopupType]);

  const allCategoriesData = useMemo(() => {
    const dataMap: Record<string, { name: string; value: number; color: string; icon: string }> = {};
    
    // Initialize standard/custom categories
    mergedCategories.forEach(cat => {
      dataMap[cat.id] = {
        name: cat.name,
        value: 0,
        color: cat.color,
        icon: (cat as any).icon || getCategoryIconAndStyle(cat.id).icon
      };
    });
    
    // Aggregate transactions
    transactions.forEach(t => {
      if (t.type === 'saida') {
        const catId = (t.category || 'outros') as string;
        const val = typeof t.value === 'number' ? t.value : parseFloat(t.value) || 0;
        
        if (dataMap[catId]) {
          dataMap[catId].value += val;
        } else {
          const displayLabel = catId.charAt(0).toUpperCase() + catId.slice(1);
          const colors = ['#64748b', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
          const stringUniqueHash = catId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          const color = colors[stringUniqueHash % colors.length];
          
          dataMap[catId] = {
            name: displayLabel,
            value: val,
            color: color,
            icon: getCategoryIconAndStyle(catId).icon
          };
        }
      }
    });
    
    return Object.entries(dataMap).map(([id, item]) => ({
      id,
      ...item
    })).sort((a, b) => b.value - a.value);
  }, [transactions, mergedCategories]);

  const allCategoriesIncomesData = useMemo(() => {
    const dataMap: Record<string, { name: string; value: number; color: string; icon: string }> = {};
    
    // Initialize standard/custom categories
    mergedCategories.forEach(cat => {
      dataMap[cat.id] = {
        name: cat.name,
        value: 0,
        color: cat.color,
        icon: (cat as any).icon || getCategoryIconAndStyle(cat.id).icon
      };
    });
    
    // Aggregate transactions
    transactions.forEach(t => {
      if (t.type === 'entrada') {
        const catId = (t.category || 'outros') as string;
        const val = typeof t.value === 'number' ? t.value : parseFloat(t.value) || 0;
        
        if (dataMap[catId]) {
          dataMap[catId].value += val;
        } else {
          const displayLabel = catId.charAt(0).toUpperCase() + catId.slice(1);
          const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#4ade80', '#60a5fa', '#fcd34d', '#f87171'];
          const stringUniqueHash = catId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          const color = colors[stringUniqueHash % colors.length];
          
          dataMap[catId] = {
            name: displayLabel,
            value: val,
            color: color,
            icon: getCategoryIconAndStyle(catId).icon
          };
        }
      }
    });
    
    return Object.entries(dataMap).map(([id, item]) => ({
      id,
      ...item
    })).sort((a, b) => b.value - a.value);
  }, [transactions, mergedCategories]);

  const categoryExpensesData = useMemo(() => {
    return allCategoriesData.filter(d => d.value > 0);
  }, [allCategoriesData]);

  const categoryIncomesData = useMemo(() => {
    return allCategoriesIncomesData.filter(d => d.value > 0);
  }, [allCategoriesIncomesData]);

  const currentMonthName = useMemo(() => {
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
    return month.charAt(0).toUpperCase() + month.slice(1);
  }, []);

  const cashFlowData = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyNet: Record<number, number> = {};
    
    for (let i = 1; i <= lastDayOfMonth; i++) {
      dailyNet[i] = 0;
    }
    
    transactions.forEach(t => {
      try {
        const pkgDate = t.date.split('-');
        if (pkgDate.length !== 3) return;
        
        const year = parseInt(pkgDate[0]);
        const month = parseInt(pkgDate[1]) - 1;
        const day = parseInt(pkgDate[2]);
        
        if (month === currentMonth && year === currentYear) {
          const val = typeof t.value === 'number' ? t.value : parseFloat(t.value) || 0;
          if (t.type === 'entrada') {
            dailyNet[day] += val;
          } else {
            dailyNet[day] -= val;
          }
        }
      } catch (e) {
        console.error("Error parsing date for cash flow:", t.date);
      }
    });
    
    const data = [];
    let cumulative = 0;
    
    // Determine how many days to show (up to today if current month)
    const daysToShow = currentMonth === today.getMonth() && currentYear === today.getFullYear() 
      ? today.getDate() 
      : lastDayOfMonth;

    for (let i = 1; i <= daysToShow; i++) {
      cumulative += dailyNet[i];
      data.push({
        day: i.toString().padStart(2, '0'),
        value: cumulative
      });
    }
    
    // If no data yet, show at least day 01 with 0
    if (data.length === 0) {
      data.push({ day: '01', value: 0 });
    }
    
    return data;
  }, [transactions]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const transactionId = String(Date.now());
    const valFloat = parseFloat(newEntry.value);
    
    const transaction = {
      ...newEntry,
      id: transactionId,
      value: isNaN(valFloat) ? 0 : valFloat,
      userId: user ? user.uid : 'demo'
    };

    if (user) {
      const path = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, path, transactionId), transaction);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${path}/${transactionId}`);
      }
    } else {
      setTransactions([transaction, ...transactions]);
    }

    setIsModalOpen(false);
    setNewEntry({
      type: 'saida',
      value: '',
      date: new Date().toISOString().split('T')[0],
      category: 'outros',
      bank: 'Nubank',
      method: 'PIX',
      description: '',
      essential: false,
      status: 'pago',
      recurring: false
    });
  };

  const handleQuickPayRecurring = async (recorrente: Recorrente) => {
    const transactionId = String(Date.now());
    const currentDate = new Date().toISOString().split('T')[0];

    const transaction = {
      id: transactionId,
      type: 'saida',
      value: recorrente.value,
      date: currentDate,
      category: recorrente.category,
      bank: recorrente.bank,
      method: recorrente.category === 'assinaturas' ? 'Cartão de Crédito' : 'PIX',
      description: `Mensal: ${recorrente.name}`,
      essential: true,
      status: 'pago',
      recurring: true,
      recorrenteId: recorrente.id,
      userId: user ? user.uid : 'demo'
    };

    if (user) {
      const path = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, path, transactionId), transaction);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${path}/${transactionId}`);
      }
    } else {
      setTransactions(prev => [transaction, ...prev]);
    }
  };

  const handleUndoQuickPayRecurring = async (recorrente: Recorrente) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const existingTx = transactions.find(t => {
      if (!t.date) return false;
      const tDate = new Date(t.date + 'T12:00:00');
      const isSameMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      if (!isSameMonth) return false;
      return (t.recorrenteId === recorrente.id) || (t.description?.toLowerCase() === `mensal: ${recorrente.name}`.toLowerCase());
    });

    if (!existingTx) return;

    if (user) {
      const path = `users/${user.uid}/transactions`;
      try {
        await deleteDoc(doc(db, path, existingTx.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${path}/${existingTx.id}`);
      }
    } else {
      setTransactions(prev => prev.filter(t => t.id !== existingTx.id));
    }
  };

  const handleQuickPayConta = async (conta: Conta) => {
    const transactionId = conta.id;
    const currentDate = new Date().toISOString().split('T')[0];

    // Find if we have an existing transaction for this bill/conta
    const existingTx = transactions.find(t => t.id === conta.id || t.linkedContaId === conta.id);

    if (existingTx) {
      const updatedTx = {
        ...existingTx,
        status: 'pago'
      };

      if (user) {
        const path = `users/${user.uid}/transactions`;
        try {
          await setDoc(doc(db, path, existingTx.id), updatedTx);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `${path}/${existingTx.id}`);
        }
      } else {
        setTransactions(prev => prev.map(t => t.id === existingTx.id ? updatedTx : t));
      }
    } else {
      // Fallback: create a new paid transaction linked to the bill
      const transaction = {
        id: transactionId,
        type: 'saida',
        value: conta.value,
        date: currentDate,
        category: conta.category,
        bank: conta.bank,
        method: 'Boleto',
        description: `Conta: ${conta.name}`,
        essential: true,
        status: 'pago',
        recurring: false,
        userId: user ? user.uid : 'demo',
        linkedContaId: conta.id
      };

      if (user) {
        const path = `users/${user.uid}/transactions`;
        try {
          await setDoc(doc(db, path, transactionId), transaction);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `${path}/${transactionId}`);
        }
      } else {
        setTransactions(prev => [transaction, ...prev]);
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;
    
    // Bidirectional sync: check if there is a linked bill (Conta) and delete it
    const contaId = transactionToDelete.linkedContaId || id;
    const matchingContaDoc = contas.find(c => c.id === contaId);
    const hasMatchingConta = !!matchingContaDoc;

    if (user) {
      const path = `users/${user.uid}/transactions`;
      try {
        await deleteDoc(doc(db, path, id));
        
        // Delete corresponding bill from DB
        if (hasMatchingConta) {
          await deleteDoc(doc(db, `users/${user.uid}/contas`, contaId));
        }

        // Update vault balance if linked
        if (transactionToDelete.vaultId) {
          const vault = vaults.find(v => v.id === transactionToDelete.vaultId);
          if (vault) {
            const amount = Number(transactionToDelete.value) || 0;
            // If it was a deposit (saida), removing it means reducing vault balance
            // If it was a withdrawal (entrada), removing it means increasing vault balance
            const logContrib = transactionToDelete.type === 'entrada' ? -amount : amount;
            const updatedVault = { 
              ...vault, 
              currentValue: Math.max(0, vault.currentValue - logContrib) 
            };
            await setDoc(doc(db, `users/${user.uid}/vaults`, vault.id), updatedVault);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
      }
    } else {
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      // Delete corresponding bill from local state
      if (hasMatchingConta) {
        setContas(prev => prev.filter(c => c.id !== contaId));
      }

      // Local sync for vaults if in demo/local mode
      if (transactionToDelete.vaultId) {
        const vault = vaults.find(v => v.id === transactionToDelete.vaultId);
        if (vault) {
          const amount = Number(transactionToDelete.value) || 0;
          const logContrib = transactionToDelete.type === 'entrada' ? -amount : amount;
          setVaults(prev => prev.map(v => v.id === vault.id ? { ...v, currentValue: Math.max(0, v.currentValue - logContrib) } : v));
        }
      }
    }

    triggerUndoToast(
      `Transação "${transactionToDelete.description}" excluída`,
      'transaction',
      transactionToDelete,
      { linkedConta: matchingContaDoc }
    );

    setSelectedTransaction(null);
  };

  const handleDuplicateTransaction = async (originalTx: any) => {
    if (!originalTx) return;
    const transactionId = String(Date.now());
    const duplicated = {
      ...originalTx,
      id: transactionId,
    };

    if (user) {
      const path = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, path, transactionId), duplicated);
        
        // Sync vault balance if linked to a vault
        if (duplicated.vaultId) {
          const vault = vaults.find(v => v.id === duplicated.vaultId);
          if (vault) {
            const amount = Number(duplicated.value) || 0;
            const logContrib = duplicated.type === 'entrada' ? -amount : amount;
            const updatedVault = { 
              ...vault, 
              currentValue: Math.max(0, vault.currentValue + logContrib) 
            };
            await setDoc(doc(db, `users/${user.uid}/vaults`, vault.id), updatedVault);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${path}/${transactionId}`);
      }
    } else {
      setTransactions([duplicated, ...transactions]);
      
      // Local mode sync for vaults
      if (duplicated.vaultId) {
        const vault = vaults.find(v => v.id === duplicated.vaultId);
        if (vault) {
          const amount = Number(duplicated.value) || 0;
          const logContrib = duplicated.type === 'entrada' ? -amount : amount;
          setVaults(prev => prev.map(v => v.id === vault.id ? { ...v, currentValue: Math.max(0, v.currentValue + logContrib) } : v));
        }
      }
    }
    setSelectedTransaction(null);
  };

  const handleUpdateTransaction = async (updatedTransaction: any) => {
    const oldTransaction = transactions.find(t => t.id === updatedTransaction.id);
    const valFloat = parseFloat(updatedTransaction.value);
    const finalTransaction = {
      ...updatedTransaction,
      value: isNaN(valFloat) ? 0 : valFloat
    };

    // Bidirectional sync: if this transaction is linked to a Conta, update the Conta!
    const contaId = finalTransaction.linkedContaId || finalTransaction.id;
    const matchingConta = contas.find(c => c.id === contaId);

    if (matchingConta) {
      let descName = finalTransaction.description;
      if (descName.startsWith('Conta: ')) {
        descName = descName.substring(7);
      }
      
      const updatedConta = {
        ...matchingConta,
        name: descName,
        value: finalTransaction.value,
        dueDate: finalTransaction.date,
        category: finalTransaction.category,
        bank: finalTransaction.bank,
        status: finalTransaction.status as 'pago' | 'pendente' | 'atrasado'
      };

      if (user) {
        try {
          await setDoc(doc(db, `users/${user.uid}/contas`, contaId), updatedConta);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/contas/${contaId}`);
        }
      } else {
        setContas(prev => prev.map(c => c.id === contaId ? updatedConta : c));
      }
    }

    if (user) {
      const path = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, path, finalTransaction.id), finalTransaction);
        
        // Sync vault balance if linked (or unlink if needed)
        // 1. If it was linked to a vault, remove old contribution
        if (oldTransaction?.vaultId) {
          const oldVault = vaults.find(v => v.id === oldTransaction.vaultId);
          if (oldVault) {
            const amount = Number(oldTransaction.value) || 0;
            const logContrib = oldTransaction.type === 'entrada' ? -amount : amount;
            const revertedVault = { 
              ...oldVault, 
              currentValue: Math.max(0, oldVault.currentValue - logContrib) 
            };
            await setDoc(doc(db, `users/${user.uid}/vaults`, oldVault.id), revertedVault);
          }
        }

        // 2. If it is NOW linked to a vault, add new contribution
        // (If same vault, it will be updated twice but correctly)
        // To be safer, we could calculate the diff if vaultId is the same
        if (finalTransaction.vaultId) {
          const newVault = vaults.find(v => v.id === finalTransaction.vaultId);
          if (newVault) {
            const amount = Number(finalTransaction.value) || 0;
            const logContrib = finalTransaction.type === 'entrada' ? -amount : amount;
            
            // Re-fetch vault from state because it might have been updated by step 1
            // Use local state for now, Firestore onSnapshot will eventually catch up
            // For production, a transaction/batch would be better.
            const currentVaultState = vaults.find(v => v.id === newVault.id) || newVault;
            
            const updatedVault = { 
              ...currentVaultState, 
              currentValue: Math.max(0, currentVaultState.currentValue + logContrib) 
            };
            await setDoc(doc(db, `users/${user.uid}/vaults`, newVault.id), updatedVault);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${path}/${finalTransaction.id}`);
      }
    } else {
      setTransactions(prev => prev.map(t => t.id === finalTransaction.id ? finalTransaction : t));
      
      // Local mode sync
      if (oldTransaction?.vaultId) {
        setVaults(prev => prev.map(v => {
          if (v.id === oldTransaction.vaultId) {
            const amount = Number(oldTransaction.value) || 0;
            const logContrib = oldTransaction.type === 'entrada' ? -amount : amount;
            return { ...v, currentValue: Math.max(0, v.currentValue - logContrib) };
          }
          return v;
        }));
      }
      if (finalTransaction.vaultId) {
        setVaults(prev => prev.map(v => {
          if (v.id === finalTransaction.vaultId) {
            const amount = Number(finalTransaction.value) || 0;
            const logContrib = finalTransaction.type === 'entrada' ? -amount : amount;
            return { ...v, currentValue: Math.max(0, v.currentValue + logContrib) };
          }
          return v;
        }));
      }
    }
    setEditingTransaction(null);
    setSelectedTransaction(null);
  };

  const handleQuickStatusChange = async (transaction: any, newStatus: string) => {
    const updated = { ...transaction, status: newStatus };
    
    // Bidirectional sync: if this transaction is linked to a Conta, update the Conta's status!
    const contaId = updated.linkedContaId || updated.id;
    const matchingConta = contas.find(c => c.id === contaId);

    if (user) {
      const path = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, path, updated.id), updated);
        
        if (matchingConta) {
          const updatedConta = { ...matchingConta, status: newStatus as any };
          await setDoc(doc(db, `users/${user.uid}/contas`, contaId), updatedConta);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${path}/${updated.id}`);
      }
    } else {
      setTransactions(transactions.map(t => t.id === updated.id ? updated : t));
      
      if (matchingConta) {
        const updatedConta = { ...matchingConta, status: newStatus as any };
        setContas(prev => prev.map(c => c.id === contaId ? updatedConta : c));
      }
    }
    setStatusMenuTx(null);
    setStatusMenuAnchor(null);
  };

  const handleQuickFieldUpdate = async (transaction: any, field: string, value: any) => {
    let finalValue = value;
    if (field === 'value') {
      const valFloat = parseFloat(value.toString().replace(',', '.'));
      finalValue = isNaN(valFloat) ? 0 : valFloat;
    }
    const updated = { ...transaction, [field]: finalValue };

    // Bidirectional sync: check if there is a linked bill (Conta) and update it
    const contaId = updated.linkedContaId || updated.id;
    const matchingConta = contas.find(c => c.id === contaId);

    if (user) {
      const path = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, path, updated.id), updated);
        
        if (matchingConta) {
          // Map transaction fields to Conta fields
          let contaField = field;
          let contaValue = finalValue;
          if (field === 'description') {
            contaField = 'name';
            contaValue = finalValue.startsWith('Conta: ') ? finalValue.substring(7) : finalValue;
          } else if (field === 'date') {
            contaField = 'dueDate';
          }
          const updatedConta = { ...matchingConta, [contaField]: contaValue };
          await setDoc(doc(db, `users/${user.uid}/contas`, contaId), updatedConta);
        }

        // Sync vault balance if linked and value/type changed
        if (updated.vaultId && (field === 'value' || field === 'type')) {
          const vault = vaults.find(v => v.id === updated.vaultId);
          if (vault) {
            const oldContrib = transaction.type === 'entrada' ? -transaction.value : transaction.value;
            const newContrib = updated.type === 'entrada' ? -updated.value : updated.value;
            const diff = newContrib - oldContrib;
            
            const updatedVault = { 
              ...vault, 
              currentValue: Math.max(0, vault.currentValue + diff) 
            };
            await setDoc(doc(db, `users/${user.uid}/vaults`, vault.id), updatedVault);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${path}/${updated.id}`);
      }
    } else {
      setTransactions(transactions.map(t => t.id === updated.id ? updated : t));
      
      if (matchingConta) {
        let contaField = field;
        let contaValue = finalValue;
        if (field === 'description') {
          contaField = 'name';
          contaValue = finalValue.startsWith('Conta: ') ? finalValue.substring(7) : finalValue;
        } else if (field === 'date') {
          contaField = 'dueDate';
        }
        const updatedConta = { ...matchingConta, [contaField]: contaValue };
        setContas(prev => prev.map(c => c.id === contaId ? updatedConta : c));
      }

      if (updated.vaultId && (field === 'value' || field === 'type')) {
        const vault = vaults.find(v => v.id === updated.vaultId);
        if (vault) {
          const oldContrib = transaction.type === 'entrada' ? -transaction.value : transaction.value;
          const newContrib = updated.type === 'entrada' ? -updated.value : updated.value;
          const diff = newContrib - oldContrib;
          setVaults(prev => prev.map(v => v.id === vault.id ? { ...v, currentValue: Math.max(0, v.currentValue + diff) } : v));
        }
      }
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitFloat = parseFloat(newBudget.limit);
    if (!newBudget.categoryId || isNaN(limitFloat) || limitFloat <= 0) return;

    const updatedBudgets = {
      ...budgets,
      [newBudget.categoryId]: limitFloat
    };

    if (user) {
      const path = `users/${user.uid}/budgets`;
      try {
        await setDoc(doc(db, path, newBudget.categoryId), {
          categoryId: newBudget.categoryId,
          limit: limitFloat,
          userId: user.uid
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${path}/${newBudget.categoryId}`);
      }
    } else {
      setBudgets(updatedBudgets);
    }

    setIsBudgetModalOpen(false);
    setSelectedBudgetCategory(null);
    setNewBudget({ categoryId: 'alimentacao', limit: '' });
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCategory.name) return;

    const catId = editingCategoryId || newCategory.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
    const categoryPath = `users/${user.uid}/categories/${catId}`;

    try {
      await setDoc(doc(db, categoryPath), {
        id: catId,
        name: newCategory.name,
        icon: newCategory.icon,
        color: newCategory.color,
        userId: user.uid
      });
      setIsCategoryModalOpen(false);
      setEditingCategoryId(null);
      setNewCategory({ name: '', icon: '', color: '#64748b' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, categoryPath);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!user) return;
    const categoryPath = `users/${user.uid}/categories/${catId}`;
    const categoryToDelete = customCategories.find(c => c.id === catId);
    const budgetLimit = budgets[catId];
    try {
      await deleteDoc(doc(db, categoryPath));
      
      // Delete corresponding budget limit as well to be clean
      const budgetPath = `users/${user.uid}/budgets/${catId}`;
      await deleteDoc(doc(db, budgetPath));

      setIsCategoryModalOpen(false);
      setEditingCategoryId(null);
      setNewCategory({ name: '', icon: '', color: '#64748b' });

      if (categoryToDelete) {
        triggerUndoToast(
          `Categoria "${categoryToDelete.name}" excluída`,
          'category',
          categoryToDelete,
          { budget: budgetLimit }
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, categoryPath);
    }
  };

  const handleDeleteBudget = async (categoryId: string) => {
    const budgetLimit = budgets[categoryId];
    const budgetItem = { categoryId, limit: budgetLimit };

    if (user) {
      const path = `users/${user.uid}/budgets`;
      try {
        await deleteDoc(doc(db, path, categoryId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${path}/${categoryId}`);
      }
    } else {
      const updatedBudgets = { ...budgets };
      delete updatedBudgets[categoryId];
      setBudgets(updatedBudgets);
    }

    triggerUndoToast(
      `Limite da categoria "${categoryId}" excluído`,
      'budget',
      budgetItem
    );

    setSelectedBudgetCategory(null);
    setBudgetToDelete(null);
  };

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    const valFloat = parseFloat(newInvestment.value);
    if (!newInvestment.name || isNaN(valFloat) || valFloat <= 0) return;

    const id = String(Date.now());
    const investmentItem = {
      id,
      name: newInvestment.name,
      value: valFloat,
      type: newInvestment.type,
      userId: user ? user.uid : 'demo'
    };

    if (user) {
      const path = `users/${user.uid}/investments`;
      try {
        await setDoc(doc(db, path, id), investmentItem);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${path}/${id}`);
      }
    } else {
      setInvestments([investmentItem, ...investments]);
    }

    setIsInvestmentModalOpen(false);
    setNewInvestment({ name: '', value: '', type: 'Renda Fixa' });
  };

  const handleDeleteInvestment = async (id: string) => {
    const investmentToDeleteDoc = investments.find(inv => inv.id === id);
    if (user) {
      const path = `users/${user.uid}/investments`;
      try {
        await deleteDoc(doc(db, path, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
      }
    } else {
      setInvestments(investments.filter(inv => inv.id !== id));
    }

    if (investmentToDeleteDoc) {
      triggerUndoToast(
        `Investimento "${investmentToDeleteDoc.name}" excluído`,
        'investment',
        investmentToDeleteDoc
      );
    }

    setInvestmentToDelete(null);
  };

  const handleExportData = () => {
    const dataToExport = {
      transactions,
      budgets,
      investments,
      goals,
      vaults,
      recurrentes,
      customCategories,
      exportDate: new Date().toISOString(),
      appName: 'Finanças App'
    };
    
    try {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meus_dados_financeiros_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Ocorreu um erro ao exportar os dados.');
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const SidebarItem = ({ icon: Icon, label, id, isSubItem = false }: { icon: any, label: string, id: string, isSubItem?: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 rounded-xl transition-all ${
        isSubItem 
          ? 'px-3.5 py-2 text-sm' 
          : 'px-4 py-3'
      } ${
        activeTab === id 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={isSubItem ? 16 : 20} className="shrink-0" />
      <span className="font-medium truncate">{label}</span>
    </button>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-300 relative overflow-hidden">
        {/* Subtle decorative background blur glows to fit premium look */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-3xl"></div>

        <div className="flex flex-col items-center max-w-sm w-full text-center space-y-3 relative z-10">
          <div className="relative">
            <div className="bg-transparent p-1 shrink-0 animate-pulse relative z-10 w-40 h-40 flex items-center justify-center overflow-hidden">
              <img src="/Logotipo Fortuna.png" alt="Fortuna Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-ping opacity-60"></div>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Carregando seu portal financeiro seguro...</p>
          </div>
          <div className="w-16 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden animate-pulse">
            <div className="h-full bg-emerald-600 rounded-full w-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors duration-300 relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 -z-10"></div>

        {/* Top Navbar */}
        <header className="max-w-7xl mx-auto w-full px-12 py-10 sm:px-20 sm:py-12 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 mt-8 ml-6 sm:ml-12">
              <img src="/Logotipo Fortuna.png" alt="Fortuna Logo" className="h-20 sm:h-24 w-auto object-contain" />
              <span className="absolute -top-1 -right-6 text-[9.5px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter select-none font-bold">V1.2</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
              title={theme === 'light' ? 'Tema Escuro' : 'Tema Claro'}
              id="landing-theme-toggle"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Main Section */}
        <main className="max-w-7xl mx-auto w-full px-6 flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 py-12 relative z-10">
          {/* Left Hero Column */}
          <div className="flex-1 space-y-8 max-w-xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 rounded-full text-emerald-800 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase">
              ✨ Gestão Financeira Inteligente
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Sua fortuna sob <span className="text-emerald-600">completo controle</span>.
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Fortuna ajuda você a mapear despesas, consolidar investimentos e planejar orçamentos através de uma interface elegante e segura. Tudo sincronizado com sua conta do Google na nuvem.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2 hover:translate-y-[-2px] transition-all duration-300">
                <div className="p-2 bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 w-fit rounded-lg">
                  <LayoutDashboard size={18} />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Visão Geral Dinâmica</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Gráficos de pizza, tendências de entradas e saídas automáticas.</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2 hover:translate-y-[-2px] transition-all duration-300">
                <div className="p-2 bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 w-fit rounded-lg">
                  <Target size={18} />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Orçamentos Conscientes</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monitore limites sob medida e controle excessos de gastos.</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2 hover:translate-y-[-2px] transition-all duration-300">
                <div className="p-2 bg-amber-100/50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 w-fit rounded-lg">
                  <TrendingUp size={18} />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Investimentos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Monitore o crescimento do seu capital de Renda Fixa e Ações.</p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2 hover:translate-y-[-2px] transition-all duration-300">
                <div className="p-2 bg-purple-100/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 w-fit rounded-lg">
                  <Calendar size={18} />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Calendário Diário</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Veja o fluxo planejado por dia e evite atrasar contas.</p>
              </div>
            </div>
          </div>

          {/* Right Login Column */}
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800/80 shadow-xl shadow-slate-100 dark:shadow-none space-y-6"
            >
              {!showPasswordWall ? (
                <>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Entrar no Fortuna</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                      Crie ou acesse sua conta gratuitamente usando o login do Google de forma 100% segura.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowPasswordWall(true)}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 dark:shadow-none text-base active:scale-[0.98]"
                    id="main-login-btn"
                  >
                    {/* SVG for Google Icon */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Entrar com Google
                  </button>

                  <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                    <span className="px-3 text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider font-mono">ou</span>
                    <div className="flex-1 border-t border-slate-200 dark:border-slate-800"></div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setIsDemoMode(true)}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl transition-all cursor-pointer text-sm"
                      id="main-demo-btn"
                    >
                      Explorar no Modo de Demonstração
                    </button>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                      No modo de demonstração, seus dados serão guardados temporariamente neste navegador. Use uma conta Google para sincronizar e manter tudo salvo de forma permanente e segura na nuvem.
                    </p>
                  </div>
                </>
              ) : (
                <form onSubmit={handleVerifyPassword} className="space-y-6">
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordWall(false);
                        setPasswordInput('');
                        setPasswordError('');
                      }}
                      className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Senha de acesso</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                      Por favor, informe a senha para poder prosseguir com o login do Google.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Senha</label>
                    <input
                      type="password"
                      placeholder="Digite a senha..."
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-white transition-all"
                      autoFocus
                    />
                    {passwordError && (
                      <p className="text-xs text-rose-500 font-medium flex items-center gap-1.5 mt-1.5">
                        <AlertCircle size={14} /> {passwordError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 dark:shadow-none text-base active:scale-[0.98]"
                  >
                    Confirmar e Prosseguir
                  </button>

                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <a
                      href="https://wa.me/5519971087116?text=N%C3%A3o%20sei%20a%20senha%20do%20Fortuna"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer text-center"
                    >
                      Não sei a senha
                    </a>
                    <a
                      href="https://wa.me/5519971087116?text=Esqueci%20a%20senha%20do%20Fortuna"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer text-center"
                    >
                      Esqueci a senha
                    </a>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-100 dark:border-slate-900/60 w-full py-6 mt-12 bg-white/30 dark:bg-slate-950/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
            <p>© 2026 Fortuna. Todos os direitos reservados. Conexão encriptada de ponta a ponta.</p>
            <div className="flex items-center gap-y-2 sm:gap-4 flex-wrap justify-center">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Banco de dados encriptado e protegido
              </span>
              <span className="hidden sm:inline">•</span>
              <span>100% Privado</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 hidden md:flex flex-col h-screen sticky top-0 overflow-y-auto shrink-0">
        <div className="flex items-center justify-center mb-10 mt-6 px-2 w-full">
          <div className="relative shrink-0">
            <img src="/Logotipo Fortuna.png" alt="Fortuna Logo" className="h-16 w-auto object-contain" />
            <span className="absolute -top-0.5 -right-5 text-[8.5px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter select-none font-bold">V1.2</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-2 select-none">
          <SidebarItem icon={LayoutDashboard} label="Visão Geral" id="dashboard" />
          
          {/* Aba Mestre "Pessoal" */}
          <div className="space-y-1">
            <button
              onClick={() => setIsPessoalOpen(!isPessoalOpen)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                ['transactions', 'budgets', 'contas', 'recurrentes', 'cofre', 'goals', 'investments', 'calendar', 'categories'].includes(activeTab)
                  ? 'text-emerald-600 dark:text-emerald-500 font-bold bg-emerald-50/20 dark:bg-emerald-950/10'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <User size={20} className="shrink-0" />
                <span className="font-medium">Pessoal</span>
              </div>
              <motion.div
                animate={{ rotate: isPessoalOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400 shrink-0"
              >
                <ChevronDown size={16} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isPessoalOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden ml-4 pl-2 border-l border-slate-100 dark:border-slate-800/80 space-y-1"
                >
                  <SidebarItem icon={List} label="Transações" id="transactions" isSubItem />
                  <SidebarItem icon={Target} label="Orçamentos" id="budgets" isSubItem />
                  <SidebarItem icon={Receipt} label="Contas a Pagar" id="contas" isSubItem />
                  <SidebarItem icon={Repeat} label="Recorrentes" id="recurrentes" isSubItem />
                  <SidebarItem icon={Lock} label="Cofre" id="cofre" isSubItem />
                  <SidebarItem icon={Trophy} label="Metas" id="goals" isSubItem />
                  <SidebarItem icon={TrendingUp} label="Investimentos" id="investments" isSubItem />
                  <SidebarItem icon={Calendar} label="Calendário" id="calendar" isSubItem />
                  <SidebarItem icon={Tag} label="Categorias" id="categories" isSubItem />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <SidebarItem icon={Building2} label="Minhas Empresas (PJ)" id="empresas" />
        </nav>

        <div className="mt-8 space-y-4">
          {/* Saldo Card */}
          <div className={`p-4 rounded-3xl transition-all duration-300 relative ${
            balanceType === 'total' ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40' :
            balanceType === 'recebido' ? 'bg-teal-50/70 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40' :
            balanceType === 'futuro' ? 'bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40' :
            balanceType === 'pendente' ? 'bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40' :
            'bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40'
          }`}>
            <div 
              onClick={() => setIsBalanceCardExpanded(!isBalanceCardExpanded)}
              className="cursor-pointer select-none"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-extrabold uppercase tracking-[0.1em] ${
                  balanceType === 'total' ? 'text-emerald-700 dark:text-emerald-400' :
                  balanceType === 'recebido' ? 'text-teal-700 dark:text-teal-400' :
                  balanceType === 'futuro' ? 'text-sky-750 dark:text-sky-400' :
                  balanceType === 'pendente' ? 'text-amber-700 dark:text-amber-400' :
                  'text-rose-700 dark:text-rose-400'
                }`}>
                  {balanceType === 'total' ? '💵 Saldo Total' :
                   balanceType === 'recebido' ? '✅ Em conta' :
                   balanceType === 'futuro' ? '🔮 Saldo Futuro' :
                   balanceType === 'pendente' ? '⏳ Saldo Pendente' :
                   '💸 Total Gasto'}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBalanceCardExpanded(!isBalanceCardExpanded);
                  }}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-slate-500 dark:text-slate-400 font-bold"
                  title={isBalanceCardExpanded ? "Recolher Saldos" : "Expandir Saldos"}
                >
                  {isBalanceCardExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
              </div>
              <p className={`text-xl font-black tracking-tight leading-none mb-1 transition-colors duration-300 ${
                  balanceType === 'total' ? 'text-emerald-900 dark:text-emerald-50' :
                  balanceType === 'recebido' ? 'text-teal-900 dark:text-teal-50' :
                  balanceType === 'futuro' ? 'text-sky-900 dark:text-sky-50' :
                  balanceType === 'pendente' ? 'text-amber-900 dark:text-amber-50' :
                  'text-rose-900 dark:text-rose-50'
              }`}>
                R$ {
                  (balanceType === 'total' ? stats.balance :
                   balanceType === 'recebido' ? stats.balanceRecebido :
                   balanceType === 'futuro' ? stats.balanceFuturo :
                   balanceType === 'pendente' ? stats.balancePendente :
                   stats.totalOut).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                }
              </p>
            </div>

            <AnimatePresence initial={false}>
              {isBalanceCardExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-slate-900/5 dark:border-white/5 space-y-1 text-[10px]">
                    <button 
                      onClick={() => setBalanceType('total')}
                      className={`w-full flex items-center justify-between font-semibold p-1 rounded-md transition-colors ${
                        balanceType === 'total' ? 'bg-emerald-500/10 dark:bg-emerald-500/20 font-bold text-emerald-800 dark:text-emerald-300' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>Total:</span>
                      <span>R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </button>
                    <button 
                      onClick={() => setBalanceType('recebido')}
                      className={`w-full flex items-center justify-between font-semibold p-1 rounded-md transition-colors ${
                        balanceType === 'recebido' ? 'bg-teal-500/10 dark:bg-teal-500/20 font-bold text-teal-800 dark:text-teal-300' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>Em conta:</span>
                      <span>R$ {stats.balanceRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </button>
                    <button 
                      onClick={() => setBalanceType('futuro')}
                      className={`w-full flex items-center justify-between font-semibold p-1 rounded-md transition-colors ${
                        balanceType === 'futuro' ? 'bg-sky-500/10 dark:bg-sky-500/20 font-bold text-sky-800 dark:text-sky-300' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>Futuro:</span>
                      <span>R$ {stats.balanceFuturo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </button>
                    <button 
                      onClick={() => setBalanceType('pendente')}
                      className={`w-full flex items-center justify-between font-semibold p-1 rounded-md transition-colors ${
                        balanceType === 'pendente' ? 'bg-amber-500/10 dark:bg-amber-500/20 font-bold text-amber-800 dark:text-amber-300' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>Pendente:</span>
                      <span>R$ {stats.balancePendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </button>
                    <button 
                      onClick={() => setBalanceType('gasto')}
                      className={`w-full flex items-center justify-between font-semibold p-1 rounded-md transition-colors ${
                        balanceType === 'gasto' ? 'bg-rose-500/10 dark:bg-rose-500/20 font-bold text-rose-800 dark:text-rose-300' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span>Total gasto:</span>
                      <span>R$ {stats.totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Authentication Panel */}
          {authLoading ? (
            <div className="py-2 text-center text-xs text-slate-400">Carregando perfil...</div>
          ) : user ? (
            <button 
              onClick={() => setIsUserModalOpen(true)}
              className="w-full text-left flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'Avatar'} 
                    className="w-8 h-8 rounded-full border border-emerald-500/30 shrink-0 group-hover:scale-110 transition-transform"
                    referrerPolicy="no-referrer"
                    id="user-avatar"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0 group-hover:scale-110 transition-transform">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate dark:text-slate-100 group-hover:text-emerald-600 transition-colors">{user.displayName || 'Usuário'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-3 bg-emerald-50/30 dark:bg-slate-800/30 rounded-2xl border border-dashed border-emerald-500/20 dark:border-slate-700/50 flex flex-col gap-2">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">Sincronize com a nuvem de forma segura.</p>
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-200 dark:shadow-none cursor-pointer"
                id="login-btn"
              >
                <LogIn size={12} />
                Entrar com Google
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">Olá, {user ? (user.displayName || 'Organizado') : 'Organizado'}! 👋</h2>
            <p className="text-slate-500 dark:text-slate-400">
              {user ? 'Seus dados financeiros sincronizados em tempo real.' : 'Aqui está o resumo do seu dinheiro hoje.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl flex-1 md:flex-none flex items-center justify-center gap-2 font-semibold shadow-lg shadow-emerald-100 dark:shadow-emerald-900/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={20} />
              Nova Transação
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Top Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                  onClick={() => setDashboardPopupType('entradas')}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                      <ArrowUpCircle size={20} />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Entradas</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">R$ {stats.totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div 
                  onClick={() => setDashboardPopupType('saidas')}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg group-hover:scale-110 transition-transform">
                      <ArrowDownCircle size={20} />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Saídas</span>
                  </div>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 text-right">R$ {stats.totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div 
                  onClick={() => setDashboardPopupType('atrasadas')}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                      <AlertCircle size={20} />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Contas Atrasadas</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">R$ {stats.overdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div 
                  onClick={() => setDashboardPopupType('receber')}
                  className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Pra Receber</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">R$ {stats.toReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Charts Section: Pie Charts side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <h3 className="font-bold mb-6 flex items-center gap-2 dark:text-white"><PieChartIcon size={18} className="text-emerald-600" /> Entradas por Categoria</h3>
                  
                  {categoryIncomesData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-4">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-850/50 rounded-full flex items-center justify-center mb-3 text-slate-400">
                        <PieChartIcon size={28} />
                      </div>
                      <p className="font-bold text-sm text-slate-705 dark:text-slate-200">Nenhuma entrada registrada</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Adicione uma transação de entrada para gerar o gráfico.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="h-56 md:col-span-5 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryIncomesData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={75}
                              paddingAngle={4}
                              dataKey="value"
                              stroke="none"
                              labelLine={false}
                              label={renderPieLabel}
                            >
                              {categoryIncomesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: any, props: any) => {
                                const entry = props?.payload;
                                const emoji = entry?.icon ? `${entry.icon} ` : '';
                                return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${emoji}${name}`];
                              }}
                              contentStyle={{ 
                                backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                                borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', 
                                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                                borderRadius: '12px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="md:col-span-7 space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(() => {
                          const totalIncome = categoryIncomesData.reduce((acc, curr) => acc + curr.value, 0);
                          return categoryIncomesData.map((item) => {
                            const percentage = totalIncome > 0 ? (item.value / totalIncome) * 100 : 0;
                            return (
                              <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                    <span className="mr-1">{item.icon}</span>{item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-right">
                                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold w-10 shrink-0">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <h3 className="font-bold mb-6 flex items-center gap-2 dark:text-white"><PieChartIcon size={18} className="text-rose-500" /> Gastos por Categoria</h3>
                  
                  {categoryExpensesData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-4">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-850/50 rounded-full flex items-center justify-center mb-3 text-slate-400">
                        <PieChartIcon size={28} />
                      </div>
                      <p className="font-bold text-sm text-slate-705 dark:text-slate-200">Nenhum gasto registrado</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Adicione uma transação de saída para gerar o gráfico.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="h-56 md:col-span-5 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryExpensesData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={75}
                              paddingAngle={4}
                              dataKey="value"
                              stroke="none"
                              labelLine={false}
                              label={renderPieLabel}
                            >
                              {categoryExpensesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: any, props: any) => {
                                const entry = props?.payload;
                                const emoji = entry?.icon ? `${entry.icon} ` : '';
                                return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${emoji}${name}`];
                              }}
                              contentStyle={{ 
                                backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                                borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', 
                                color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                                borderRadius: '12px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="md:col-span-7 space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(() => {
                          const totalSpend = categoryExpensesData.reduce((acc, curr) => acc + curr.value, 0);
                          return categoryExpensesData.map((item) => {
                            const percentage = totalSpend > 0 ? (item.value / totalSpend) * 100 : 0;
                            return (
                              <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                    <span className="mr-1">{item.icon}</span>{item.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-right">
                                  <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold w-10 shrink-0">
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cash Flow and Recents side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <h3 className="font-bold mb-6 flex items-center gap-2 dark:text-white"><TrendingUp size={18} className="text-emerald-600" /> Fluxo de Caixa ({currentMonthName})</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cashFlowData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                        <YAxis hide />
                        <Tooltip 
                          formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          contentStyle={{ 
                            backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', 
                            borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', 
                            color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                            borderRadius: '12px'
                          }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden text-slate-900 dark:text-slate-100">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold">Últimas Atividades</h3>
                    <button onClick={() => setActiveTab('transactions')} className="text-emerald-600 text-sm font-semibold hover:underline">Ver todas</button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                    {transactions.slice(0, 8).map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => setSelectedTransaction(t)}
                        className={`p-4 flex items-center justify-between transition-all duration-300 cursor-pointer ${getStatusColorClasses(t.status)}`}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTypeMenuTx(t);
                              setTypeMenuAnchor({ x: e.clientX, y: e.clientY });
                            }}
                            className={`p-2 rounded-xl shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 hover:scale-105 active:scale-95 transition-all ${
                              t.type === 'entrada' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {t.type === 'entrada' ? <Plus size={20} /> : <Minus size={20} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
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
                                    }
                                  }}
                                  className="px-2 py-0.5 text-sm font-semibold border-b-2 border-emerald-500 bg-slate-100 dark:bg-slate-800 rounded outline-none w-48"
                                />
                              ) : (
                                <p 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEdit({ id: t.id, field: 'description' });
                                    setInlineValue(t.description);
                                  }}
                                  className="font-semibold cursor-pointer hover:underline decoration-dotted decoration-emerald-500/80 flex items-center gap-2"
                                >
                                  {t.description}
                                  {t.vaultId && (
                                    <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                                      Cofre
                                    </span>
                                  )}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
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
                                    }
                                  }}
                                  className="px-1 py-0.5 text-[10px] border-b border-emerald-500 bg-slate-100 dark:bg-slate-800 rounded outline-none"
                                />
                              ) : (
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInlineEdit({ id: t.id, field: 'date' });
                                    setInlineValue(t.date);
                                  }}
                                  className="cursor-pointer hover:underline decoration-emerald-500/60"
                                >
                                  {formatDateDisplay(t.date)}
                                </span>
                              )}
                              <span>•</span>
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCategoryMenuTx(t);
                                  setCategoryMenuAnchor({ x: e.clientX, y: e.clientY });
                                }}
                                className="cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline decoration-emerald-500/60 transition-colors capitalize"
                              >
                                {mergedCategories.find(c => c.id === t.category)?.name || t.category}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${t.type === 'entrada' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
                            {t.type === 'entrada' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusMenuTx(t);
                              setStatusMenuAnchor({ x: e.clientX, y: e.clientY });
                            }}
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all ${
                              t.status === 'atrasado' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300' : 
                              t.status === 'pago' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300' : 
                              'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'
                            }`}
                          >
                            {t.status === 'pago' ? 'Pago' : t.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <Transacoes
              transactions={transactions}
              categories={mergedCategories}
              setSelectedTransaction={setSelectedTransaction}
              setTypeMenuTx={setTypeMenuTx}
              setTypeMenuAnchor={setTypeMenuAnchor}
              setCategoryMenuTx={setCategoryMenuTx}
              setCategoryMenuAnchor={setCategoryMenuAnchor}
              setBankMenuTx={setBankMenuTx}
              setBankMenuAnchor={setBankMenuAnchor}
              setStatusMenuTx={setStatusMenuTx}
              setStatusMenuAnchor={setStatusMenuAnchor}
              handleQuickFieldUpdate={handleQuickFieldUpdate}
              inlineEdit={inlineEdit}
              setInlineEdit={setInlineEdit}
              inlineValue={inlineValue}
              setInlineValue={setInlineValue}
              onDuplicateTransaction={handleDuplicateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'budgets' && (
            <Orcamentos 
              budgets={budgets}
              transactions={transactions}
              categories={mergedCategories}
              setIsBudgetModalOpen={setIsBudgetModalOpen}
              setIsCategoryModalOpen={setIsCategoryModalOpen}
              setSelectedBudgetCategory={setSelectedBudgetCategory}
              setNewBudget={setNewBudget}
              setEditingCategoryId={setEditingCategoryId}
              setNewCategory={setNewCategory}
            />
          )}

          {activeTab === 'investments' && (
            <Investimentos 
              investments={investments}
              setIsInvestmentModalOpen={setIsInvestmentModalOpen}
              setInvestmentToDelete={setInvestmentToDelete}
              theme={theme}
            />
          )}

          {activeTab === 'goals' && (
            <Metas 
              goals={goals} 
              setGoals={setGoals} 
              transactions={transactions}
              setTransactions={setTransactions}
              user={user} 
              theme={theme} 
              triggerUndoToast={triggerUndoToast}
            />
          )}

          {activeTab === 'cofre' && (
            <Cofre 
              vaults={vaults} 
              setVaults={setVaults} 
              transactions={transactions}
              setTransactions={setTransactions}
              handleDeleteTransaction={handleDeleteTransaction}
              handleUpdateTransaction={handleUpdateTransaction}
              user={user} 
              theme={theme} 
              triggerUndoToast={triggerUndoToast}
            />
          )}

          {activeTab === 'recurrentes' && (
            <Recorrentes 
              recurrentes={recurrentes} 
              setRecurrentes={setRecurrentes} 
              user={user} 
              theme={theme}
              onQuickPay={handleQuickPayRecurring}
              onUndoPay={handleUndoQuickPayRecurring}
              transactions={transactions}
              triggerUndoToast={triggerUndoToast}
            />
          )}

          {activeTab === 'contas' && (
            <Contas 
              contas={contas} 
              setContas={setContas} 
              transactions={transactions}
              setTransactions={setTransactions}
              user={user} 
              theme={theme}
              onQuickPay={handleQuickPayConta}
              triggerUndoToast={triggerUndoToast}
            />
          )}

          {activeTab === 'calendar' && (
            <Calendario 
              transactions={transactions} 
              theme={theme} 
              onSelectTransaction={setSelectedTransaction}
            />
          )}

          {activeTab === 'empresas' && (
            <Empresas 
              user={user} 
              theme={theme}
            />
          )}

          {activeTab === 'categories' && (
            <Categorias
              categories={mergedCategories}
              customCategories={customCategories}
              transactions={transactions}
              user={user}
              theme={theme}
              triggerUndoToast={triggerUndoToast}
              budgets={budgets}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative z-10 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold dark:text-white">Nova Transação</h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                  <button 
                    type="button" 
                    onClick={() => setNewEntry({...newEntry, type: 'saida'})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newEntry.type === 'saida' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <Minus size={14} className="inline mr-1" /> Saída
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setNewEntry({...newEntry, type: 'entrada'})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newEntry.type === 'entrada' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <Plus size={14} className="inline mr-1" /> Entrada
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      placeholder="0,00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white text-base md:text-sm"
                      value={newEntry.value}
                      onChange={(e) => setNewEntry({...newEntry, value: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white text-base md:text-sm"
                      value={newEntry.date}
                      onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Aluguel, Supermercado..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white text-base md:text-sm"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize dark:text-white text-base md:text-sm"
                      value={newEntry.category}
                      onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                    >
                      {mergedCategories.map(c => <option key={c.id} value={c.id}>{(c as any).icon || getCategoryIconAndStyle(c.id).icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Banco</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                      value={newEntry.bank}
                      onChange={(e) => setNewEntry({...newEntry, bank: e.target.value})}
                    >
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Status da Transação</label>
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setNewEntry({...newEntry, status: 'pago'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${newEntry.status === 'pago' ? 'bg-emerald-555 bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-705 dark:hover:text-slate-200'}`}
                    >
                      {newEntry.type === 'entrada' ? 'Recebido' : 'Pago'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setNewEntry({...newEntry, status: 'pendente'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${newEntry.status === 'pendente' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-705 dark:hover:text-slate-200'}`}
                    >
                      Pendente
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setNewEntry({...newEntry, status: 'atrasado'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${newEntry.status === 'atrasado' ? 'bg-rose-650 bg-rose-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-750 dark:hover:text-slate-200'}`}
                    >
                      Atrasado
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setNewEntry({...newEntry, status: 'futuro'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${newEntry.status === 'futuro' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-705 dark:hover:text-slate-200'}`}
                    >
                      Futuro
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                   <div className="flex items-center gap-2">
                      <Bookmark size={16} className={newEntry.essential ? 'text-emerald-500' : 'text-slate-400'} />
                      <span className="text-sm font-medium dark:text-slate-300">Gasto Essencial?</span>
                   </div>
                   <button 
                    type="button"
                    onClick={() => setNewEntry({...newEntry, essential: !newEntry.essential})}
                    className={`w-10 h-5 rounded-full relative transition-all ${newEntry.essential ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                   >
                      <motion.div 
                        initial={false}
                        animate={{ x: newEntry.essential ? 20 : 0 }}
                        className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm" 
                      />
                   </button>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-black dark:hover:bg-emerald-700 transition-all active:scale-[0.98] mt-2"
                >
                  Confirmar Lançamento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTransaction(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800/80 overflow-hidden relative z-10 transition-colors duration-300"
            >
              {/* Top Hero Card header (Colored depending on category/type) */}
              <div className={`p-8 text-center relative overflow-hidden ${
                selectedTransaction.type === 'entrada'
                  ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-50/20 to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 border-b border-emerald-100/30 dark:border-emerald-950/20'
                  : 'bg-gradient-to-br from-rose-500/10 via-rose-50/20 to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 border-b border-rose-100/30 dark:border-rose-950/20'
              }`}>
                {/* Decorative glowing gradient aura */}
                <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-40 ${selectedTransaction.type === 'entrada' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-40 ${selectedTransaction.type === 'entrada' ? 'bg-teal-400' : 'bg-pink-400'}`} />

                <div className="absolute top-4 right-4 flex items-center">
                  <button 
                    onClick={() => setSelectedTransaction(null)} 
                    className="p-1.5 bg-slate-200/40 hover:bg-slate-200/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 rounded-full transition-all text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <Plus className="rotate-45" size={18} />
                  </button>
                </div>
                
                {/* Visual Category Badge Icon */}
                <div className={`mx-auto w-16 h-16 rounded-[1.25rem] flex items-center justify-center mb-4 shadow-sm border backdrop-blur-md transition-transform duration-300 hover:scale-105 ${
                  selectedTransaction.type === 'entrada'
                    ? 'bg-emerald-100 border-emerald-200/50 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800/40 dark:text-emerald-400'
                    : 'bg-rose-100 border-rose-200/50 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800/40 dark:text-rose-400'
                }`}>
                  {selectedTransaction.type === 'entrada' ? <ArrowUpCircle size={28} /> : <ArrowDownCircle size={28} />}
                </div>

                <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full ${
                  selectedTransaction.type === 'entrada' 
                    ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                    : 'bg-rose-100/80 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                }`}>
                  {selectedTransaction.type === 'entrada' ? 'Entrada / Receita' : 'Saída / Despesa'}
                </span>
                
                <h4 className={`text-3xl font-black mt-3 tracking-tight ${selectedTransaction.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  R$ {selectedTransaction.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h4>
                
                <p className="text-slate-700 dark:text-slate-200 text-base font-bold mt-1 max-w-xs mx-auto line-clamp-2">
                  {selectedTransaction.description}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Details grid layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Categoria */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                    {(() => {
                      const info = getCategoryIconAndStyle(selectedTransaction.category);
                      return (
                        <div className={`w-8 h-8 rounded-xl ${info.bg} flex items-center justify-center text-sm font-semibold`}>
                          {info.icon}
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Categoria</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize truncate max-w-[120px]">
                        {mergedCategories.find(c => c.id === selectedTransaction.category)?.name || selectedTransaction.category}
                      </p>
                    </div>
                  </div>

                  {/* Banco */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Building2 size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Conta / Banco</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                        {selectedTransaction.bank}
                      </p>
                    </div>
                  </div>

                  {/* Método de Pagamento */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                      <Wallet size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Método</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                        {selectedTransaction.method || 'PIX'}
                      </p>
                    </div>
                  </div>

                  {/* Data */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Calendar size={15} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Vencimento</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                        {(() => {
                          try {
                            return format(parseISO(selectedTransaction.date), "dd/MM/yyyy", { locale: ptBR });
                          } catch (e) {
                            return selectedTransaction.date;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Status */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/55 flex flex-col justify-between">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Status</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase text-center inline-block w-fit ${
                      selectedTransaction.status === 'atrasado' ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/10' : 
                      selectedTransaction.status === 'pago' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/10' : 
                      selectedTransaction.status === 'futuro' ? 'bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/10' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {selectedTransaction.status === 'pago' ? 'Pago' : selectedTransaction.status === 'atrasado' ? 'Atrasado' : selectedTransaction.status === 'futuro' ? 'Futuro' : 'Pendente'}
                    </span>
                  </div>

                  {/* Prioridade */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/55 flex flex-col justify-between">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2">Classificação</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase text-center inline-block w-fit ${
                      selectedTransaction.essential ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {selectedTransaction.essential ? 'Essencial' : 'Opcional'}
                    </span>
                  </div>
                </div>

                {/* Recorrência banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <TrendingUp size={14} className="text-emerald-500" /> Frequência de transação
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {selectedTransaction.recurring ? 'Sim (Recorrente)' : 'Lançamento Único'}
                  </span>
                </div>

                {/* Styled Premium Action Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTransaction({ ...selectedTransaction });
                      setSelectedTransaction(null);
                    }}
                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-sm shadow-md shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
                    title="Editar Lançamento"
                  >
                    <Pencil size={15} />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicateTransaction(selectedTransaction)}
                    className="p-3.5 bg-indigo-150 hover:bg-indigo-200 dark:bg-indigo-900/80 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-2xl transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                    title="Duplicar Lançamento"
                  >
                    <Copy size={16} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(selectedTransaction.id)}
                    className="p-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl transition-colors active:scale-[0.98] cursor-pointer"
                    title="Excluir Lançamento"
                  >
                    <Trash2 size={16} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(null)}
                    className="px-5 py-3.5 border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-sm active:scale-[0.98] cursor-pointer"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCategoryModalOpen(false);
                setEditingCategoryId(null);
                setNewCategory({ name: '', icon: '', color: '#64748b' });
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
                <h3 className="text-lg font-black dark:text-white">
                  {editingCategoryId ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                <button 
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategoryId(null);
                    setNewCategory({ name: '', icon: '', color: '#64748b' });
                  }} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Nome da Categoria</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Educação, Assinaturas..."
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Ícone/Emoji</label>
                    <input 
                      type="text"
                      placeholder="Ex: 🎓"
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-bold text-center text-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Cor Accent (Hex)</label>
                    <input 
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-full h-[46px] bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-1 outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-4">
                  {editingCategoryId && (
                    <button 
                      type="button"
                      onClick={() => handleDeleteCategory(editingCategoryId)}
                      className="flex-1 min-w-[120px] border border-rose-200 dark:border-rose-950/50 text-rose-600 dark:text-rose-400 py-3 rounded-xl font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      {CATEGORIES.some(c => c.id === editingCategoryId) ? 'Resetar Padrão' : 'Apagar'}
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCategoryModalOpen(false);
                      setEditingCategoryId(null);
                      setNewCategory({ name: '', icon: '', color: '#64748b' });
                    }}
                    className="flex-1 min-w-[80px] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 min-w-[100px] bg-emerald-600 text-white py-3 rounded-xl font-black shadow-md shadow-emerald-500/10 hover:bg-emerald-500 active:scale-[0.98] transition-all text-xs cursor-pointer"
                  >
                    {editingCategoryId ? 'Salvar' : 'Criar Categoria'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Budget Modal */}
      <AnimatePresence>
        {isBudgetModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBudgetModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white">Definir Limite de Gasto</h3>
                <button 
                  onClick={() => setIsBudgetModalOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleAddBudget} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Categoria</label>
                  <select
                    value={newBudget.categoryId}
                    onChange={(e) => setNewBudget({ ...newBudget, categoryId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-semibold"
                  >
                    {mergedCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {(cat as any).icon || getCategoryIconAndStyle(cat.id).icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Valor Limite Mensal (R$)</label>
                  <input 
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    placeholder="Ex: 500"
                    value={newBudget.limit}
                    onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-bold"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsBudgetModalOpen(false)}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3.5 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-650 text-white py-3.5 rounded-2xl font-black shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
                  >
                    Definir Limite
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Investment Modal */}
      <AnimatePresence>
        {isInvestmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInvestmentModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white">Adicionar Investimento</h3>
                <button 
                  onClick={() => setIsInvestmentModalOpen(false)} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleAddInvestment} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Nome do Ativo</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Tesouro Selic 2029"
                    value={newInvestment.name}
                    onChange={(e) => setNewInvestment({ ...newInvestment, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Tipo</label>
                    <select
                      value={newInvestment.type}
                      onChange={(e) => setNewInvestment({ ...newInvestment, type: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-semibold"
                    >
                      <option value="Renda Fixa">Renda Fixa</option>
                      <option value="Ações">Ações</option>
                      <option value="Fundos Imobiliários">Fundos Imobiliários</option>
                      <option value="Previdência">Previdência</option>
                      <option value="Criptomoedas">Criptomoedas</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 block mb-1.5">Valor Aplicado (R$)</label>
                    <input 
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      placeholder="Ex: 500.00"
                      value={newInvestment.value}
                      onChange={(e) => setNewInvestment({ ...newInvestment, value: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800/80 rounded-xl p-3 text-sm dark:text-white outline-none focus:border-emerald-500 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsInvestmentModalOpen(false)}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3.5 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-650 text-white py-3.5 rounded-2xl font-black shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all text-xs cursor-pointer"
                  >
                    Adicionar Ativo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Transaction Modal */}
      <AnimatePresence>
        {editingTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                const prev = { ...editingTransaction };
                setEditingTransaction(null);
                setSelectedTransaction(prev);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800/80 overflow-hidden relative z-10 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold dark:text-white">Editar Transação</h3>
                <button 
                  onClick={() => {
                    const prev = { ...editingTransaction };
                    setEditingTransaction(null);
                    setSelectedTransaction(prev);
                  }} 
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateTransaction(editingTransaction);
                }} 
                className="p-6 space-y-4"
              >
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingTransaction({...editingTransaction, type: 'saida'})}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${editingTransaction.type === 'saida' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <Minus size={14} className="inline mr-1" /> Saída
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditingTransaction({...editingTransaction, type: 'entrada'})}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${editingTransaction.type === 'entrada' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <Plus size={14} className="inline mr-1" /> Entrada
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      placeholder="0,00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                      value={editingTransaction.value}
                      onChange={(e) => setEditingTransaction({...editingTransaction, value: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                      value={editingTransaction.date}
                      onChange={(e) => setEditingTransaction({...editingTransaction, date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Aluguel, Supermercado..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                    value={editingTransaction.description}
                    onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Categoria</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize dark:text-white"
                      value={editingTransaction.category}
                      onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})}
                    >
                      {mergedCategories.map(c => <option key={c.id} value={c.id}>{(c as any).icon || getCategoryIconAndStyle(c.id).icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Banco</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                      value={editingTransaction.bank}
                      onChange={(e) => setEditingTransaction({...editingTransaction, bank: e.target.value})}
                    >
                      {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status de Pagamento</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                      value={editingTransaction.status || 'pago'}
                      onChange={(e) => setEditingTransaction({...editingTransaction, status: e.target.value})}
                    >
                      <option value="pago">Pago</option>
                      <option value="pendente">Pendente</option>
                      <option value="atrasado">Atrasado</option>
                      <option value="futuro">Futuro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Método de Pagamento</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white"
                      value={editingTransaction.method || 'PIX'}
                      onChange={(e) => setEditingTransaction({...editingTransaction, method: e.target.value})}
                    >
                      {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Dinheiro', 'Transferência'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Essencial Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Bookmark size={16} className={editingTransaction.essential ? 'text-emerald-500' : 'text-slate-400'} />
                      <span className="text-xs font-semibold dark:text-slate-300">Gasto Essencial?</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setEditingTransaction({...editingTransaction, essential: !editingTransaction.essential})}
                      className={`w-10 h-5 rounded-full relative transition-all ${editingTransaction.essential ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <motion.div 
                        initial={false}
                        animate={{ x: editingTransaction.essential ? 20 : 0 }}
                        className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm" 
                      />
                    </button>
                  </div>

                  {/* Recorrente Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={16} className={editingTransaction.recurring ? 'text-emerald-500' : 'text-slate-400'} />
                      <span className="text-xs font-semibold dark:text-slate-300">Recorrente?</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setEditingTransaction({...editingTransaction, recurring: !editingTransaction.recurring})}
                      className={`w-10 h-5 rounded-full relative transition-all ${editingTransaction.recurring ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <motion.div 
                        initial={false}
                        animate={{ x: editingTransaction.recurring ? 20 : 0 }}
                        className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm" 
                      />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      const prev = { ...editingTransaction };
                      setEditingTransaction(null);
                      setSelectedTransaction(prev);
                    }}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm active:scale-[0.98] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-bold shadow-xl shadow-emerald-500/10 dark:shadow-none transition-all text-sm active:scale-[0.98]"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Budget Statement Modal */}
      <AnimatePresence>
        {selectedBudgetCategory && (() => {
          const category = mergedCategories.find(c => c.id === selectedBudgetCategory);
          const categoryName = category?.name || selectedBudgetCategory;
          const info = getCategoryIconAndStyle(selectedBudgetCategory);
          const catTransactions = transactions.filter(t => t.category === selectedBudgetCategory);
          const budgetLimit = budgets[selectedBudgetCategory] || 0;
          const spent = catTransactions
            .filter(t => t.type === 'saida')
            .reduce((acc, curr) => acc + curr.value, 0);
          const percent = budgetLimit > 0 ? Math.min((spent / budgetLimit) * 100, 100) : 0;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedBudgetCategory(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div 
                initial={{ scale: 0.93, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.93, opacity: 0, y: 15 }}
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800/80 overflow-hidden relative z-10 transition-colors duration-300 flex flex-col max-h-[85vh]"
                style={{ 
                  boxShadow: `0 25px 60px -15px ${category?.color}25`,
                }}
              >
                {/* Header */}
                <div 
                  className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  style={{ backgroundColor: `${category?.color}15` }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl select-none">{info.icon}</span>
                    <div>
                      <h3 className="text-lg font-extrabold dark:text-white capitalize">{categoryName}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Histórico e Limite de Gastos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => {
                        setNewBudget({ categoryId: selectedBudgetCategory, limit: budgetLimit > 0 ? budgetLimit.toString() : '' });
                        setIsBudgetModalOpen(true);
                      }}
                      className="p-1.5 hover:bg-white/20 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Editar Limite"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      onClick={() => setSelectedBudgetCategory(null)} 
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
                    >
                      <Plus className="rotate-45" size={24} />
                    </button>
                  </div>
                </div>

                {/* Info / Progress Cards */}
                <div className="p-6 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/60 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-xs">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Definido</p>
                      <p className="text-sm sm:text-lg font-extrabold dark:text-slate-100">
                        {budgetLimit > 0 ? `R$ ${budgetLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sem limite'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-xs">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-0.5">Consumido</p>
                      <p className={`text-sm sm:text-lg font-extrabold ${spent > budgetLimit && budgetLimit > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {budgetLimit > 0 && (
                    <div>
                      <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 font-bold mb-1.5">
                        <span>Progresso do Limite</span>
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${percent > 90 ? 'bg-rose-500' : percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Transactions List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[250px] max-h-[45vh]">
                  <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Transações registradas</h4>
                  
                  {catTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-2">🍃</p>
                      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">Nenhum lançamento nesta categoria ainda.</p>
                    </div>
                  ) : (
                    catTransactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((t) => (
                        <div 
                          key={t.id}
                          onClick={() => {
                            setSelectedTransaction(t);
                            setSelectedBudgetCategory(null);
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/50 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-lg shrink-0">
                              {getCategoryIconAndStyle(t.category).icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-850 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {t.description}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {formatDateDisplay(t.date)} • {t.bank}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-black ${
                              t.type === 'entrada' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-slate-900 dark:text-slate-100'
                            }`}>
                              {t.type === 'entrada' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <span className="text-[9px] dark:text-slate-500 text-slate-400 font-bold uppercase">
                              {t.method}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Footer status / Action */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500 font-bold">
                  <div className="flex items-center gap-2">
                    <span>Lançamentos: {catTransactions.length}</span>
                    <button
                      onClick={() => setBudgetToDelete(selectedBudgetCategory)}
                      className="text-rose-500 hover:text-rose-600 font-extrabold flex items-center gap-1 cursor-pointer ml-2 border border-rose-105 dark:border-rose-950/40 px-2 py-1 rounded transition-colors"
                    >
                      <Trash2 size={12} /> Excluir Limite
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      setNewEntry(prev => ({ ...prev, category: selectedBudgetCategory, type: 'saida' }));
                      setSelectedBudgetCategory(null);
                      setIsModalOpen(true);
                    }}
                    className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-extrabold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    + Criar Lançamento
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* iOS-style Bottom Tab Bar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800/80 flex md:hidden items-center justify-around py-3 px-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] select-none">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            activeTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-500 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[9px] font-bold">Resumo</span>
        </button>

        <button 
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            activeTab === 'transactions' ? 'text-emerald-600 dark:text-emerald-500 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <List size={20} />
          <span className="text-[9px] font-bold">Transações</span>
        </button>

        <button 
          onClick={() => setActiveTab('budgets')}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            activeTab === 'budgets' ? 'text-emerald-600 dark:text-emerald-500 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <Target size={20} />
          <span className="text-[9px] font-bold">Orçamentos</span>
        </button>

        <button 
          onClick={() => setActiveTab('investments')}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            activeTab === 'investments' ? 'text-emerald-600 dark:text-emerald-500 font-bold scale-105' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <TrendingUp size={20} />
          <span className="text-[9px] font-bold">Investir</span>
        </button>

        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${
            isMobileMenuOpen ? 'text-emerald-600 dark:text-emerald-500 font-bold' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <Menu size={20} />
          <span className="text-[9px] font-bold">Mais</span>
        </button>
      </nav>

      {/* iOS-style Bottom Sheet (More Menu) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            {/* Sheet */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-white dark:bg-slate-900 w-full rounded-t-[2rem] shadow-2xl overflow-hidden relative z-10 border-t border-slate-100 dark:border-slate-800 p-6 pb-12 space-y-6 max-h-[85vh] overflow-y-auto"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800/80 rounded-full mx-auto mb-2" />

              {/* Perfil Header */}
              <button 
                onClick={() => {
                  setIsUserModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/60 rounded-2xl active:scale-[0.98] transition-all"
              >
                {user ? (
                  <>
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-emerald-500/20"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white font-extrabold text-lg">
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 font-sans">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm block truncate dark:text-slate-100">{user.displayName || 'Usuário'}</p>
                        <ChevronRight size={16} className="text-slate-400" />
                      </div>
                      <p className="text-xs text-slate-400 block truncate">{user.email}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-2.5 overflow-hidden">
                      <img src="/Logotipo Fortuna.png" alt="Fortuna Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 font-sans">
                      <p className="font-bold text-sm block truncate dark:text-slate-100">Modo de Demonstração</p>
                      <p className="text-xs text-slate-400 block truncate">Dados salvos localmente</p>
                    </div>
                  </>
                )}
              </button>

              {/* Menu items representing pages or functions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setActiveTab('contas');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    activeTab === 'contas' 
                      ? 'text-emerald-600 dark:text-emerald-500 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Receipt size={18} className="text-indigo-500" />
                    <span className="text-sm">Contas a Pagar</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('recurrentes');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    activeTab === 'recurrentes' 
                      ? 'text-emerald-600 dark:text-emerald-500 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Repeat size={18} className="text-indigo-500" />
                    <span className="text-sm">Gastos Recorrentes</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('cofre');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    activeTab === 'cofre' 
                      ? 'text-emerald-600 dark:text-emerald-500 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Lock size={18} className="text-amber-500" />
                    <span className="text-sm">Cofre Virtual</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('goals');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    activeTab === 'goals' 
                      ? 'text-emerald-600 dark:text-emerald-500 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Trophy size={18} className="text-amber-500" />
                    <span className="text-sm">Metas Financeiras</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('calendar');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    activeTab === 'calendar' 
                      ? 'text-emerald-600 dark:text-emerald-500 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-indigo-500" />
                    <span className="text-sm">Calendário de Contas</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('categories');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    activeTab === 'categories' 
                      ? 'text-emerald-600 dark:text-emerald-500 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Tag size={18} className="text-emerald-500" />
                    <span className="text-sm font-semibold">Categorias</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('empresas');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    activeTab === 'empresas' 
                      ? 'text-emerald-600 dark:text-emerald-500 font-bold' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 size={18} className="text-emerald-500" />
                    <span className="text-sm font-semibold">Minhas Empresas (PJ)</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              </div>

              {/* Preferences Accent (Signout) */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                {user ? (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-sm rounded-2xl transition-all cursor-pointer"
                  >
                    <LogOut size={16} />
                    Desconectar Conta Google
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogin();
                    }}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-all cursor-pointer shadow-md"
                  >
                    <LogIn size={16} />
                    Entrar com o Google
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BUDGET DELETION DIALOG */}
      <AnimatePresence>
        {budgetToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBudgetToDelete(null)}
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
              
              <h3 className="text-lg font-black dark:text-white">Excluir Orçamento</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Tem certeza de que deseja excluir o limite de orçamento para a categoria <strong className="text-slate-705 dark:text-slate-200 font-extrabold capitalize">"{budgetToDelete}"</strong>?
              </p>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setBudgetToDelete(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteBudget(budgetToDelete)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                >
                  Excluir Limite
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INVESTMENT DELETION DIALOG */}
      <AnimatePresence>
        {investmentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvestmentToDelete(null)}
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
              
              <h3 className="text-lg font-black dark:text-white">Excluir Investimento</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Tem certeza de que deseja excluir o investimento <strong className="text-slate-705 dark:text-slate-200 font-extrabold">"{investmentToDelete.name}"</strong> da sua carteira?
              </p>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setInvestmentToDelete(null)}
                  className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteInvestment(investmentToDelete.id)}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-black shadow-md shadow-rose-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                >
                  Excluir Ativo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK STATUS POPUP MENU */}
      <AnimatePresence>
        {statusMenuTx && statusMenuAnchor && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => {
                setStatusMenuTx(null);
                setStatusMenuAnchor(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.12 }}
              style={{ 
                position: 'fixed',
                top: Math.min(statusMenuAnchor.y + 12, window.innerHeight - 150),
                left: Math.min(statusMenuAnchor.x - 70, window.innerWidth - 180),
              }}
              className="z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 w-40 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300"
            >
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                Alterar Status
              </div>
              <button
                type="button"
                onClick={() => handleQuickStatusChange(statusMenuTx, 'pago')}
                className={`w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  statusMenuTx.status === 'pago' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                {statusMenuTx.type === 'entrada' ? 'Recebido' : 'Pago'}
              </button>
              <button
                type="button"
                onClick={() => handleQuickStatusChange(statusMenuTx, 'pendente')}
                className={`w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  statusMenuTx.status === 'pendente' ? 'text-amber-500 dark:text-amber-405 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Pendente
              </button>
              <button
                type="button"
                onClick={() => handleQuickStatusChange(statusMenuTx, 'atrasado')}
                className={`w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  statusMenuTx.status === 'atrasado' ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                Atrasado
              </button>
              <button
                type="button"
                onClick={() => handleQuickStatusChange(statusMenuTx, 'futuro')}
                className={`w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  statusMenuTx.status === 'futuro' ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-sky-500" />
                Futuro
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QUICK TYPE POPUP MENU */}
      <AnimatePresence>
        {typeMenuTx && typeMenuAnchor && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => {
                setTypeMenuTx(null);
                setTypeMenuAnchor(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.12 }}
              style={{ 
                position: 'fixed',
                top: Math.min(typeMenuAnchor.y + 12, window.innerHeight - 150),
                left: Math.min(typeMenuAnchor.x - 70, window.innerWidth - 180),
              }}
              className="z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 w-40 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300"
            >
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                Alterar Tipo
              </div>
              <button
                type="button"
                onClick={() => {
                  handleQuickFieldUpdate(typeMenuTx, 'type', 'entrada');
                  setTypeMenuTx(null);
                  setTypeMenuAnchor(null);
                }}
                className={`w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  typeMenuTx.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Entrada
              </button>
              <button
                type="button"
                onClick={() => {
                  handleQuickFieldUpdate(typeMenuTx, 'type', 'saida');
                  setTypeMenuTx(null);
                  setTypeMenuAnchor(null);
                }}
                className={`w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                  typeMenuTx.type === 'saida' ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                Saída
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QUICK CATEGORY POPUP MENU */}
      <AnimatePresence>
        {categoryMenuTx && categoryMenuAnchor && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => {
                setCategoryMenuTx(null);
                setCategoryMenuAnchor(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.12 }}
              style={{ 
                position: 'fixed',
                top: Math.min(categoryMenuAnchor.y + 12, window.innerHeight - 340),
                left: Math.min(categoryMenuAnchor.x - 70, window.innerWidth - 200),
              }}
              className="z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 w-48 overflow-y-auto max-h-64 text-slate-900 dark:text-slate-100 transition-colors duration-300"
            >
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                Alterar Categoria
              </div>
              {mergedCategories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    handleQuickFieldUpdate(categoryMenuTx, 'category', cat.id);
                    setCategoryMenuTx(null);
                    setCategoryMenuAnchor(null);
                  }}
                  className={`w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer capitalize ${
                    categoryMenuTx.category === cat.id ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cat.icon || getCategoryIconAndStyle(cat.id).icon ? (
                    <span className="text-sm shrink-0">{cat.icon || getCategoryIconAndStyle(cat.id).icon}</span>
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  )}
                  {cat.name}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QUICK BANK POPUP MENU */}
      <AnimatePresence>
        {bankMenuTx && bankMenuAnchor && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => {
                setBankMenuTx(null);
                setBankMenuAnchor(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.12 }}
              style={{ 
                position: 'fixed',
                top: Math.min(bankMenuAnchor.y + 12, window.innerHeight - 280),
                left: Math.min(bankMenuAnchor.x - 70, window.innerWidth - 180),
              }}
              className="z-50 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl py-1.5 w-40 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300"
            >
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                Alterar Banco
              </div>
              {BANKS.map(bk => (
                <button
                  key={bk}
                  type="button"
                  onClick={() => {
                    handleQuickFieldUpdate(bankMenuTx, 'bank', bk);
                    setBankMenuTx(null);
                    setBankMenuAnchor(null);
                  }}
                  className={`w-full px-3.5 py-2 text-xs font-semibold text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                    bankMenuTx.bank === bk ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {bk}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.2rem] shadow-2xl overflow-hidden relative z-10 border border-slate-100 dark:border-slate-800 transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-black dark:text-white">Perfil do Usuário</h3>
                <button 
                  onClick={() => setIsUserModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-full border-4 border-emerald-500/20 shadow-lg mb-4"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-500/20 mb-4">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h4 className="text-xl font-black dark:text-slate-100">{user?.displayName || 'Usuário Fortuna'}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{user?.email || 'Nenhum e-mail vinculado'}</p>
                </div>

                <div className="w-full space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800/60">
                  <button 
                    onClick={toggleTheme}
                    className="w-full h-14 flex items-center justify-center gap-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-950/30 hover:bg-slate-100 dark:hover:bg-emerald-900/10 transition-all border border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 font-bold text-sm group"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon size={20} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                        <span>Ativar Tema Escuro</span>
                      </>
                    ) : (
                      <>
                        <Sun size={20} className="text-amber-500 group-hover:scale-110 transition-transform" />
                        <span>Ativar Tema Claro</span>
                      </>
                    )}
                  </button>

                   <button 
                    onClick={() => {
                      handleExportData();
                    }}
                    className="w-full h-14 flex items-center justify-center gap-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-950/30 hover:bg-slate-100 dark:hover:bg-emerald-900/10 transition-all border border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 font-bold text-sm group"
                  >
                    <Download size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                    Exportar Base de Dados
                  </button>

                  {user && (
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsUserModalOpen(false);
                      }}
                      className="w-full h-14 flex items-center justify-center gap-3 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-black rounded-2xl transition-all cursor-pointer text-sm"
                    >
                      <LogOut size={20} />
                      Sair da Conta
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dashboard Summary Box Popup Modal */}
      <AnimatePresence>
        {dashboardPopupType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDashboardPopupType(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.93, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.93, opacity: 0, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800/80 overflow-hidden relative z-10 transition-colors duration-300 flex flex-col max-h-[85vh]"
            >
              {/* Header section with dynamic colors */}
              <div className={`p-6 text-center relative overflow-hidden shrink-0 border-b ${
                dashboardPopupType === 'entradas'
                  ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-50/20 to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 border-emerald-100/30 dark:border-emerald-950/20'
                  : dashboardPopupType === 'saidas'
                  ? 'bg-gradient-to-br from-rose-500/10 via-rose-50/20 to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 border-rose-100/30 dark:border-rose-950/20'
                  : dashboardPopupType === 'atrasadas'
                  ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/20 to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border-amber-100/30 dark:border-amber-950/20'
                  : 'bg-gradient-to-br from-blue-500/10 via-blue-50/20 to-white dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 border-blue-100/30 dark:border-blue-950/20'
              }`}>
                {/* Decorative glowing gradient aura */}
                <div className={`absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-40 ${
                  dashboardPopupType === 'entradas' ? 'bg-emerald-400' :
                  dashboardPopupType === 'saidas' ? 'bg-rose-400' :
                  dashboardPopupType === 'atrasadas' ? 'bg-amber-400' : 'bg-blue-400'
                }`} />
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-40 ${
                  dashboardPopupType === 'entradas' ? 'bg-teal-400' :
                  dashboardPopupType === 'saidas' ? 'bg-pink-400' :
                  dashboardPopupType === 'atrasadas' ? 'bg-orange-400' : 'bg-cyan-400'
                }`} />

                <div className="absolute top-4 right-4 flex items-center">
                  <button 
                    onClick={() => setDashboardPopupType(null)} 
                    className="p-1.5 bg-slate-200/40 hover:bg-slate-200/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 rounded-full transition-all text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                {/* Badge Icon */}
                <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-xs border backdrop-blur-md transition-transform duration-300 hover:scale-105 ${
                  dashboardPopupType === 'entradas'
                    ? 'bg-emerald-100 border-emerald-200/50 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800/40 dark:text-emerald-400'
                    : dashboardPopupType === 'saidas'
                    ? 'bg-rose-100 border-rose-200/50 text-rose-600 dark:bg-rose-900/30 dark:border-rose-800/40 dark:text-rose-400'
                    : dashboardPopupType === 'atrasadas'
                    ? 'bg-amber-100 border-amber-200/50 text-amber-600 dark:bg-amber-900/30 dark:border-amber-800/40 dark:text-amber-400'
                    : 'bg-blue-100 border-blue-200/50 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800/40 dark:text-blue-400'
                }`}>
                  {dashboardPopupType === 'entradas' && <ArrowUpCircle size={26} />}
                  {dashboardPopupType === 'saidas' && <ArrowDownCircle size={26} />}
                  {dashboardPopupType === 'atrasadas' && <AlertCircle size={26} />}
                  {dashboardPopupType === 'receber' && <CheckCircle2 size={26} />}
                </div>

                <h3 className="text-xl font-black dark:text-white capitalize">
                  {dashboardPopupType === 'entradas' && 'Entradas'}
                  {dashboardPopupType === 'saidas' && 'Saídas'}
                  {dashboardPopupType === 'atrasadas' && 'Contas Atrasadas'}
                  {dashboardPopupType === 'receber' && 'Pra Receber'}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  {dashboardPopupType === 'entradas' && 'Total de receitas registradas'}
                  {dashboardPopupType === 'saidas' && 'Total de despesas registradas'}
                  {dashboardPopupType === 'atrasadas' && 'Despesas com pagamento atrasado'}
                  {dashboardPopupType === 'receber' && 'Receitas pendentes de recebimento'}
                </p>

                {/* Big aggregated value */}
                <p className={`text-2xl font-black ${
                  dashboardPopupType === 'entradas' ? 'text-emerald-600 dark:text-emerald-400' :
                  dashboardPopupType === 'saidas' ? 'text-rose-600 dark:text-rose-400' :
                  dashboardPopupType === 'atrasadas' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                } mt-2`}>
                  R$ {(dashboardPopupType === 'entradas' ? stats.totalIn :
                       dashboardPopupType === 'saidas' ? stats.totalOut :
                       dashboardPopupType === 'atrasadas' ? stats.overdue : stats.toReceive).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Transactions List Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[300px]">
                {dashboardPopupTransactions.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center justify-center h-full">
                    <p className="text-4xl mb-3">🍃</p>
                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Nenhum lançamento encontrado nesta categoria</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mt-1">Tudo limpo por aqui! Quando novos lançamentos forem criados, eles aparecerão nesta lista.</p>
                  </div>
                ) : (
                  dashboardPopupTransactions.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => {
                        setSelectedTransaction(t);
                        setDashboardPopupType(null); // Switch directly to details
                      }}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/50 transition-all duration-200 cursor-pointer group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="text-xl shrink-0 w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-3xs">
                          {getCategoryIconAndStyle(t.category).icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {t.description}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                            {formatDateDisplay(t.date)} • {t.bank}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-black ${
                          t.type === 'entrada' 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {t.type === 'entrada' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[9px] dark:text-slate-500 text-slate-400 font-bold uppercase mt-0.5 block">
                          {t.method}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0 text-xs text-slate-400 dark:text-slate-500 font-bold">
                <span>Registros: {dashboardPopupTransactions.length}</span>
                <button
                  onClick={() => {
                    const defaultType = (dashboardPopupType === 'entradas' || dashboardPopupType === 'receber') ? 'entrada' : 'saida';
                    const defaultStatus = dashboardPopupType === 'atrasadas' ? 'atrasado' : dashboardPopupType === 'receber' ? 'pendente' : 'pago';
                    setNewEntry(prev => ({ 
                      ...prev, 
                      type: defaultType,
                      status: defaultStatus
                    }));
                    setDashboardPopupType(null);
                    setIsModalOpen(true);
                  }}
                  className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  + Novo Lançamento
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast de Notificação com Reverter */}
      <AnimatePresence>
        {activeUndoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-[9999] w-full max-w-sm sm:max-w-md p-4 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-rose-400 flex items-center justify-center shrink-0 border border-slate-700 font-bold">
                  🗑️
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-medium">Excluído com sucesso</p>
                  <p className="text-sm font-bold truncate text-slate-200">
                    {activeUndoToast.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleUndoDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 text-xs font-black rounded-lg transition-all duration-150 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Desfazer</span>
                </button>
                <button
                  onClick={() => setActiveUndoToast(null)}
                  className="p-1 px-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="relative mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-emerald-500 rounded-full transition-all duration-100" 
                style={{ width: `${toastProgress}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


