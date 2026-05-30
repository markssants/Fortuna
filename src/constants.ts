import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const CATEGORIES = [
  { id: 'alimentacao', name: 'Alimentação', color: '#10b981' },
  { id: 'transporte', name: 'Transporte', color: '#3b82f6' },
  { id: 'lazer', name: 'Lazer', color: '#f59e0b' },
  { id: 'saude', name: 'Saúde', color: '#ef4444' },
  { id: 'presentes', name: 'Presentes', color: '#ec4899' },
  { id: 'moradia', name: 'Moradia', color: '#8b5cf6' },
  { id: 'assinaturas', name: 'Assinaturas', color: '#06b6d4' },
  { id: 'outros', name: 'Outros', color: '#64748b' },
];

export const BANKS = ['Nubank', 'Itaú', 'Inter', 'Bradesco', 'Santander', 'Dinheiro'];

export const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parsed = parseISO(dateStr);
    const formatted = format(parsed, "d MMMM", { locale: ptBR });
    const parts = formatted.split(' ');
    if (parts.length === 2) {
      const day = parts[0];
      const month = parts[1];
      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
      return `${day} ${capitalizedMonth}`;
    }
    return formatted;
  } catch (e) {
    return dateStr;
  }
};

export const getCategoryIconAndStyle = (categoryId: string) => {
  switch (categoryId) {
    case 'alimentacao':
      return {
        icon: '🍔',
        bg: 'bg-emerald-50 dark:bg-emerald-950/20',
        text: 'text-lg'
      };
    case 'transporte':
      return {
        icon: '🚗',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        text: 'text-lg'
      };
    case 'lazer':
      return {
        icon: '🎉',
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        text: 'text-lg'
      };
    case 'saude':
      return {
        icon: '🩺',
        bg: 'bg-rose-50 dark:bg-rose-950/20',
        text: 'text-lg'
      };
    case 'presentes':
      return {
        icon: '🎁',
        bg: 'bg-pink-50 dark:bg-pink-950/20',
        text: 'text-lg'
      };
    case 'moradia':
      return {
        icon: '🏠',
        bg: 'bg-violet-50 dark:bg-violet-950/20',
        text: 'text-lg'
      };
    case 'assinaturas':
      return {
        icon: '📺',
        bg: 'bg-cyan-50 dark:bg-cyan-950/20',
        text: 'text-lg'
      };
    case 'salario':
      return {
        icon: '💰',
        bg: 'bg-teal-50 dark:bg-teal-950/20',
        text: 'text-lg'
      };
    case 'outros':
      return {
        icon: '📝',
        bg: 'bg-slate-50 dark:bg-slate-900/40',
        text: 'text-lg'
      };
    default:
      return {
        icon: '❓',
        bg: 'bg-slate-50 dark:bg-slate-900/40',
        text: 'text-lg'
      };
  }
};

export const getStatusColorClasses = (status: string, isRow: boolean = false) => {
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
