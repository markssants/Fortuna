import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UndoAction = {
  description: string;
  action: () => Promise<void>;
};

interface UndoContextType {
  lastAction: UndoAction | null;
  addUndoAction: (action: UndoAction) => void;
  clearUndoAction: () => void;
  executeUndo: () => Promise<void>;
}

const UndoContext = createContext<UndoContextType | null>(null);

export const useUndo = () => {
  const context = useContext(UndoContext);
  if (!context) throw new Error('useUndo must be used within UndoProvider');
  return context;
};

export const UndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  const addUndoAction = useCallback((action: UndoAction) => {
    setLastAction(action);
  }, []);

  const clearUndoAction = useCallback(() => {
    setLastAction(null);
  }, []);

  const executeUndo = useCallback(async () => {
    if (!lastAction) return;
    setIsUndoing(true);
    try {
      await lastAction.action();
      setLastAction(null);
    } catch (e) {
      console.error("Failed to undo", e);
      alert("Erro ao desfazer ação.");
    } finally {
      setIsUndoing(false);
      setShowPopup(false);
    }
  }, [lastAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        const isInputFocused = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
        const isContentEditable = (document.activeElement as HTMLElement)?.isContentEditable;
        
        if (!isInputFocused && !isContentEditable && lastAction) {
          e.preventDefault();
          setShowPopup(true);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastAction]);

  return (
    <UndoContext.Provider value={{ lastAction, addUndoAction, clearUndoAction, executeUndo }}>
      {children}
      {showPopup && lastAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Desfazer Ação?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Você deseja desfazer a seguinte ação: <br/>
                <strong className="text-slate-800 dark:text-slate-200 mt-2 block">"{lastAction.description}"</strong>
              </p>
              
              <div className="flex gap-3 w-full pt-4">
                <button 
                  onClick={() => setShowPopup(false)}
                  disabled={isUndoing}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeUndo}
                  disabled={isUndoing}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isUndoing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Sim, Desfazer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UndoContext.Provider>
  );
};
