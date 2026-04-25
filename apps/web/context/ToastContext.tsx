import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastType = 'info' | 'success' | 'error' | 'warning' | 'confirm' | 'prompt'

interface Toast {
  id: string
  message: string
  type: ToastType
  title?: string
  defaultValue?: string
  onResolve?: (value: any) => void
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void
  showConfirm: (message: string, title?: string) => Promise<boolean>
  showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { ...toast, id }])
    
    if (toast.type !== 'confirm' && toast.type !== 'prompt') {
      setTimeout(() => removeToast(id), 5000)
    }
    return id
  }, [removeToast])

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    addToast({ message, type, title })
  }, [addToast])

  const showConfirm = useCallback((message: string, title: string = 'Confirm Action'): Promise<boolean> => {
    return new Promise((resolve) => {
      addToast({
        message,
        type: 'confirm',
        title,
        onResolve: (val) => {
          resolve(val)
        }
      })
    })
  }, [addToast])

  const showPrompt = useCallback((message: string, defaultValue: string = '', title: string = 'Input Required'): Promise<string | null> => {
    return new Promise((resolve) => {
      addToast({
        message,
        type: 'prompt',
        title,
        defaultValue,
        onResolve: (val) => {
          resolve(val)
        }
      })
    })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ showToast, showConfirm, showPrompt, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const [inputValue, setInputValue] = useState(toast.defaultValue || '')
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  const handleResolve = (value: any) => {
    toast.onResolve?.(value)
    handleDismiss()
  }

  return (
    <div className={`toast ${toast.type} ${isExiting ? 'toast-exit' : ''}`}>
      <div className="toast-header">
        <span className="toast-title">{toast.title || toast.type}</span>
        <button className="toast-close" onClick={handleDismiss}>&times;</button>
      </div>
      <div className="toast-body">{toast.message}</div>
      
      {toast.type === 'prompt' && (
        <input 
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleResolve(inputValue)
            if (e.key === 'Escape') handleResolve(null)
          }}
        />
      )}
      
      {(toast.type === 'confirm' || toast.type === 'prompt') && (
        <div className="toast-actions">
          <button onClick={() => handleResolve(toast.type === 'confirm' ? false : null)}>Cancel</button>
          <button className="primary" onClick={() => handleResolve(toast.type === 'confirm' ? true : inputValue)}>
            {toast.type === 'confirm' ? 'Confirm' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
