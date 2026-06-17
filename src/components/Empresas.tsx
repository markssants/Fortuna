import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Plus, Trash2, Pencil, Calendar, Filter, Search, 
  ArrowUpCircle, ArrowDownCircle, FileText, X, ChevronDown, 
  Download, Info, Sparkles, TrendingUp, TrendingDown, DollarSign,
  Briefcase, Percent, CheckCircle2, AlertCircle, RefreshCw, Layers,
  Wallet, ShieldCheck, Mail, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  segment: string;
  color: string;
  icon?: string;
  initialCapital?: number;
  createdAt: string;
}

export interface CompanyTransaction {
  id: string;
  type: 'entrada' | 'saida';
  value: number;
  date: string;
  category: string;
  bank: string;
  description: string;
  cnpjDestination?: string;
  status: 'pago' | 'pendente';
  createdAt: string;
}

interface EmpresasProps {
  user: any;
  theme: 'light' | 'dark';
}

const BUSINESS_SEGMENTS = [
  { id: 'servicos', name: 'Prestação de Serviços', icon: '💼' },
  { id: 'comercio', name: 'Comércio / Varejo', icon: '🛒' },
  { id: 'tecnologia', name: 'Tecnologia / Software', icon: '💻' },
  { id: 'ecommerce', name: 'E-commerce', icon: '🌐' },
  { id: 'consultoria', name: 'Consultoria', icon: '📊' },
  { id: 'alimentos', name: 'Alimentos e Bebidas', icon: '🍕' },
  { id: 'saude', name: 'Saúde e Clínica', icon: '🏥' },
  { id: 'educacao', name: 'Educação / Cursos', icon: '🎓' },
  { id: 'outro', name: 'Outro Ramo', icon: '🏢' },
];

const B2B_CATEGORIES: Record<string, { name: string; color: string; type: 'entrada' | 'saida' }> = {
  // Receitas (Entradas)
  'faturamento': { name: 'Faturamento de Vendas', color: '#10b981', type: 'entrada' },
  'servicos_prestados': { name: 'Prestação de Serviços', color: '#34d399', type: 'entrada' },
  'investimento_sócio': { name: 'Aporte de Capital', color: '#059669', type: 'entrada' },
  'rendimentos_pj': { name: 'Rendimento de Aplicação', color: '#22c55e', type: 'entrada' },
  'outras_receitas': { name: 'Outras Receitas PJ', color: '#6ee7b7', type: 'entrada' },
  
  // Despesas (Saídas)
  'pro_labore': { name: 'Pró-labore / Salários', color: '#ef4444', type: 'saida' },
  'impostos_das': { name: 'Impostos PJ & DAS', color: '#f97316', type: 'saida' },
  'fornecedores': { name: 'Fornecedores e Produtos', color: '#f59e0b', type: 'saida' },
  'infraestrutura': { name: 'Software / Internet / Imóvel', color: '#3b82f6', type: 'saida' },
  'marketing': { name: 'Marketing e Anúncios', color: '#8b5cf6', type: 'saida' },
  'tarifas_bancarias': { name: 'Tarifas Bancárias PJ', color: '#ec4899', type: 'saida' },
  'outras_despesas': { name: 'Outras Despesas PJ', color: '#a855f7', type: 'saida' },
};

const COMPANY_COLORS = [
  '#0ea5e9', // Sky Blue
  '#10b981', // Emerald Green
  '#6366f1', // Indigo Purple
  '#f59e0b', // Amber Orange
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#f43f5e', // Rose Red
];

