import { toast } from 'react-hot-toast';

export const triggerApiMutate = (path?: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ledger-api-mutate', { detail: { path } }));
  }
};

export const showToast = {
  success: (msg: string, mutatePath?: string) => {
    toast.success(msg);
    if (mutatePath) triggerApiMutate(mutatePath);
  },
  error: (msg: string) => toast.error(msg),
  loading: (msg: string) => toast.loading(msg),
};
