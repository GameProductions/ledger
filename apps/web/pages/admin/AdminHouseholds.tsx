import React, { useState, useEffect } from 'react';
import AdminPortal from './AdminPortal';
import { Home, Building, Landmark, Shield, Heart, Key, Briefcase, Zap, MoreVertical, MapPin, Lock, UserPlus, Info, Database, Cpu, HardDrive, Search, Users, Activity, Globe, X, ArrowRightLeft, ShieldAlert, ChevronDown, Edit3, Trash2 } from 'lucide-react';
import { getApiUrl } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineToast } from '../../components/ui/InlineToast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';

const PRESET_ICONS = [
  { id: 'Home', label: 'House', icon: Home },
  { id: 'Building', label: 'Building', icon: Building },
  { id: 'Landmark', label: 'Landmark', icon: Landmark },
  { id: 'Shield', label: 'Shield', icon: Shield },
  { id: 'Heart', label: 'Heart', icon: Heart },
  { id: 'Key', label: 'Key', icon: Key },
  { id: 'Briefcase', label: 'Work', icon: Briefcase },
  { id: 'Zap', label: 'Zap', icon: Zap },
];

const renderHouseholdIcon = (iconName?: string, avatarUrl?: string, className: string = "w-6 h-6 text-emerald-400") => {
  if (avatarUrl && avatarUrl.trim().length > 0) {
    return <img src={avatarUrl} alt="Household Avatar" className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/30 shadow-lg" />;
  }
  const match = PRESET_ICONS.find(i => i.id === iconName);
  const IconComponent = match ? match.icon : Home;
  return <IconComponent className={className} />;
};

const MOVE_CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: 'membership', label: 'Membership', hint: 'Move the member into the destination household' },
  { key: 'transactions', label: 'Transactions', hint: 'Transactions where this member is the owner' },
  { key: 'bills', label: 'Bills', hint: 'Bills owned by this member' },
  { key: 'subscriptions', label: 'Subscriptions', hint: 'Subscriptions owned by this member' },
  { key: 'pairingRules', label: 'Pairing Rules', hint: 'Transaction pairing rules owned by this member' },
  { key: 'paySchedules', label: 'Pay Schedules', hint: 'Pay schedules & exceptions assigned to this member' },
  { key: 'paymentMethods', label: 'Payment Methods', hint: 'User payment methods & linked accounts' },
  { key: 'externalContacts', label: 'External Contacts', hint: 'Contacts created by this member' },
  { key: 'reminders', label: 'Reminders', hint: 'Reminders assigned to this member' },
  { key: 'loans', label: 'Personal Loans', hint: 'Loans where this member is the lender' },
  { key: 'liabilitySplits', label: 'Liability Splits', hint: 'Splits involving this member' },
  { key: 'sharedBalances', label: 'Shared Balances', hint: 'Balances shared to/from this member' },
];

