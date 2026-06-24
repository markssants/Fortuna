import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Trash2,
  Plus,
  Calendar as CalendarIcon,
  DollarSign,
  Edit2,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../firebase";

export interface Divida {
  id: string;
  creditor: string;
  amount: number;
  dueDate: string;
  description: string;
  status: "pendente" | "pago" | "atrasada";
  notes?: string;
  userId?: string;
}

export function cleanDividaForFirestore(divida: Divida): Partial<Divida> {
  const cleaned = { ...divida };
  if (cleaned.notes === undefined) delete cleaned.notes;
  return cleaned;
}

interface DividasProps {
  dividas: Divida[];
  setDividas: React.Dispatch<React.SetStateAction<Divida[]>>;
  user: any;
  theme: "light" | "dark";
  triggerUndoToast?: (
    message: string,
    type:
      | "divida"
      | "transaction"
      | "meta"
      | "cofre"
      | "recorrente"
      | "conta"
      | "investment"
      | "budget"
      | "category",
    item: any,
    extraData?: any,
  ) => void;
}

export default function Dividas({
  dividas,
  setDividas,
  user,
  theme,
  triggerUndoToast,
}: DividasProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [dividaToDelete, setDividaToDelete] = useState<Divida | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "todas" | "pendente" | "pago" | "atrasada"
  >("todas");

  const [newDivida, setNewDivida] = useState<Partial<Divida>>({
    creditor: "",
    amount: 0,
    dueDate: new Date().toISOString().split("T")[0],
    description: "",
    status: "pendente",
    notes: "",
  });

  const [editingDivida, setEditingDivida] = useState<Divida | null>(null);

  const calculateStatus = (divida: Partial<Divida>) => {
    if (divida.status === "pago") return "pago";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dDate = new Date(divida.dueDate + "T12:00:00");
    dDate.setHours(0, 0, 0, 0);
    return dDate < today ? "atrasada" : "pendente";
  };

  const filteredDividas = useMemo(() => {
    return dividas
      .filter((div) => {
        const matchSearch =
          div.creditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
          div.description.toLowerCase().includes(searchTerm.toLowerCase());

        const currentStatus = calculateStatus(div);
        const matchStatus =
          filterStatus === "todas" || currentStatus === filterStatus;

        return matchSearch && matchStatus;
      })
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
  }, [dividas, searchTerm, filterStatus]);

  const totalPendente = useMemo(() => {
    return dividas
      .filter((d) => calculateStatus(d) !== "pago")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [dividas]);

  const totalAtrasado = useMemo(() => {
    return dividas
      .filter((d) => calculateStatus(d) === "atrasada")
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [dividas]);

  const handleCreateDivida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDivida.creditor || !newDivida.amount || !newDivida.dueDate) return;

    const id = String(Date.now());
    const statusAtualizado = calculateStatus(newDivida);

    const dividaObj: Divida = {
      id,
      creditor: newDivida.creditor,
      amount: Number(newDivida.amount),
      dueDate: newDivida.dueDate,
      description: newDivida.description || "",
      status: statusAtualizado,
      notes: newDivida.notes,
      userId: user?.uid,
    };

    if (user) {
      const path = `users/${user.uid}/dividas`;
      try {
        await setDoc(doc(db, path, id), cleanDividaForFirestore(dividaObj));
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `${path}/${id}`);
      }
    } else {
      setDividas([...dividas, dividaObj]);
    }

    setIsNewModalOpen(false);
    setNewDivida({
      creditor: "",
      amount: 0,
      dueDate: new Date().toISOString().split("T")[0],
      description: "",
      status: "pendente",
      notes: "",
    });
  };

  const handleUpdateDivida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingDivida ||
      !editingDivida.creditor ||
      !editingDivida.amount ||
      !editingDivida.dueDate
    )
      return;

    const statusAtualizado = calculateStatus(editingDivida);
    const updated = {
      ...editingDivida,
      status: statusAtualizado as "pendente" | "pago" | "atrasada",
    };

    if (user) {
      const path = `users/${user.uid}/dividas`;
      try {
        await setDoc(
          doc(db, path, updated.id),
          cleanDividaForFirestore(updated),
        );
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `${path}/${updated.id}`,
        );
      }
    } else {
      setDividas(dividas.map((d) => (d.id === updated.id ? updated : d)));
    }

    setEditingDivida(null);
  };

  const handleDeleteDivida = async (id: string) => {
    const dividaToDeleteDoc = dividas.find((d) => d.id === id);
    if (!dividaToDeleteDoc) return;

    if (user) {
      const path = `users/${user.uid}/dividas`;
      try {
        await deleteDoc(doc(db, path, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
      }
    } else {
      setDividas(dividas.filter((d) => d.id !== id));
    }

    if (dividaToDeleteDoc && triggerUndoToast) {
      triggerUndoToast(
        `Dívida para "${dividaToDeleteDoc.creditor}" excluída`,
        "divida",
        dividaToDeleteDoc,
      );
    }

    setDividaToDelete(null);
  };

  const toggleStatus = async (divida: Divida) => {
    const newStatus = divida.status === "pago" ? "pendente" : "pago";
    const updated = {
      ...divida,
      status: newStatus as "pendente" | "pago" | "atrasada",
    };

    if (newStatus !== "pago") {
      updated.status = calculateStatus(updated);
    }

    if (user) {
      const path = `users/${user.uid}/dividas`;
      try {
        await setDoc(
          doc(db, path, updated.id),
          cleanDividaForFirestore(updated),
        );
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.UPDATE,
          `${path}/${updated.id}`,
        );
      }
    } else {
      setDividas(dividas.map((d) => (d.id === updated.id ? updated : d)));
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Dívidas Pessoais
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Controle para quem você deve e os prazos de pagamento.
          </p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 sm:py-2.5 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Nova Dívida</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Total Pendente
            </p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
              R${" "}
              {totalPendente.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Total Atrasado
            </p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-500">
              R${" "}
              {totalAtrasado.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar credor ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          {(["todas", "pendente", "pago", "atrasada"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-3 sm:py-2 rounded-2xl font-semibold text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                  filterStatus === status
                    ? "bg-slate-800 text-white dark:bg-emerald-500 dark:text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50"
                }`}
              >
                <Filter size={16} />
                <span className="capitalize">{status}</span>
              </button>
            ),
          )}
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredDividas.map((divida) => {
            const status = calculateStatus(divida);
            const isLate = status === "atrasada";
            const isPaid = status === "pago";

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={divida.id}
                className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition-all relative overflow-hidden group ${
                  isPaid
                    ? "border-emerald-200 dark:border-emerald-900/30 opacity-70"
                    : isLate
                      ? "border-rose-200 dark:border-rose-900/30"
                      : "border-slate-100 dark:border-slate-800"
                }`}
              >
                <div className="flex flex-col h-full justify-between gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : isLate
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 size={24} />
                        ) : (
                          <Users size={24} />
                        )}
                      </div>
                      <div>
                        <h3
                          className={`font-bold text-lg leading-tight ${isPaid ? "text-emerald-700 dark:text-emerald-400 line-through opacity-70" : "text-slate-800 dark:text-slate-100"}`}
                        >
                          {divida.creditor}
                        </h3>
                        {divida.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {divida.description}
                          </p>
                        )}
                        {divida.notes && (
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 italic border-l-2 border-slate-200 dark:border-slate-700 pl-2">
                            {divida.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xl font-black ${
                          isPaid
                            ? "text-emerald-600 dark:text-emerald-400 opacity-70"
                            : isLate
                              ? "text-rose-600 dark:text-rose-500"
                              : "text-amber-600 dark:text-amber-500"
                        }`}
                      >
                        R${" "}
                        {divida.amount.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <CalendarIcon size={14} />
                        <span>
                          Vence{" "}
                          {new Date(
                            divida.dueDate + "T12:00:00",
                          ).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {isLate && !isPaid && (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-lg">
                          Atrasada
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => toggleStatus(divida)}
                        className={`p-2.5 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 ${
                          isPaid
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                        title={
                          isPaid ? "Marcar como pendente" : "Marcar como pago"
                        }
                      >
                        {isPaid ? (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Pago</span>
                          </>
                        ) : (
                          <>
                            <Clock size={16} />
                            <span>Pagar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setEditingDivida(divida)}
                        className="p-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDividaToDelete(divida)}
                        className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredDividas.length === 0 && (
          <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">
              Nenhuma dívida encontrada.
            </p>
            <p className="text-slate-500 dark:text-slate-500 mt-1">
              Que ótimo! Suas contas estão em dia.
            </p>
          </div>
        )}
      </div>

      {/* Modal Nova / Editar */}
      <AnimatePresence>
        {(isNewModalOpen || editingDivida) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsNewModalOpen(false);
                setEditingDivida(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden border border-slate-100 dark:border-slate-800 z-10"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                  {editingDivida ? "Editar Dívida" : "Nova Dívida"}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  {editingDivida
                    ? "Altere as informações abaixo."
                    : "Registre para quem você deve."}
                </p>
              </div>

              <form
                onSubmit={
                  editingDivida ? handleUpdateDivida : handleCreateDivida
                }
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Credor (Para quem)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João, Banco Inter, Agiota..."
                    value={
                      editingDivida
                        ? editingDivida.creditor
                        : newDivida.creditor
                    }
                    onChange={(e) =>
                      editingDivida
                        ? setEditingDivida({
                            ...editingDivida,
                            creditor: e.target.value,
                          })
                        : setNewDivida({
                            ...newDivida,
                            creditor: e.target.value,
                          })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Valor (R$)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-medium">R$</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={
                          editingDivida
                            ? editingDivida.amount
                            : newDivida.amount || ""
                        }
                        onChange={(e) =>
                          editingDivida
                            ? setEditingDivida({
                                ...editingDivida,
                                amount: Number(e.target.value),
                              })
                            : setNewDivida({
                                ...newDivida,
                                amount: Number(e.target.value),
                              })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Vencimento
                    </label>
                    <input
                      type="date"
                      required
                      value={
                        editingDivida
                          ? editingDivida.dueDate
                          : newDivida.dueDate
                      }
                      onChange={(e) =>
                        editingDivida
                          ? setEditingDivida({
                              ...editingDivida,
                              dueDate: e.target.value,
                            })
                          : setNewDivida({
                              ...newDivida,
                              dueDate: e.target.value,
                            })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Descrição
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Empréstimo para reforma"
                    value={
                      editingDivida
                        ? editingDivida.description
                        : newDivida.description
                    }
                    onChange={(e) =>
                      editingDivida
                        ? setEditingDivida({
                            ...editingDivida,
                            description: e.target.value,
                          })
                        : setNewDivida({
                            ...newDivida,
                            description: e.target.value,
                          })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Anotações (opcional)
                  </label>
                  <textarea
                    placeholder="Detalhes sobre taxas, acordos..."
                    value={
                      editingDivida ? editingDivida.notes : newDivida.notes
                    }
                    onChange={(e) =>
                      editingDivida
                        ? setEditingDivida({
                            ...editingDivida,
                            notes: e.target.value,
                          })
                        : setNewDivida({ ...newDivida, notes: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none h-24"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewModalOpen(false);
                      setEditingDivida(null);
                    }}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Exclusão */}
      <AnimatePresence>
        {dividaToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDividaToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative z-10 border border-slate-100 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">
                Excluir dívida?
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-6">
                Tem certeza que deseja excluir a dívida de{" "}
                <strong>
                  R${" "}
                  {dividaToDelete.amount.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </strong>{" "}
                para <strong>{dividaToDelete.creditor}</strong>?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDividaToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteDivida(dividaToDelete.id)}
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/30 transition-all active:scale-95"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