export default function Empresas({ user, theme }: EmpresasProps) {
  // Sync states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => {
    return localStorage.getItem('last_selected_company_id');
  });

  const [transactions, setTransactions] = useState<CompanyTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Modals / Form states
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  
  // Editing states
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingTx, setEditingTx] = useState<CompanyTransaction | null>(null);

  // Company Form inputs
  const [compName, setCompName] = useState('');
  const [compCnpj, setCompCnpj] = useState('');
  const [compSegment, setCompSegment] = useState('servicos');
  const [compColor, setCompColor] = useState(COMPANY_COLORS[0]);
  const [compIcon, setCompIcon] = useState('🏢');
  const [compCapital, setCompCapital] = useState('0');

  // Transaction Form inputs
  const [txType, setTxType] = useState<'entrada' | 'saida'>('saida');
  const [txValue, setTxValue] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState('pro_labore');
  const [txBank, setTxBank] = useState('Nubank PJ');
  const [txDescription, setTxDescription] = useState('');
  const [txCnpjDest, setTxCnpjDest] = useState('');
  const [txStatus, setTxStatus] = useState<'pago' | 'pendente'>('pago');

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [filterCategory, setFilterCategory] = useState('todos');

  // Load Companies
  useEffect(() => {
    if (!user) return;

    setLoadingCompanies(true);
    const path = `users/${user.uid}/companies`;
    const unsub = onSnapshot(collection(db, path), (snapshot) => {
      const list: Company[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Company);
      });
      // Sort chronologically
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setCompanies(list);
      setLoadingCompanies(false);

      // Autoset company if none selected yet or previously selected no longer exists
      if (list.length > 0) {
        if (!selectedCompanyId || !list.some(c => c.id === selectedCompanyId)) {
          setSelectedCompanyId(list[0].id);
          localStorage.setItem('last_selected_company_id', list[0].id);
        }
      } else {
        setSelectedCompanyId(null);
        localStorage.removeItem('last_selected_company_id');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoadingCompanies(false);
    });

    return () => unsub();
  }, [user]);

  // Load Transactions when Company switches
  useEffect(() => {
    if (!user || !selectedCompanyId) {
      setTransactions([]);
      return;
    }

    setLoadingTransactions(true);
    const path = `users/${user.uid}/companies/${selectedCompanyId}/transactions`;
    const unsub = onSnapshot(collection(db, path), (snapshot) => {
      const list: CompanyTransaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as CompanyTransaction);
      });
      // Sort newest first
      list.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      setTransactions(list);
      setLoadingTransactions(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoadingTransactions(false);
    });

    return () => unsub();
  }, [user, selectedCompanyId]);

  const activeCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // Handle switching companies safely
  const selectCompany = (id: string) => {
    setSelectedCompanyId(id);
    localStorage.setItem('last_selected_company_id', id);
  };

  // Company management routines
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !compName.trim()) return;

    const companyId = editingCompany ? editingCompany.id : crypto.randomUUID();
    const newCompany: Company = {
      id: companyId,
      name: compName.trim(),
      cnpj: compCnpj.trim() || "",
      segment: compSegment,
      color: compColor,
      icon: compIcon,
      initialCapital: Number(compCapital) || 0,
      createdAt: editingCompany ? editingCompany.createdAt : new Date().toISOString(),
    };

    try {
      const path = `users/${user.uid}/companies`;
      await setDoc(doc(db, path, companyId), newCompany);
      
      // If it was the first company, set active automatically
      if (!selectedCompanyId) {
        selectCompany(companyId);
      }

      // Close modal & reset
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
      resetCompanyForm();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/companies`);
    }
  };

  const handleEditCompanyClick = (company: Company) => {
    setEditingCompany(company);
    setCompName(company.name);
    setCompCnpj(company.cnpj || '');
    setCompSegment(company.segment);
    setCompColor(company.color);
    setCompIcon(company.icon || '🏢');
    setCompCapital(String(company.initialCapital || 0));
    setIsCompanyModalOpen(true);
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!user) return;
    const confirmDelete = window.confirm('Deseja mesmo apagar o registro desta empresa? Todos os lançamentos PJ vinculados serão perdidos permanentemente!');
    if (!confirmDelete) return;

    try {
      // 1. Delete company doc
      await deleteDoc(doc(db, `users/${user.uid}/companies`, companyId));
      
      // If deleted was active
      if (selectedCompanyId === companyId) {
        const remaining = companies.filter(c => c.id !== companyId);
        if (remaining.length > 0) {
          selectCompany(remaining[0].id);
        } else {
          setSelectedCompanyId(null);
          localStorage.removeItem('last_selected_company_id');
        }
      }
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/companies/${companyId}`);
    }
  };

  const resetCompanyForm = () => {
    setCompName('');
    setCompCnpj('');
    setCompSegment('servicos');
    setCompColor(COMPANY_COLORS[0]);
    setCompIcon('🏢');
    setCompCapital('0');
  };

  // Transaction management routines
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCompanyId || !txDescription.trim() || !txValue) return;

    const transactionId = editingTx ? editingTx.id : crypto.randomUUID();
    const newTx: CompanyTransaction = {
      id: transactionId,
      type: txType,
      value: Number(txValue),
      date: txDate,
      category: txCategory,
      bank: txBank,
      description: txDescription.trim(),
      cnpjDestination: txCnpjDest.trim() || "",
      status: txStatus,
      createdAt: editingTx ? editingTx.createdAt : new Date().toISOString(),
    };

    try {
      const path = `users/${user.uid}/companies/${selectedCompanyId}/transactions`;
      await setDoc(doc(db, path, transactionId), newTx);
      setIsTxModalOpen(false);
      setEditingTx(null);
      resetTxForm();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/companies/${selectedCompanyId}/transactions`);
    }
  };

  const handleEditTxClick = (tx: CompanyTransaction) => {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxValue(String(tx.value));
    setTxDate(tx.date);
    setTxCategory(tx.category);
    setTxBank(tx.bank);
    setTxDescription(tx.description);
    setTxCnpjDest(tx.cnpjDestination || '');
    setTxStatus(tx.status);
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = async (txId: string) => {
    if (!user || !selectedCompanyId) return;
    const confirmDelete = window.confirm('Apagar esta transação comercial?');
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/companies/${selectedCompanyId}/transactions`, txId));
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/companies/${selectedCompanyId}/transactions/${txId}`);
    }
  };

  const toggleTxStatus = async (tx: CompanyTransaction) => {
    if (!user || !selectedCompanyId) return;
    const nextStatus = tx.status === 'pago' ? 'pendente' : 'pago';
    try {
      const path = `users/${user.uid}/companies/${selectedCompanyId}/transactions`;
      await setDoc(doc(db, path, tx.id), { ...tx, status: nextStatus });
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/companies/${selectedCompanyId}/transactions/${tx.id}`);
    }
  };

  const resetTxForm = () => {
    setTxType('saida');
    setTxValue('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxCategory('pro_labore');
    setTxBank('Nubank PJ');
    setTxDescription('');
    setTxCnpjDest('');
    setTxStatus('pago');
  };

  // Switch category list based on Type (Entrada vs Saída)
  useEffect(() => {
    if (txType === 'entrada') {
      setTxCategory('faturamento');
    } else {
      setTxCategory('pro_labore');
    }
  }, [txType]);

  // Statistics computations
  const stats = useMemo(() => {
    let rawCapital = activeCompany?.initialCapital || 0;
    let totalIn = 0;
    let totalOut = 0;
    let pendingIn = 0;
    let pendingOut = 0;

    transactions.forEach(tx => {
      const val = tx.value;
      if (tx.type === 'entrada') {
        if (tx.status === 'pago') {
          totalIn += val;
        } else {
          pendingIn += val;
        }
      } else {
        if (tx.status === 'pago') {
          totalOut += val;
        } else {
          pendingOut += val;
        }
      }
    });

    const netProfit = totalIn - totalOut;
    const profitMargin = totalIn > 0 ? (netProfit / totalIn) * 100 : 0;
    const finalBalance = rawCapital + netProfit;

    return {
      rawCapital,
      totalIn,
      totalOut,
      pendingIn,
      pendingOut,
      netProfit,
      profitMargin,
      finalBalance
    };
  }, [transactions, activeCompany]);

  // Filtered & Searched Transactions list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const query = searchTerm.toLowerCase();
      const matchSearch = t.description.toLowerCase().includes(query) || 
                          t.bank.toLowerCase().includes(query) || 
                          (t.cnpjDestination && t.cnpjDestination.includes(query)) ||
                          (B2B_CATEGORIES[t.category]?.name || '').toLowerCase().includes(query);
                          
      const matchType = filterType === 'todos' || t.type === filterType;
      const matchStatus = filterStatus === 'todos' || t.status === filterStatus;
      const matchCategory = filterCategory === 'todos' || t.category === filterCategory;

      return matchSearch && matchType && matchStatus && matchCategory;
    });
  }, [transactions, searchTerm, filterType, filterStatus, filterCategory]);

  // Chart data computed (Cash Flow and Category breakdown)
  const cashFlowChartData = useMemo(() => {
    // Group monthly or daily. Let's do month/year for better timeline or sorted grouped by date
    // Sort transactions oldest first to render sequentially
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const grouped: Record<string, { date: string; Entradas: number; Saídas: number }> = {};

    sorted.forEach(tx => {
      // Show as "DD/MM" format for clean XAxis representativity
      const [y, m, d] = tx.date.split('-');
      const formattedDate = `${d}/${m}`;
      
      if (!grouped[tx.date]) {
        grouped[tx.date] = { date: formattedDate, Entradas: 0, Saídas: 0 };
      }

      if (tx.status === 'pago') {
        if (tx.type === 'entrada') {
          grouped[tx.date].Entradas += tx.value;
        } else {
          grouped[tx.date].Saídas += tx.value;
        }
      }
    });

    return Object.values(grouped).slice(-10); // Display last 10 points
  }, [transactions]);

  const categoriesPieData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'saida' && tx.status === 'pago') {
        dataMap[tx.category] = (dataMap[tx.category] || 0) + tx.value;
      }
    });

    return Object.entries(dataMap).map(([key, value]) => {
      const catInfo = B2B_CATEGORIES[key] || { name: key, color: '#94a3b8' };
      return {
        name: catInfo.name,
        value,
        color: catInfo.color
      };
    });
  }, [transactions]);

  // Export filtered transactions to CSV
  const handleExportCSV = () => {
    if (!activeCompany || filteredTransactions.length === 0) return;

    try {
      const headers = ['Data', 'Tipo', 'Descrição', 'Valor', 'Categoria', 'Conta/Banco', 'Status', 'Destinatário CNPJ'];
      const rows = filteredTransactions.map(t => [
        t.date,
        t.type === 'entrada' ? 'Receita' : 'Despesa',
        t.description.replace(/,/g, ' '),
        t.value.toFixed(2),
        B2B_CATEGORIES[t.category]?.name || t.category,
        t.bank,
        t.status === 'pago' ? 'Controlado/Pago' : 'Pendente',
        t.cnpjDestination || ''
      ]);

      const csvContent = [
        `Relatório Financeiro PJ - ${activeCompany.name}`,
        headers.join(','),
        ...rows.map(e => e.join(','))
      ].join('\n');

      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_pj_${activeCompany.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Falha ao exportar relatório PJ', e);
      alert('Erro ao exportar arquivo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-500 rounded-xl">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-850 dark:text-white leading-none">
                Gestão Financeira PJ
              </h1>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mt-0.5 block">
                Separando seu dinheiro pessoal das suas empresas
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <button
            onClick={() => {
              setEditingCompany(null);
              resetCompanyForm();
              setIsCompanyModalOpen(true);
            }}
            className="flex items-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-200 dark:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus size={15} />
            Cadastrar Empresa
          </button>
        </div>
      </div>

      {loadingCompanies ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="animate-spin text-emerald-600 dark:text-emerald-500" size={32} />
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Carregando listas comerciais...</p>
        </div>
      ) : companies.length === 0 ? (
        /* Empty state - Prompt register company */
        <div className="p-8 lg:p-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-150/40 dark:border-slate-800/80 text-center max-w-2xl mx-auto space-y-6">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner text-3xl">
            🏬
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-tight text-slate-800 dark:text-white">
              Nenhuma empresa cadastrada ainda
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Evite a mistura de contas! Separe totalmente as suas movimentações de pessoa física das de microempreendedor, freelancer ou negócio próprio. Crie seu primeiro painel PJ agora mesmo de forma simples.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingCompany(null);
              resetCompanyForm();
              setIsCompanyModalOpen(true);
            }}
            className="inline-flex items-center gap-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-300 dark:shadow-none transition-all cursor-pointer"
          >
            <Plus size={15} />
            Configurar minha primeira Empresa
          </button>
        </div>
      ) : (
        /* Full Workspace */
        <div className="space-y-6">
          
          {/* Company Selector Ribbon */}
          <div className="p-4 bg-slate-100/60 dark:bg-slate-950/40 rounded-[2rem] border border-slate-200/40 dark:border-slate-800/30 flex items-center gap-3 overflow-x-auto scrollbar-none select-none">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 shrink-0 px-2">
              Selecione o Negócio:
            </span>
            {companies.map(comp => {
              const isSelected = comp.id === selectedCompanyId;
              return (
                <button
                  key={comp.id}
                  onClick={() => selectCompany(comp.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs transition-all shrink-0 cursor-pointer border ${
                    isSelected 
                      ? 'shadow-xs font-black' 
                      : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-white/40 dark:hover:bg-slate-900/50'
                  }`}
                  style={isSelected ? {
                    backgroundColor: `${comp.color}15`,
                    borderColor: `${comp.color}45`,
                    color: comp.color
                  } : {}}
                >
                  <span className="text-base">{comp.icon || '🏢'}</span>
                  <span>{comp.name}</span>
                  <span 
                    className="w-2 h-2 rounded-full border border-white/20" 
                    style={{ backgroundColor: comp.color }} 
                  />
                </button>
              );
            })}
          </div>

          {activeCompany && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Side Info and Quick Settings of Active Company */}
              <div className="lg:col-span-1 space-y-6">
                <div 
                  className="p-6 rounded-[2rem] border relative overflow-hidden flex flex-col justify-between shadow-xs transition-colors duration-300"
                  style={{ 
                    backgroundColor: `${activeCompany.color}08`, 
                    borderColor: `${activeCompany.color}35` 
                  }}
                >
                  {/* Decorative blur indicator */}
                  <div 
                    className="absolute -right-8 -top-8 w-16 h-16 rounded-full blur-xl opacity-30" 
                    style={{ backgroundColor: activeCompany.color }}
                  />

                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs"
                        style={{ backgroundColor: `${activeCompany.color}15` }}
                      >
                        {activeCompany.icon || '🏢'}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditCompanyClick(activeCompany)}
                          className="p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150/40 dark:border-slate-800 text-slate-450 hover:text-emerald-500 hover:border-emerald-500/20 transition-all cursor-pointer"
                          title="Recalibrar Empresa"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(activeCompany.id)}
                          className="p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-150/40 dark:border-slate-800 text-slate-450 hover:text-rose-500 hover:border-rose-500/20 transition-all cursor-pointer"
                          title="Excluir Empresa"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white">
                        {activeCompany.name}
                      </h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {BUSINESS_SEGMENTS.find(s => s.id === activeCompany.segment)?.name || activeCompany.segment}
                      </p>
                      {activeCompany.cnpj && (
                        <span className="inline-block mt-2 text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                          CNPJ: {activeCompany.cnpj}
                        </span>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-200/40 dark:border-slate-800/50 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Capital Inicial:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-350">
                          R$ {activeCompany.initialCapital?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Criado em:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {new Date(activeCompany.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories of Business Reference */}
                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Segmentação de Fluxo PJ
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-none pr-1">
                    {Object.entries(B2B_CATEGORIES).map(([id, cat]) => (
                      <div key={id} className="flex items-center justify-between text-xs p-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-md shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{cat.name}</span>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          cat.type === 'entrada' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' 
                            : 'bg-rose-50 dark:bg-rose-955/35 text-rose-600'
                        }`}>
                          {cat.type === 'entrada' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main PJ Metrics & Graphs */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* 4 Financial Dashboard Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  
                  {/* Card 1: Faturamento */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs flex flex-col justify-between relative group">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Faturamento Bruto
                      </span>
                      <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                    <div className="mt-4">
                      <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                        R$ {stats.totalIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {stats.pendingIn > 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                          + R$ {stats.pendingIn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Custos PJ */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs flex flex-col justify-between relative group">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Despesas Operacionais
                      </span>
                      <TrendingDown size={16} className="text-rose-500" />
                    </div>
                    <div className="mt-4">
                      <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                        R$ {stats.totalOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {stats.pendingOut > 0 && (
                        <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                          + R$ {stats.pendingOut.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Lucro Líquido */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs flex flex-col justify-between relative group">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Lucro Líquido
                      </span>
                      <DollarSign size={16} className={stats.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                    </div>
                    <div className="mt-4">
                      <p className={`text-lg font-black leading-tight ${stats.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {stats.netProfit < 0 ? '-' : ''} R$ {Math.abs(stats.netProfit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                        Saldo Corrente PJ: R$ {stats.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Profit Margin */}
                  <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs flex flex-col justify-between relative group">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Margem de Lucro
                      </span>
                      <Percent size={16} className="text-sky-500" />
                    </div>
                    <div className="mt-4">
                      <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                        {stats.profitMargin.toFixed(1)}%
                      </p>
                      <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                        Eficiência financeira comercial
                      </span>
                    </div>
                  </div>

                </div>

                {/* Cash Flow Timeline & Expenses Breakdown charts */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  
                  {/* Cash Flow Chart */}
                  <div className="md:col-span-3 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Fluxo de Caixa PJ Recente (Lançamentos Consolidados)
                      </h4>
                    </div>
                    {cashFlowChartData.length === 0 ? (
                      <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                        Nenhum fluxo comercial registrado no período.
                      </div>
                    ) : (
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={cashFlowChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                            <XAxis 
                              dataKey="date" 
                              stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} 
                              fontSize={10} 
                              fontWeight="bold"
                            />
                            <YAxis 
                              stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} 
                              fontSize={9} 
                              fontWeight="bold"
                              tickFormatter={(val) => `R$${val}`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                                border: '1px solid ' + (theme === 'dark' ? '#334155' : '#e2e8f0'),
                                borderRadius: '1rem',
                                color: theme === 'dark' ? '#ffffff' : '#000000',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}
                            />
                            <Line type="monotone" dataKey="Entradas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="Saídas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Expenses Breakdown Pie Chart */}
                  <div className="md:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      Custo Comercial por Categoria
                    </h4>
                    {categoriesPieData.length === 0 ? (
                      <div className="h-[200px] flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                        Nenhuma despesa consolidada de negócio.
                      </div>
                    ) : (
                      <div className="h-[200px] w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoriesPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {categoriesPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => `R$ ${(value as number).toLocaleString('pt-BR')}`}
                              contentStyle={{ 
                                backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                                border: '1px solid ' + (theme === 'dark' ? '#334155' : '#e2e8f0'),
                                borderRadius: '1rem',
                                color: theme === 'dark' ? '#ffffff' : '#000000',
                                fontSize: '11px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Summary legend indicator stacked */}
                        <div className="absolute flex flex-col items-center">
                          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Total</span>
                          <span className="text-xs font-black text-slate-800 dark:text-white">
                            R$ {stats.totalOut.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Sub-Section: Financial PJ Ledger / Transactions list */}
                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-xs space-y-6">
                  
                  {/* Ledger Header Controls */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/70 pb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white leading-none">
                        Livro-Caixa e Lançamentos Comerciais
                      </h3>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase mt-1 block">
                        Transações exclusivas da empresa: {activeCompany.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      <button
                        onClick={() => {
                          setEditingTx(null);
                          resetTxForm();
                          setIsTxModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        Lançamento PJ
                      </button>

                      {filteredTransactions.length > 0 && (
                        <button
                          onClick={handleExportCSV}
                          className="flex items-center gap-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          title="Exportar Planilha Excel/CSV"
                        >
                          <Download size={14} />
                          <span className="hidden sm:inline">Exportar CSV</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ledger Filters row */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    
                    {/* Search Field */}
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar descrição, banco, CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs outline-hidden focus:border-emerald-500 dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100 font-medium transition-all"
                      />
                    </div>

                    {/* Filter Segment/Type pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                      
                      {/* Flow filter */}
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs outline-hidden font-semibold text-slate-600 dark:text-slate-300 focus:border-emerald-500"
                      >
                        <option value="todos">Todos Fluxos</option>
                        <option value="entrada">Receitas (Entradas)</option>
                        <option value="saida">Despesas (Saídas)</option>
                      </select>

                      {/* Status select */}
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs outline-hidden font-semibold text-slate-600 dark:text-slate-300 focus:border-emerald-500"
                      >
                        <option value="todos">Todos os Status</option>
                        <option value="pago">Controlado / Pago</option>
                        <option value="pendente">Pendente / A faturar</option>
                      </select>

                      {/* Category select */}
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs outline-hidden font-semibold text-slate-600 dark:text-slate-300 focus:border-emerald-500"
                      >
                        <option value="todos">Todas Categorias PJ</option>
                        {Object.entries(B2B_CATEGORIES).map(([id, item]) => (
                          <option key={id} value={id}>{item.name}</option>
                        ))}
                      </select>

                      {/* Reset filter active option */}
                      {(searchTerm || filterType !== 'todos' || filterStatus !== 'todos' || filterCategory !== 'todos') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterType('todos');
                            setFilterStatus('todos');
                            setFilterCategory('todos');
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all font-bold text-xs"
                          title="Limpar Filtros"
                        >
                          Limpar
                        </button>
                      )}

                    </div>
                  </div>

                  {/* Transactions display list */}
                  {loadingTransactions ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="animate-spin text-emerald-600" size={24} />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sincronizando banco PJ...</span>
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] p-6">
                      <span className="text-3xl block">📋</span>
                      <p className="text-sm text-slate-500 dark:text-slate-450 mt-2 font-bold">
                        Nenhuma transação comercial encontrada para os filtros aplicados
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Cadastre novas transações clicando no botão "+ Lançamento PJ" acima.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-none">
                      {filteredTransactions.map(tx => {
                        const catInfo = B2B_CATEGORIES[tx.category] || { name: tx.category, color: '#94a3b8' };
                        const isEntrada = tx.type === 'entrada';
                        const isPago = tx.status === 'pago';

                        return (
                          <div 
                            key={tx.id}
                            className={`p-4 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200/40 dark:border-slate-800/60 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all ${
                              !isPago ? 'border-l-4 border-l-amber-500' : isEntrada ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-indigo-500'
                            }`}
                          >
                            
                            {/* Left Side: Type Icon, Description and tag info */}
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 shrink-0">
                                {isEntrada ? (
                                  <ArrowUpCircle className="text-emerald-500" size={20} />
                                ) : (
                                  <ArrowDownCircle className="text-rose-500" size={20} />
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                                  {tx.description}
                                </p>
                                
                                <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-slate-400">
                                  {/* Category chip */}
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-250/30">
                                    {catInfo.name}
                                  </span>

                                  {/* Bank account chip */}
                                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500">
                                    {tx.bank}
                                  </span>

                                  {/* CNPJ indicator if present */}
                                  {tx.cnpjDestination && (
                                    <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/20 text-sky-600 font-mono">
                                      CNPJ/CPF: {tx.cnpjDestination}
                                    </span>
                                  )}

                                  {/* Date Display */}
                                  <span>
                                    • {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Flow Value, Status toggler and actions buttons */}
                            <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-slate-100 md:border-t-0 dark:border-slate-800/50 pt-2 md:pt-0">
                              
                              {/* Status badge and value combo */}
                              <div className="text-left md:text-right">
                                <span className={`text-sm font-black block ${isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                                  {isEntrada ? '+' : '-'} R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                
                                <button
                                  onClick={() => toggleTxStatus(tx)}
                                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg inline-flex items-center gap-1 cursor-pointer mt-0.5 ${
                                    isPago 
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200/20' 
                                      : 'bg-amber-50 dark:bg-amber-955/35 text-amber-600 border border-amber-200/20 animate-pulse'
                                  }`}
                                  title="Clique para alternar compensado/pendente"
                                >
                                  {isPago ? 'Recebido/Pago' : 'Pendente / A compensar'}
                                </button>
                              </div>

                              {/* Action controls */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEditTxClick(tx)}
                                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 rounded-lg cursor-pointer hover:text-emerald-500 transition-colors"
                                  title="Editar Lançamento"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTx(tx.id)}
                                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-150/40 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 rounded-lg cursor-pointer hover:text-rose-500 transition-colors"
                                  title="Estornar / Apagar Lançamento"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>

                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* --- MODAL: CREATE/EDIT COMPANY --- */}
      <AnimatePresence>
        {isCompanyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCompanyModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 border border-slate-150/40 dark:border-slate-800 p-6 md:p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{compIcon}</span>
                  <h3 className="text-base font-black text-slate-800 dark:text-white leading-none">
                    {editingCompany ? 'Recalibrar Empresa' : 'Cadastrar Perfil Comercial PJ'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 rounded-full border border-slate-200/50 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveCompany} className="space-y-4">
                
                {/* Nome fantasia */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nome Comercial / Razão Social</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Beys Arts, Fortuna Soluções, etc."
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-850 dark:text-white font-medium"
                  />
                </div>

                {/* Grid inputs */}
                <div className="grid grid-cols-2 gap-4">
                  {/* CNPJ */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">CNPJ (Opcional)</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={compCnpj}
                      onChange={(e) => setCompCnpj(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-850 dark:text-white font-mono"
                    />
                  </div>

                  {/* Capital Inicial */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Capital Inicial PJ (R$)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={compCapital}
                      onChange={(e) => setCompCapital(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-850 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* Segmento */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ramo de Atuação / Segmento</label>
                  <select
                    value={compSegment}
                    onChange={(e) => setCompSegment(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-700 dark:text-slate-350 font-semibold"
                  >
                    {BUSINESS_SEGMENTS.map(sg => (
                      <option key={sg.id} value={sg.id}>
                        {sg.icon} {sg.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Emoji Select Grid */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Ícone Representativo</label>
                  <div className="flex gap-2.5 overflow-x-auto py-1 scrollbar-none">
                    {['🏢', '💼', '💻', '🛒', '🌐', '📊', '🍕', '🏥', '🎓', '🎨', '⚙️', '🔨'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCompIcon(emoji)}
                        className={`text-xl p-2.5 rounded-xl border transition-all cursor-pointer ${
                          compIcon === emoji 
                            ? 'bg-emerald-55 border-emerald-500 font-extrabold scale-110 shadow-xs' 
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-855 border-transparent'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color choices selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Cor Representativa do Painel</label>
                  <div className="flex items-center gap-2">
                    {COMPANY_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCompColor(color)}
                        className="w-7 h-7 rounded-full relative transition-transform duration-300 hover:scale-110 cursor-pointer border border-white/20"
                        style={{ backgroundColor: color }}
                      >
                        {compColor === color && (
                          <span className="absolute inset-0 m-auto w-2.5 h-2.5 bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit actions */}
                <div className="pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCompanyModalOpen(false)}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-350 text-xs font-bold rounded-2xl border border-slate-200/50 dark:border-slate-800 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-2xl shadow-xs transition-all cursor-pointer"
                  >
                    {editingCompany ? 'Atualizar Dados' : 'Cadastrar Negócio'}
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: CREATE/EDIT TRANSACTION --- */}
      <AnimatePresence>
        {isTxModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTxModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 border border-slate-150/40 dark:border-slate-800 p-6 md:p-8 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                    <Briefcase size={16} />
                  </span>
                  <h3 className="text-base font-black text-slate-800 dark:text-white leading-none">
                    {editingTx ? 'Revisar Lançamento PJ' : 'Adicionar Lançamento PJ'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsTxModalOpen(false)}
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 rounded-full border border-slate-200/50 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Entrada/Saída tabs selector */}
              <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setTxType('saida')}
                  className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
                    txType === 'saida' 
                      ? 'bg-rose-600 text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Despesa (Saída)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('entrada')}
                  className={`flex-1 py-2 text-center text-xs font-black rounded-xl transition-all cursor-pointer ${
                    txType === 'entrada' 
                      ? 'bg-emerald-650 text-white shadow-xs' 
                      : 'text-slate-500 hover:text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Receita (Entrada)
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="space-y-4">
                
                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Descrição comercial</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Aquisição de Domínio, Serviço prestado ao cliente, DAS, etc."
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-850 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Value */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Valor Comercial (R$)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={txValue}
                      onChange={(e) => setTxValue(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-850 dark:text-white font-black text-rose-500"
                      style={{ color: txType === 'entrada' ? '#10b981' : undefined }}
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data do Lançamento</label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-850 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category of Business select */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Categoria PJ</label>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      {Object.entries(B2B_CATEGORIES)
                        .filter(([_, value]) => value.type === txType)
                        .map(([id, item]) => (
                          <option key={id} value={id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Bank Account/Method */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Banco / Conta Origem</label>
                    <input
                      type="text"
                      placeholder="Ex: Nubank PJ, Itaú Empresas, Caixa"
                      value={txBank}
                      onChange={(e) => setTxBank(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-850 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* CNPJ / CPF beneficiary */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">CNPJ Fornecedor/Cliente</label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={txCnpjDest}
                      onChange={(e) => setTxCnpjDest(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-850 dark:text-white font-mono"
                    />
                  </div>

                  {/* Status selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status da Transação</label>
                    <select
                      value={txStatus}
                      onChange={(e) => setTxStatus(e.target.value as any)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-xs outline-hidden focus:border-emerald-500 text-slate-700 dark:text-slate-350 font-semibold"
                    >
                      <option value="pago">{txType === 'entrada' ? 'Recebido / Compensado' : 'Pago / Liquidado'}</option>
                      <option value="pendente">Pendente / A faturar</option>
                    </select>
                  </div>
                </div>

                {/* Submits */}
                <div className="pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-350 text-xs font-bold rounded-2xl border border-slate-200/50 dark:border-slate-800 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-2xl shadow-xs transition-all cursor-pointer"
                  >
                    {editingTx ? 'Salvar Alteração' : 'Confirmar Lançamento'}
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
