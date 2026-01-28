import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiEndpoints } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';

const AdminCurrencySettings: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { setCurrency, refresh } = useCurrency();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supported, setSupported] = useState<Array<{ code: string; name: string; symbol: string }>>([]);
  const [selected, setSelected] = useState('USD');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [supRes, currRes] = await Promise.all([
          apiEndpoints.currencies.supported?.(),
          apiEndpoints.settings.currency.get()
        ]);
        const currencies = supRes?.data?.data?.currencies || [];
        setSupported(currencies.map((c: any) => ({ code: c.code || c, name: c.name || c.code, symbol: c.symbol || '' })));
        const def = currRes?.data?.data?.currency?.defaultCurrency || 'USD';
        setSelected(def);
      } catch (e: any) {
        showNotification('Failed to load currency settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showNotification]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await apiEndpoints.settings.currency.update({ defaultCurrency: selected });
      if (res?.data?.success) {
        setCurrency(selected);
        await refresh();
        showNotification('Default currency updated', 'success');
      } else {
        showNotification(res?.data?.message || 'Failed to update currency', 'error');
      }
    } catch (e: any) {
      showNotification('Failed to update currency', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-600">You must be an admin to manage currency settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <span>Loading currency settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Admin: Currency Settings</h1>
      <p className="text-gray-600 mb-6">Select the site’s default display currency.</p>

      <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
      >
        {supported.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} {c.symbol ? `(${c.symbol})` : ''} – {c.name}
          </option>
        ))}
      </select>

      <div className="mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default AdminCurrencySettings;