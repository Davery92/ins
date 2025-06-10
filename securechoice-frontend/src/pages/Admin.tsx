import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface CompanyUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'pending' | 'active' | 'disabled';
  role: 'user' | 'admin';
  createdAt: string;
}

const Admin: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [licenseCount, setLicenseCount] = useState<number>(0);
  const [used, setUsed] = useState<number>(0);
  const [available, setAvailable] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/admin/users`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Failed to fetch users (${res.status})`);
        }
        const { users: fetchedUsers, licenseCount, used, available } = data;
        setUsers(fetchedUsers);
        setLicenseCount(licenseCount);
        setUsed(used);
        setAvailable(available);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user, token, navigate]);

  const activateUser = async (userId: string) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/admin/users/${userId}/assign-license`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to activate user');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
      setUsed(prev => prev + 1);
      setAvailable(prev => prev - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error activating user');
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
        <h1 className="text-2xl font-bold text-secondary dark:text-dark-text">Company Users</h1>
        <div className="text-sm text-secondary dark:text-dark-text">
          Licenses: {used}/{licenseCount} used; Available: {available}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-dark-surface text-secondary dark:text-dark-text">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Joined</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-gray-200 dark:border-dark-border">
                <td className="px-4 py-2">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2 capitalize">{u.role}</td>
                <td className="px-4 py-2 capitalize">{u.status}</td>
                <td className="px-4 py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  {u.status === 'pending' ? (
                    available > 0 ? (
                      <button
                        onClick={() => activateUser(u.id)}
                        className="px-3 py-1 bg-primary text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        Assign License
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1 bg-gray-500 text-white rounded cursor-not-allowed"
                      >
                        No Licenses
                      </button>
                    )
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin; 