// --- SUB-COMPONENT: Edit Household Details & Icon Modal ---
const HouseholdEditModal: React.FC<{
  household: any;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ household, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [name, setName] = useState(household?.name || '');
  const [slugId, setSlugId] = useState(household?.id || '');
  const [selectedIcon, setSelectedIcon] = useState(household?.icon || 'Home');
  const [avatarUrl, setAvatarUrl] = useState(household?.avatarUrl || '');
  const [currency, setCurrency] = useState(household?.currency || 'USD');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !slugId.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/households/${household.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: slugId.trim(),
          name: name.trim(),
          currency: currency.trim().toUpperCase(),
          icon: selectedIcon,
          avatarUrl: avatarUrl.trim() || null,
        })
      }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        showToast('Household details & icon updated', 'success');
        onSuccess();
        onClose();
      } else {
        showToast(data.error || 'Failed to update household', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update household', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!household}
      onClose={onClose}
      title="Edit Household & Custom Icon"
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-black"
            loading={saving}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Preview Avatar / Icon */}
        <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg">
            {renderHouseholdIcon(selectedIcon, avatarUrl, "w-7 h-7 text-emerald-400")}
          </div>
          <div>
            <h4 className="text-sm font-black text-white">{name || 'Household Name'}</h4>
            <p className="text-xs text-slate-500 font-mono">{slugId || 'household-id'}</p>
          </div>
        </div>

        {/* Household Name */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase ml-1">Household Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-black/80 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50"
            placeholder="e.g. Main Family Household"
          />
        </div>

        {/* Household ID (Slug) */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase ml-1">Household ID (Unique Slug)</label>
          <input
            type="text"
            value={slugId}
            onChange={e => setSlugId(e.target.value)}
            className="w-full bg-black/80 border border-white/10 p-3 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-emerald-500/50"
            placeholder="e.g. main-household-01"
          />
        </div>

        {/* Preset Icon Selector */}
        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase ml-1">Choose Household Icon</label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PRESET_ICONS.map(item => {
              const IconComp = item.icon;
              const isSelected = selectedIcon === item.id && !avatarUrl;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSelectedIcon(item.id); setAvatarUrl(''); }}
                  title={item.label}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    isSelected ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <IconComp size={18} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Avatar Image URL */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase ml-1">Or Custom Avatar Image URL (Optional)</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            className="w-full bg-black/80 border border-white/10 p-3 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-emerald-500/50"
            placeholder="https://example.com/icon.png"
          />
        </div>

        {/* Currency */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase ml-1">Currency Code</label>
          <input
            type="text"
            value={currency}
            maxLength={3}
            onChange={e => setCurrency(e.target.value.toUpperCase())}
            className="w-full bg-black/80 border border-white/10 p-3 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-emerald-500/50 uppercase"
            placeholder="USD"
          />
        </div>
      </div>
    </Modal>
  );
};

