import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  domain: string;
  licenseCount: number;
  used: number;
  available: number;
  admins: AdminUser[];
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = '/api';

const SystemAdmin: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const globalAdminEmail = process.env.REACT_APP_GLOBAL_ADMIN_EMAIL;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', firstName: '', lastName: '', password: '' });
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showCreateCompany, setShowCreateCompany] = useState<boolean>(false);
  const [newCompanyData, setNewCompanyData] = useState({ name: '', domain: '', licenseCount: 0 });

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.email !== globalAdminEmail) {
      navigate('/', { replace: true });
      return;
    }
    fetchCompanies();
  }, [user, token]);

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/sysadmin/companies`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch companies');
      setCompanies(data.companies);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleDelta = async (companyId: string, delta: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sysadmin/companies/${companyId}/licenses`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update licenses');
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, licenseCount: data.licenseCount, used: data.used, available: data.available } : c));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error updating licenses');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sysadmin/companies/${selectedCompany}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create admin');
      fetchCompanies();
      setSelectedCompany(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating admin');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/sysadmin/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newCompanyData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create company');
      setCompanies(prev => [...prev, data]);
      setShowCreateCompany(false);
      setNewCompanyData({ name: '', domain: '', licenseCount: 0 });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating company');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-6">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-secondary dark:text-dark-text">System Administration</h1>
        <button
          onClick={() => setShowCreateCompany(true)}
          className="py-2 px-4 bg-primary text-white rounded hover:bg-blue-600 transition-colors"
        >
          Create Company
        </button>
      </div>
      {showCreateCompany && (
        <div className="max-w-md bg-white dark:bg-dark-surface p-6 mb-6 rounded shadow">
          <h2 className="text-lg font-semibold text-secondary dark:text-dark-text mb-4">New Company</h2>
          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                name="name"
                required
                value={newCompanyData.name}
                onChange={e => setNewCompanyData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Domain</label>
              <input
                name="domain"
                required
                value={newCompanyData.domain}
                onChange={e => setNewCompanyData(prev => ({ ...prev, domain: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Licenses</label>
              <input
                name="licenseCount"
                type="number"
                required
                min={0}
                value={newCompanyData.licenseCount}
                onChange={e => setNewCompanyData(prev => ({ ...prev, licenseCount: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCreateCompany(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600"
              >
                {actionLoading ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full bg-white dark:bg-dark-surface text-secondary dark:text-dark-text">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Company</th>
              <th className="px-4 py-2 text-left">Domain</th>
              <th className="px-4 py-2 text-left">Licenses (Used/Total)</th>
              <th className="px-4 py-2 text-left">Available</th>
              <th className="px-4 py-2 text-left">Admin Accounts</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(c => (
              <tr key={c.id} className="border-t border-gray-200 dark:border-dark-border">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">{c.domain}</td>
                <td className="px-4 py-2">{c.used}/{c.licenseCount}</td>
                <td className="px-4 py-2">{c.available}</td>
                <td className="px-4 py-2">
                  {c.admins.length <= 1 ? (
                    c.admins.map(a => (
                      <div key={a.id} className="mb-1">
                        {a.firstName} {a.lastName} ({a.email})
                      </div>
                    ))
                  ) : (
                    <details className="group">
                      <summary className="cursor-pointer text-secondary dark:text-dark-text">
                        {c.admins.length} Admins
                      </summary>
                      <div className="mt-2 space-y-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded p-2">
                        {c.admins.map(a => (
                          <div key={a.id} className="text-sm">
                            {a.firstName} {a.lastName} ({a.email})
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button disabled={actionLoading} onClick={() => handleDelta(c.id, 1)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">+1</button>
                  <button disabled={actionLoading} onClick={() => handleDelta(c.id, -1)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600">-1</button>
                  <button onClick={() => { setSelectedCompany(c.id); setFormData({ email: '', firstName: '', lastName: '', password: '' }); }} className="px-3 py-1 bg-primary text-white rounded hover:bg-blue-600">Create Admin</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCompany && (
        <div className="max-w-md bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-secondary dark:text-dark-text mb-4">Create Admin for Company</h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <input
                name="firstName"
                required
                value={formData.firstName}
                onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <input
                name="lastName"
                required
                value={formData.lastName}
                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setSelectedCompany(null)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600">{actionLoading ? 'Saving...' : 'Create Admin'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SystemAdmin; 