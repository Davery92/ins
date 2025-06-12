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

interface CreateUserForm {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
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
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createLoading, setCreateLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    firstName: '',
    lastName: '',
    password: ''
  });

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user, token, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to fetch users (${res.status})`);
      }
      
      // Handle new response structure
      setUsers(data.users);
      if (data.licenseInfo) {
        setLicenseCount(data.licenseInfo.total);
        setUsed(data.licenseInfo.used);
        setAvailable(data.licenseInfo.available);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const activateUser = async (userId: string) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/admin/users/${userId}/activate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to activate user');
      
      // Refresh users list to get updated counts
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error activating user');
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/admin/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to deactivate user');
      
      // Refresh users list to get updated counts
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deactivating user');
    }
  };

  const changeUserPassword = async (userId: string, newPassword: string) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error('Failed to change user password');
      
      alert('User password changed successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error changing user password');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete user');
      
      // Refresh users list to get updated counts
      await fetchUsers();
      alert('User deleted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting user');
    }
  };

  const handlePasswordChange = (userId: string) => {
    const newPassword = prompt('Enter new password (minimum 6 characters):');
    if (newPassword && newPassword.length >= 6) {
      changeUserPassword(userId, newPassword);
    } else if (newPassword !== null) {
      alert('Password must be at least 6 characters long');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL || '/api'}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      
      // Reset form and refresh users list
      setFormData({ email: '', firstName: '', lastName: '', password: '' });
      setShowCreateForm(false);
      await fetchUsers();
      
      alert('User created successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error creating user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
        <div className="flex items-center gap-4">
          <div className="text-sm text-secondary dark:text-dark-text">
            Licenses: {used}/{licenseCount} used; Available: {available}
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors"
          >
            Create User
          </button>
        </div>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="mb-6 bg-white dark:bg-dark-surface p-6 rounded-lg shadow-md border border-gray-200 dark:border-dark-border">
          <h2 className="text-lg font-semibold text-secondary dark:text-dark-text mb-4">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                placeholder="john.doe@company.com"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Email must match your company domain
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ email: '', firstName: '', lastName: '', password: '' });
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
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
                  <div className="flex flex-wrap gap-1">
                    {u.status === 'pending' ? (
                      available > 0 ? (
                        <button
                          onClick={() => activateUser(u.id)}
                          className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Assign License
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded cursor-not-allowed"
                        >
                          No Licenses
                        </button>
                      )
                    ) : u.status === 'active' ? (
                      <button
                        onClick={() => deactivateUser(u.id)}
                        className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      >
                        Revoke License
                      </button>
                    ) : null}
                    
                    {u.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => handlePasswordChange(u.id)}
                          className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                        >
                          Change Password
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
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