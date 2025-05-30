import React, { useState, createContext, useContext } from 'react';

// Create a dialog context to manage dialog visibility across the app
const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    message: '',
    title: '',
    onConfirm: () => {},
    showCancel: false
  });

  const showDialog = (options) => {
    setDialogState({
      isOpen: true,
      message: options.message || '',
      title: options.title || 'Alert',
      onConfirm: options.onConfirm || (() => {}),
      showCancel: options.showCancel || false,
      onCancel: options.onCancel || (() => {})
    });
  };

  const hideDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <DialogContext.Provider value={{ ...dialogState, showDialog, hideDialog }}>
      {children}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DeactivationDialog = () => {
  const { isOpen, title, message, onConfirm, hideDialog, showCancel, onCancel } = useDialog();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg max-w-md w-full">
        <h3 className={`text-xl font-medium ${title === 'Account Deactivated' ? 'text-red-600': 'text-green-600'} mb-4`}>{title}</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          {showCancel && (
            <button 
              onClick={() => {
                onCancel();
                hideDialog();
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={() => {
              onConfirm();
              hideDialog();
            }}
            className={`px-4 py-2 ${title === 'Account Deactivated' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded hover:bg-opacity-80 transition`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
