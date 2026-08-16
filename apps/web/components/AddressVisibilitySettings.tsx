import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { formatHumanError } from '../utils/error-handler';
import { Button } from './ui/Button';

const API_URL = getApiUrl();

interface AddressVisibilitySettingsProps {
  householdId: string;
}

export const AddressVisibilitySettings: React.FC<AddressVisibilitySettingsProps> = ({ householdId }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [visibility, setVisibility] = useState({
    admin: 'read-write',
    member: 'read-only'
  });

  useEffect(() => {
    fetchVisibility();
  }, [householdId]);

  const fetchVisibility = async () => {
    setLoading(true);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}/address-visibility`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = (await res.json()) as any;
        if (result.data) {
          setVisibility(result.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}/address-visibility`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(visibility)
      });
      if (res.ok) {
        showToast('Visibility settings saved', 'success');
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to save visibility settings'), 'error');
      }
    } catch (err: any) {
      showToast(formatHumanError(err, 'Network error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock size={16} className="text-emerald-500" />
        <h4 className="text-sm font-black tracking-widest text-emerald-500">Address Visibility</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black tracking-widest text-secondary mb-1">ADMIN ROLE</label>
          <select 
            className="w-full bg-black border border-white/10 rounded-lg text-xs font-black py-2 px-2 outline-none hover:border-emerald-500/30 transition-all"
            value={visibility.admin}
            onChange={e => setVisibility({...visibility, admin: e.target.value})}
          >
            <option value="read-write">Read & Write</option>
            <option value="read-only">Read Only</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black tracking-widest text-secondary mb-1">MEMBER ROLE</label>
          <select 
            className="w-full bg-black border border-white/10 rounded-lg text-xs font-black py-2 px-2 outline-none hover:border-emerald-500/30 transition-all"
            value={visibility.member}
            onChange={e => setVisibility({...visibility, member: e.target.value})}
          >
            <option value="read-write">Read & Write</option>
            <option value="read-only">Read Only</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>

      <div className="pt-2">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Visibility'}
        </Button>
      </div>
    </div>
  );
};
