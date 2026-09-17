import React from 'react';
import { useStore } from '../store/useStore';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export const DeleteConfirmationModal: React.FC = () => {
  const { deleteModalState, closeDeleteModal } = useStore();

  if (!deleteModalState.isOpen) return null;

  const handleConfirm = () => {
    deleteModalState.onConfirm();
    closeDeleteModal();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="delete-confirmation-dialog"
        className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
      >
        {/* Subtle decorative top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">{deleteModalState.title}</h3>
              <p className="text-xs text-stone-400">تأكيد عملية الحذف</p>
            </div>
          </div>
          <button
            id="close-delete-modal-btn"
            onClick={closeDeleteModal}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-stone-950/60 rounded-xl p-4 border border-stone-800/80 mb-6">
          <p className="text-sm text-stone-300 leading-relaxed">
            {deleteModalState.description}
          </p>
          {deleteModalState.itemLabel && (
            <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-medium text-xs break-words">
              {deleteModalState.itemLabel}
            </div>
          )}
          <div className="flex items-center gap-2 mt-3 text-xs text-stone-400">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>لا يمكن التراجع عن هذه العملية بعد التأكيد.</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            id="cancel-delete-action-btn"
            type="button"
            onClick={closeDeleteModal}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 transition-colors"
          >
            إلغاء الأمر
          </button>
          <button
            id="confirm-delete-action-btn"
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-700 hover:bg-rose-600 active:bg-rose-800 transition-all flex items-center gap-2 shadow-lg shadow-rose-950/40"
          >
            <Trash2 className="w-4 h-4" />
            <span>نعم، احذف الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
