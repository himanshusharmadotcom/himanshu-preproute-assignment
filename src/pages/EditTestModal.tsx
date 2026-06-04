import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppDispatch } from '../store/hooks';
import { closeEditModal } from '../features/testCreation/testCreationSlice';
import { TestCreationForm } from './TestCreationPage';

export const EditTestModal: React.FC = () => {
  const dispatch = useAppDispatch();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dispatch(closeEditModal()); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={() => dispatch(closeEditModal())}
      />

      {/* modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto mx-4">
        {/* header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Edit Test creation</h2>
          <button
            onClick={() => dispatch(closeEditModal())}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* form body */}
        <div className="px-7 py-6">
          <TestCreationForm
            isModal
            onSave={() => dispatch(closeEditModal())}
            onCancel={() => dispatch(closeEditModal())}
          />
        </div>
      </div>
    </div>
  );
};
