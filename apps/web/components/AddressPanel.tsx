import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Edit3, Trash2, Check, X, Search, Loader2 } from 'lucide-react';
import { getApiUrl } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { formatHumanError } from '../utils/error-handler';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { InlineToast } from './ui/InlineToast';

const API_URL = getApiUrl();

interface AddressPanelProps {
  householdId: string;
  userRole: string;
}

interface AddressData {
  street?: string | null;
  unit?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  formatted?: string | null;
}

interface Suggestion {
  placeId: string;
  formatted: string;
  mainText: string;
  secondaryText: string;
}

export const AddressPanel: React.FC<AddressPanelProps> = ({ householdId, userRole }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<AddressData | null>(null);
  const [access, setAccess] = useState<'read-write' | 'read-only'>('read-only');
  const [hidden, setHidden] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Form State
  const [street, setStreet] = useState('');
  const [unit, setUnit] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  // Autocomplete State
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const searchTimeoutRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAddress = async () => {
    if (!householdId) return;
    setLoading(true);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}/address`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = (await res.json()) as any;
        if (result.hidden) {
          setHidden(true);
        } else {
          setHidden(false);
          setAddress(result.data || null);
          setAccess(result.access || (userRole === 'owner' || userRole === 'admin' ? 'read-write' : 'read-only'));
        }
      }
    } catch (err) {
      console.error('Failed to fetch address:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddress();
  }, [householdId, userRole]);

  const startEditing = () => {
    setStreet(address?.street || '');
    setUnit(address?.unit || '');
    setCity(address?.city || '');
    setStateVal(address?.state || '');
    setPostalCode(address?.postalCode || '');
    setCountry(address?.country || '');
    setQuery('');
    setSuggestions([]);
    setSessionToken(crypto.randomUUID());
    setIsEditing(true);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      const token = localStorage.getItem('ledger_token');
      try {
        const res = await fetch(`${API_URL}/api/address/autocomplete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: val.trim(),
            sessionToken
          })
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          setSuggestions(data.suggestions || []);
          setShowDropdown(true);
        }
      } catch (e) {
        console.error('Autocomplete request failed:', e);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSelectSuggestion = async (s: Suggestion) => {
    setShowDropdown(false);
    setQuery(s.formatted);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/address/place-details`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          placeId: s.placeId,
          sessionToken
        })
      });
      if (res.ok) {
        const result = (await res.json()) as any;
        const details = result.data;
        if (details) {
          if (details.street) setStreet(details.street);
          if (details.city) setCity(details.city);
          if (details.state) setStateVal(details.state);
          if (details.postalCode) setPostalCode(details.postalCode);
          if (details.country) setCountry(details.country);
        }
      }
    } catch (e) {
      console.error('Failed to get place details:', e);
    } finally {
      setSessionToken(crypto.randomUUID());
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('ledger_token');
    const formattedParts = [
      street ? (unit ? `${street}, ${unit}` : street) : '',
      city,
      stateVal,
      postalCode,
      country
    ].filter(Boolean);
    const formatted = formattedParts.join(', ');

    const payload: AddressData = {
      street: street.trim() || null,
      unit: unit.trim() || null,
      city: city.trim() || null,
      state: stateVal.trim() || null,
      postalCode: postalCode.trim() || null,
      country: country.trim() || null,
      formatted: formatted || null
    };

    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}/address`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Household address updated', 'success');
        setIsEditing(false);
        fetchAddress();
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to update address'), 'error');
      }
    } catch (err: any) {
      showToast(formatHumanError(err, 'Network error saving address'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    const token = localStorage.getItem('ledger_token');
    try {
      const res = await fetch(`${API_URL}/api/user/households/${householdId}/address`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(null)
      });

      if (res.ok) {
        showToast('Household address removed', 'success');
        setConfirmDelete(false);
        setIsEditing(false);
        fetchAddress();
      } else {
        const err = await res.json();
        showToast(formatHumanError(err, 'Failed to remove address'), 'error');
      }
    } catch (err: any) {
      showToast(formatHumanError(err, 'Network error removing address'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse">
        <div className="h-4 w-32 bg-white/10 rounded mb-2" />
        <div className="h-3 w-48 bg-white/5 rounded" />
      </div>
    );
  }

  if (hidden) return null;

  const isEditable = access === 'read-write';

  return (
    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4 hover:border-emerald-500/20 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-emerald-500" />
          <h4 className="text-sm font-black tracking-widest text-emerald-500">Household Address</h4>
        </div>
        {isEditable && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={startEditing}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-all"
              title="Edit Address"
            >
              <Edit3 size={14} />
            </button>
            {address && (
              confirmDelete ? (
                <InlineToast
                  message="Remove address?"
                  type="confirm"
                  onConfirm={handleDelete}
                  onCancel={() => setConfirmDelete(false)}
                />
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Remove Address"
                >
                  <Trash2 size={14} />
                </button>
              )
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 pt-2">
          {/* Autocomplete Search Input */}
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search address with Google Maps..."
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-emerald-500/50"
              />
              {searching && (
                <Loader2 size={14} className="absolute right-3 top-3 text-emerald-500 animate-spin" />
              )}
            </div>

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.placeId}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-500/10 border-b border-white/5 last:border-0 transition-colors flex flex-col"
                  >
                    <span className="text-xs font-bold text-white">{s.mainText || s.formatted}</span>
                    {s.secondaryText && (
                      <span className="text-[10px] text-slate-400 font-medium">{s.secondaryText}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Structured Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black tracking-widest text-secondary mb-1">STREET ADDRESS</label>
              <Input
                value={street}
                onChange={e => setStreet(e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black tracking-widest text-secondary mb-1">APT / SUITE / UNIT</label>
              <Input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="Apt 4B"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black tracking-widest text-secondary mb-1">CITY</label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black tracking-widest text-secondary mb-1">STATE / PROVINCE</label>
              <Input
                value={stateVal}
                onChange={e => setStateVal(e.target.value)}
                placeholder="State"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black tracking-widest text-secondary mb-1">POSTAL / ZIP CODE</label>
              <Input
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
                placeholder="10001"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black tracking-widest text-secondary mb-1">COUNTRY</label>
              <Input
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="United States"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Address'}
            </Button>
          </div>
        </div>
      ) : address && address.formatted ? (
        <div className="space-y-1">
          <p className="text-sm font-bold text-white tracking-tight leading-relaxed">
            {address.formatted}
          </p>
          <p className="text-[10px] text-slate-500 font-bold tracking-wider">
            Encrypted & stored in household vault
          </p>
        </div>
      ) : isEditable ? (
        <div className="p-6 border-2 border-dashed border-white/5 rounded-xl text-center space-y-2">
          <p className="text-xs font-bold text-slate-500">No address assigned to this household</p>
          <button
            onClick={startEditing}
            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-black rounded-lg transition-all"
          >
            + Add Address
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No address on file</p>
      )}
    </div>
  );
};