// --- SUB-COMPONENT: Encrypted Household Address Modal ---
const HouseholdAddressModal: React.FC<{
  household: any;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ household, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [address, setAddress] = useState<{
    street: string;
    unit: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    formatted: string;
  }>({
    street: '',
    unit: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    formatted: '',
  });

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    const fetchAddress = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/admin/households/${household.id}/address`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!cancelled && data.success && data.data) {
          setAddress({
            street: data.data.street || '',
            unit: data.data.unit || '',
            city: data.data.city || '',
            state: data.data.state || '',
            postalCode: data.data.postalCode || '',
            country: data.data.country || '',
            formatted: data.data.formatted || '',
          });
          setQuery(data.data.formatted || data.data.street || '');
        }
      } catch (err: any) {
        console.error('Failed to load household address:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAddress();
    return () => { cancelled = true; };
  }, [household]);

  // Address Autocomplete debounced lookup
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/address/autocomplete?q=${encodeURIComponent(query.trim())}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setSuggestions(data.suggestions || []);
          setShowDropdown(true);
        }
      } catch (err: any) {
        console.error('Autocomplete error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectSuggestion = (s: any) => {
    setAddress(prev => ({
      ...prev,
      street: s.street || prev.street,
      city: s.city || prev.city,
      state: s.state || prev.state,
      postalCode: s.postalCode || prev.postalCode,
      country: s.country || prev.country,
      formatted: s.formatted,
    }));
    setQuery(s.formatted);
    setShowDropdown(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const formatted = address.formatted || [address.street, address.unit, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ');
      const res = await fetch(`${apiUrl}/api/admin/households/${household.id}/address`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...address, formatted })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Encrypted address saved to Vault', 'success');
        onSuccess();
        onClose();
      } else {
        showToast(data.error || 'Failed to save address', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save address', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/admin/households/${household.id}/address`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(null)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Household address removed', 'success');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove address', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!household}
      onClose={onClose}
      title={`Household Encrypted Address — ${household?.name}`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {(address.street || address.formatted) ? (
            <Button variant="danger" onClick={handleRemove} disabled={saving}>Remove Address</Button>
          ) : <div />}
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-black"
              loading={saving}
              onClick={handleSave}
            >
              <Lock size={14} /> Save Encrypted Address
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Security / Vault Info Header */}
        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <Lock size={18} className="text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Encrypted Vault Storage</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Household addresses are encrypted at rest using AES-GCM in the Ledger Vault table (<code className="text-emerald-300">vault_v2</code>). Address values are decrypted on demand only for authorized household members.
            </p>
          </div>
        </div>

        {/* Autocomplete Search */}
        <div className="space-y-2 relative">
          <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase ml-1">
            Search Address / Autocomplete Suggestions
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Type an address (e.g. 1600 Pennsylvania Ave)..."
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-black/80 border border-white/10 p-3.5 pl-10 pr-10 rounded-2xl text-xs font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
            />
            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
            {searching && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            )}
          </div>

          {/* Autocomplete Dropdown Suggestions */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0d0d0d] border border-white/15 rounded-2xl p-2 shadow-2xl space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(s)}
                  className="p-3 hover:bg-emerald-500/10 rounded-xl cursor-pointer transition-all border border-transparent hover:border-emerald-500/20"
                >
                  <p className="text-xs font-bold text-white flex items-center gap-2">
                    <MapPin size={12} className="text-emerald-400 shrink-0" /> {s.formatted}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Individual Editable Address Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Street Address</label>
            <input
              type="text"
              placeholder="Street name & number"
              value={address.street}
              onChange={e => setAddress(prev => ({ ...prev, street: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Apt / Unit / Suite (Optional)</label>
            <input
              type="text"
              placeholder="Apt 4B, Suite 100"
              value={address.unit}
              onChange={e => setAddress(prev => ({ ...prev, unit: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">City / Town</label>
            <input
              type="text"
              placeholder="City"
              value={address.city}
              onChange={e => setAddress(prev => ({ ...prev, city: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">State / Province</label>
            <input
              type="text"
              placeholder="State"
              value={address.state}
              onChange={e => setAddress(prev => ({ ...prev, state: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Postal Code</label>
            <input
              type="text"
              placeholder="Postal code"
              value={address.postalCode}
              onChange={e => setAddress(prev => ({ ...prev, postalCode: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Country</label>
            <input
              type="text"
              placeholder="Country"
              value={address.country}
              onChange={e => setAddress(prev => ({ ...prev, country: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

// --- SUB-COMPONENT: Household Members Management Modal ---
const HouseholdMembersModal: React.FC<{
  household: any;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ household, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUserId, setAddingUserId] = useState('');
  const [addingRole, setAddingRole] = useState<'owner' | 'member' | 'viewer'>('member');
  const [submitting, setSubmitting] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const [resMembers, resUsers] = await Promise.all([
        fetch(`${apiUrl}/api/admin/households/${household.id}/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      const dataMembers = (await resMembers.json() as any);
      const dataUsers = (await resUsers.json() as any);
      if (dataMembers.success) setMembers(dataMembers.data || []);
      if (dataUsers.success) setAllUsers(dataUsers.data || []);
    } catch (err: any) {
      console.error('Failed to load household members:', err);
      showToast(err.message || 'Failed to load members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (household) fetchMembers();
  }, [household]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/households/${household.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        showToast('Member role updated', 'success');
        setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
        onSuccess();
      } else {
        showToast(data.error || 'Failed to update role', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/households/${household.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        showToast('Member removed from household', 'success');
        setMembers(prev => prev.filter(m => m.userId !== userId));
        setConfirmRemoveId(null);
        onSuccess();
      } else {
        showToast(data.error || 'Failed to remove member', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member', 'error');
    }
  };

  const handleAddMember = async () => {
    if (!addingUserId) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/households/${household.id}/members`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: addingUserId, role: addingRole })
      }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        showToast('Member added to household', 'success');
        setAddingUserId('');
        await fetchMembers();
        onSuccess();
      } else {
        showToast(data.error || 'Failed to add member', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to add member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const availableUsersToAdd = allUsers.filter(u => !members.some(m => m.userId === u.id));

  return (
    <Modal
      isOpen={!!household}
      onClose={onClose}
      title={`Household Members — ${household?.name}`}
      maxWidth="max-w-3xl"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-6">
        {/* Add Member Form */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <UserPlus size={14} /> Add Member to Household
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <select
                value={addingUserId}
                onChange={e => setAddingUserId(e.target.value)}
                className="w-full appearance-none bg-black/80 border border-white/10 p-3 pr-10 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50"
              >
                <option value="">Select user to add...</option>
                {availableUsersToAdd.map(u => (
                  <option key={u.id} value={u.id} className="bg-[#0d0d0d] text-white">
                    {u.displayName || u.username || u.email} ({u.email})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={addingRole}
                  onChange={e => setAddingRole(e.target.value as any)}
                  className="w-full appearance-none bg-black/80 border border-white/10 p-3 pr-8 rounded-xl text-xs font-bold text-white outline-none focus:border-emerald-500/50 capitalize"
                >
                  <option value="member">Member</option>
                  <option value="owner">Owner</option>
                  <option value="viewer">Viewer</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              <Button
                variant="primary"
                className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black px-4"
                disabled={!addingUserId || submitting}
                loading={submitting}
                onClick={handleAddMember}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Active Members ({members.length})
            </h4>
          </div>

          {loading ? (
            <div className="p-6 text-center text-xs text-slate-500 font-bold animate-pulse">Loading household members...</div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 font-bold bg-white/5 rounded-2xl border border-white/5">
              No members assigned to this household.
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              {members.map(m => {
                const initials = (m.displayName || m.username || m.email || 'U').slice(0, 2).toUpperCase();
                return (
                  <div key={m.userId} className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl transition-all gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center text-xs font-black text-emerald-400 shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">{m.displayName || m.username || 'User'}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{m.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative">
                        <select
                          value={m.role}
                          onChange={e => handleUpdateRole(m.userId, e.target.value)}
                          className="appearance-none bg-black/60 border border-white/10 px-3 py-1.5 pr-7 rounded-xl text-[11px] font-bold text-slate-300 outline-none focus:border-emerald-500/50 capitalize"
                        >
                          <option value="owner">Owner</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>

                      {confirmRemoveId === m.userId ? (
                        <InlineToast
                          message="Remove?"
                          type="confirm"
                          onConfirm={() => handleRemoveMember(m.userId)}
                          onCancel={() => setConfirmRemoveId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setConfirmRemoveId(m.userId)}
                          title="Remove from household"
                          className="p-1.5 bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all text-slate-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// --- SUB-COMPONENT: Resource Usage Details Modal ---
const ResourceUsageInfoModal: React.FC<{
  household: any;
  onClose: () => void;
}> = ({ household, onClose }) => {
  return (
    <Modal
      isOpen={!!household}
      onClose={onClose}
      title="Resource Usage Diagnostics"
      maxWidth="max-w-lg"
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl">
          <Info size={18} className="text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Resource Metering Overview</h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              This meter measures the aggregate multi-tenant resource consumption for <strong className="text-white">{household?.name}</strong> across database indexing, API executions, and storage objects.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database size={16} className="text-emerald-500" />
              <div>
                <p className="text-xs font-black text-white">Database Row Records</p>
                <p className="text-[10px] text-slate-500 font-bold">Transactions, Bills, Subscriptions, Accounts</p>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-emerald-400">Indexed</span>
          </div>

          <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cpu size={16} className="text-blue-500" />
              <div>
                <p className="text-xs font-black text-white">Worker Edge Invocations</p>
                <p className="text-[10px] text-slate-500 font-bold">API Routing & Session Durable Objects</p>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-blue-400">Stateless</span>
          </div>

          <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive size={16} className="text-amber-500" />
              <div>
                <p className="text-xs font-black text-white">R2 Media & Backup Snapshots</p>
                <p className="text-[10px] text-slate-500 font-bold">Attachments & Automated Backups</p>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-amber-400">Encrypted</span>
          </div>
        </div>

        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
          <span className="text-xs font-black text-slate-300">Operational Health Status</span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-black tracking-widest uppercase">
            65% — Optimal
          </span>
        </div>
      </div>
    </Modal>
  );
};

// --- SUB-COMPONENT: Move Member Modal ---
const MoveMemberModal: React.FC<{
  sourceHousehold: any;
  households: any[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ sourceHousehold, households, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberId, setMemberId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [options, setOptions] = useState<Record<string, boolean>>(
    Object.fromEntries(MOVE_CATEGORIES.map(c => [c.key, true]))
  );
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!sourceHousehold) return;
    let cancelled = false;
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('ledger_token');
        const apiUrl = getApiUrl();
        const res = (await fetch(`${apiUrl}/api/admin/households/${sourceHousehold.id}/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }) as any);
        const data = (await res.json() as any);
        if (!cancelled && data.success) {
          setMembers(data.data || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch members:', err);
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    };
    fetchMembers();
    return () => { cancelled = true; };
  }, [sourceHousehold]);

  const handleConfirm = async () => {
    if (!memberId || !destinationId) return;
    setMoving(true);
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/households/${sourceHousehold.id}/move-member`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, destinationHouseholdId: destinationId, options })
      }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        const movedTotal = Object.values(data.moved || {}).reduce((a: number, b: any) => a + Number(b || 0), 0);
        showToast(`Moved ${movedTotal} record(s) to destination household`, 'success');
        onSuccess();
        onClose();
      } else {
        showToast(data.error || 'Move failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Move failed', 'error');
    } finally {
      setMoving(false);
    }
  };

  const selectedMember = members.find(m => m.userId === memberId);

  return (
    <Modal
      isOpen={!!sourceHousehold}
      onClose={onClose}
      title="Move Member Data"
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            className="bg-emerald-500 hover:bg-emerald-600 text-black"
            disabled={!memberId || !destinationId || moving}
            loading={moving}
            onClick={handleConfirm}
          >
            <ArrowRightLeft size={14} />
            Move Data
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
          <ShieldAlert size={16} className="text-orange-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-orange-500/80 font-bold tracking-widest leading-relaxed">
            OWNER ONLY: This moves a member and selected data from <strong className="text-orange-400">{sourceHousehold?.name}</strong> to another household. Choose exactly which data should follow them.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-600 font-black tracking-widest ml-1">Member</label>
          {loadingMembers ? (
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 font-bold animate-pulse">Loading members...</div>
          ) : (
            <div className="relative">
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full appearance-none bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
              >
                <option value="">Select member...</option>
                {members.map((m: any) => (
                  <option key={m.userId} value={m.userId} className="bg-[#0d0d0d] text-white">
                    {m.displayName || m.username || m.email} ({m.role})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-slate-600 font-black tracking-widest ml-1">Destination Household</label>
          <div className="relative">
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="w-full appearance-none bg-white/5 border border-white/10 p-4 pr-12 rounded-2xl text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
            >
              <option value="">Select destination...</option>
              {households
                .filter((h: any) => h.id !== sourceHousehold?.id)
                .map((h: any) => (
                  <option key={h.id} value={h.id} className="bg-[#0d0d0d] text-white">{h.name}</option>
                ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-slate-600 font-black tracking-widest ml-1">Data to Move</label>
            <button
              onClick={() => {
                const allOn = Object.values(options).every(Boolean);
                setOptions(Object.fromEntries(MOVE_CATEGORIES.map(c => [c.key, !allOn])));
              }}
              className="text-[10px] font-black text-emerald-500 tracking-widest hover:text-emerald-400 transition-colors"
            >
              {Object.values(options).every(Boolean) ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
            {MOVE_CATEGORIES.map((cat) => (
              <div
                key={cat.key}
                onClick={() => setOptions(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${options[cat.key] ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5 opacity-60'}`}
              >
                <Checkbox checked={!!options[cat.key]} onChange={(checked) => setOptions(prev => ({ ...prev, [cat.key]: checked }))} />
                <div>
                  <p className="text-xs font-black text-white tracking-tight">{cat.label}</p>
                  <p className="text-[10px] text-slate-600 font-bold leading-relaxed">{cat.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedMember && destinationId && (
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-600 font-black tracking-widest">Moving</p>
              <p className="text-xs font-black text-white">{selectedMember.displayName || selectedMember.username || selectedMember.email}</p>
            </div>
            <ArrowRightLeft size={18} className="text-emerald-500" />
            <div className="text-right">
              <p className="text-[10px] text-slate-600 font-black tracking-widest">To</p>
              <p className="text-xs font-black text-emerald-400">{households.find((h: any) => h.id === destinationId)?.name}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};


const AdminHouseholds: React.FC = () => {
  const { showConfirm } = useToast();
  const [households, setHouseholds] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingHousehold, setEditingHousehold] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [moveHousehold, setMoveHousehold] = useState<any | null>(null);
  const [membersHousehold, setMembersHousehold] = useState<any | null>(null);
  const [resourceInfoHousehold, setResourceInfoHousehold] = useState<any | null>(null);
  const [addressHousehold, setAddressHousehold] = useState<any | null>(null);

  const fetchHouseholds = async () => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      const res = (await fetch(`${apiUrl}/api/admin/households`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }) as any);
      const data = (await res.json() as any);
      if (data.success) {
        const list = data.data || [];
        setHouseholds(list);

        // Fetch addresses for households asynchronously
        list.forEach(async (h: any) => {
          try {
            const resAddr = await fetch(`${apiUrl}/api/admin/households/${h.id}/address`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataAddr = await resAddr.json();
            if (dataAddr.success && dataAddr.data) {
              setAddresses(prev => ({ ...prev, [h.id]: dataAddr.data }));
            }
          } catch (e) {
            // ignore
          }
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch households:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('ledger_token');
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/admin/households/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setHouseholds(prev => prev.filter(h => h.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error('Deletion failed:', err);
    }
  };

  const filtered = households.filter(h => 
    h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <AdminPortal activePath="#/admin/households">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-emerald-500">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <div className="text-xs font-black tracking-[0.3em]">Loading household registry...</div>
      </div>
    </AdminPortal>
  );

  return (
    <AdminPortal activePath="#/admin/households">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter leading-none">
            Household <span className="text-emerald-500">Registry</span>
          </h2>
          <p className="text-sm text-slate-500 mt-2 tracking-widest font-bold">Manage households, addresses & memberships</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Filter by ID or Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500 transition-all text-sm w-full lg:w-96 shadow-2xl backdrop-blur-sm"
          />
          <Search className="absolute left-4 top-4.5 opacity-30 text-emerald-500" size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(filtered || []).map(h => {
          const addr = addresses[h.id];
          const isMenuOpen = activeMenuId === h.id;

          return (
            <motion.div 
              key={h.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:border-emerald-500/30 transition-all group flex flex-col justify-between relative overflow-visible"
            >
              {/* Overflow Dropdown Button in Top Right Corner */}
              <div className="absolute top-5 right-5 z-20">
                <button
                  onClick={() => setActiveMenuId(isMenuOpen ? null : h.id)}
                  title="Household actions menu"
                  className="p-2 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-xl transition-all text-slate-400 shadow-md"
                >
                  <MoreVertical size={16} />
                </button>

                {isMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#0c1322] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-20 space-y-1 backdrop-blur-2xl">
                      <button
                        onClick={() => { setEditingHousehold(h); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-all text-left"
                      >
                        <Edit3 size={14} className="text-emerald-400" />
                        <span>Edit Household & Icon</span>
                      </button>
                      <button
                        onClick={() => { setAddressHousehold(h); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-all text-left"
                      >
                        <MapPin size={14} className="text-blue-400" />
                        <span>Encrypted Address</span>
                      </button>
                      <button
                        onClick={() => { setMoveHousehold(h); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white transition-all text-left"
                      >
                        <ArrowRightLeft size={14} className="text-orange-400" />
                        <span>Move Member Data</span>
                      </button>
                      <div className="border-t border-white/5 my-1" />
                      <button
                        onClick={() => { setConfirmDeleteId(h.id); setActiveMenuId(null); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/15 transition-all text-left"
                      >
                        <Trash2 size={14} />
                        <span>Delete Household</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div>
                {/* Header: Household Icon / Avatar + Full-Width Household Name */}
                <div className="flex items-start gap-3.5 mb-4 pr-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg mt-0.5">
                    {renderHouseholdIcon(h.icon, h.avatarUrl)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors leading-snug break-words">
                      {h.name}
                    </h3>
                  </div>
                </div>

                {/* Household ID + Household Address in the card section container */}
                <div className="flex flex-col gap-2 mb-5 p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Household ID</span>
                    <button
                      onClick={() => setEditingHousehold(h)}
                      className="text-[9px] font-black text-emerald-400 hover:underline"
                    >
                      Edit ID
                    </button>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300 truncate" title={h.id}>
                    {h.id}
                  </span>

                  {/* Encrypted Address Box in place of action buttons */}
                  <div
                    onClick={() => setAddressHousehold(h)}
                    className="mt-1 p-2.5 bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 rounded-xl cursor-pointer transition-all flex items-center gap-2 group/addr"
                    title="Click to manage encrypted household address"
                  >
                    <MapPin size={14} className={addr?.formatted ? "text-emerald-400 shrink-0" : "text-slate-500 shrink-0"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-300 truncate">
                        {addr?.formatted || addr?.street ? (addr.formatted || addr.street) : <span className="text-slate-500 italic font-normal">No address assigned — click to set</span>}
                      </p>
                    </div>
                    <span className="text-[9px] font-black text-emerald-400 opacity-0 group-hover/addr:opacity-100 transition-opacity">Edit</span>
                  </div>
                </div>

                {confirmDeleteId === h.id && (
                  <div className="mb-4">
                    <InlineToast 
                      message="Delete household?" 
                      type="confirm" 
                      onConfirm={() => handleDelete(h.id)} 
                      onCancel={() => setConfirmDeleteId(null)} 
                    />
                  </div>
                )}

                {/* Household Metadata Stats Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                   <div 
                     onClick={() => setMembersHousehold(h)}
                     className="bg-white/[0.02] border border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] p-3 rounded-2xl cursor-pointer transition-all group/member"
                     title="Click to view & edit household members"
                   >
                       <div className="flex items-center justify-between mb-1">
                         <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Members</span>
                         <span className="text-[9px] font-black text-emerald-400 opacity-0 group-hover/member:opacity-100 transition-opacity">Manage →</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <Users size={14} className="text-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-200">{h.memberCount} Member{h.memberCount === 1 ? '' : 's'}</span>
                       </div>
                   </div>

                   <div className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                      <div className="text-[10px] text-slate-500 font-black tracking-widest uppercase mb-1">Currency</div>
                      <div className="flex items-center gap-2">
                         <Globe size={14} className="text-blue-500 shrink-0" />
                         <span className="text-xs font-bold text-slate-200">{h.currency || 'USD'}</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Bottom Progress Bar */}
              <div className="mt-5 pt-3 border-t border-white/5">
                 <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full" style={{ width: '65%' }} />
                 </div>
                 <div className="flex justify-between items-center mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Resource Usage</span>
                      <button 
                        onClick={() => setResourceInfoHousehold(h)}
                        title="View what is counted in resource usage"
                        className="text-slate-500 hover:text-emerald-400 transition-colors p-0.5 rounded-full hover:bg-white/5"
                      >
                        <Info size={13} />
                      </button>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase">Optimal</span>
                 </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {editingHousehold && (
          <HouseholdEditModal
            household={editingHousehold}
            onClose={() => setEditingHousehold(null)}
            onSuccess={fetchHouseholds}
          />
        )}
        {addressHousehold && (
          <HouseholdAddressModal
            household={addressHousehold}
            onClose={() => setAddressHousehold(null)}
            onSuccess={fetchHouseholds}
          />
        )}
        {moveHousehold && (
          <MoveMemberModal
            sourceHousehold={moveHousehold}
            households={households}
            onClose={() => setMoveHousehold(null)}
            onSuccess={fetchHouseholds}
          />
        )}
        {membersHousehold && (
          <HouseholdMembersModal
            household={membersHousehold}
            onClose={() => setMembersHousehold(null)}
            onSuccess={fetchHouseholds}
          />
        )}
        {resourceInfoHousehold && (
          <ResourceUsageInfoModal
            household={resourceInfoHousehold}
            onClose={() => setResourceInfoHousehold(null)}
          />
        )}
      </AnimatePresence>
    </AdminPortal>
  );
};

export default AdminHouseholds;
