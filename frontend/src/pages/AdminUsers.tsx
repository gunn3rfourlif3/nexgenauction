import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiEndpoints } from '../services/api';
import { Search, Shield, UserCheck } from 'lucide-react';

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin' | 'super';
  isActive: boolean;
  permissions?: { canSell?: boolean; canBid?: boolean; canModerate?: boolean };
  createdAt?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showNotification } = useNotification();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = !!user && user.role !== 'user';
  const isSuper = !!user && user.role === 'super';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      showNotification('Please log in', 'error');
      navigate('/login');
      return;
    }
    if (!isAdmin) {
      showNotification('Access denied. Admins only.', 'error');
      navigate('/dashboard');
    }
  }, [isLoading, isAuthenticated, isAdmin, navigate, showNotification]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit, search, sortBy: 'createdAt', sortOrder: 'desc' as const };
      const res = await apiEndpoints.auth.getUsers(params);
      const data = res.data?.data || {};
      setUsers(data.users || []);
      setPagination(data.pagination || null);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to load users';
      showNotification(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, showNotification]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchUsers();
    }
  }, [fetchUsers, isAuthenticated, isAdmin]);

  const handlePromote = async (u: AdminUser) => {
    try {
      setActionLoading(u._id);
      const res = await apiEndpoints.auth.promoteToAdmin(u._id);
      const updated = res.data?.data?.user as AdminUser;
      setUsers(prev => prev.map(x => (x._id === u._id ? { ...x, role: updated.role } : x)));
      showNotification(`${u.username} promoted to admin`, 'success');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Promotion failed';
      showNotification(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (u: AdminUser, role: 'user' | 'admin' | 'super') => {
    try {
      setActionLoading(u._id);
      const res = await apiEndpoints.auth.updateUserRole(u._id, role);
      const updated = res.data?.data?.user as AdminUser;
      setUsers(prev => prev.map(x => (x._id === u._id ? { ...x, role: updated.role } : x)));
      showNotification(`${u.username} role updated to ${role}`, 'success');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Role update failed';
      showNotification(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermissionsToggle = async (u: AdminUser, key: 'canSell' | 'canBid' | 'canModerate', value: boolean) => {
    try {
      setActionLoading(u._id);
      const res = await apiEndpoints.auth.updateUserPermissions(u._id, { [key]: value });
      const updated = res.data?.data?.user as AdminUser;
      setUsers(prev => prev.map(x => (x._id === u._id ? { ...x, permissions: updated.permissions } : x)));
      showNotification(`${u.username} permission ${key} ${value ? 'enabled' : 'disabled'}`, 'success');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Permission update failed';
      showNotification(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleActive = async (u: AdminUser) => {
    try {
      setActionLoading(u._id);
      const res = await apiEndpoints.auth.updateUserStatus(u._id, !u.isActive);
      const updated = res.data?.data?.user as AdminUser;
      setUsers(prev => prev.map(x => (x._id === u._id ? { ...x, isActive: updated.isActive } : x)));
      showNotification(`${u.username} ${updated.isActive ? 'activated' : 'deactivated'}`, 'success');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Status update failed';
      showNotification(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Admin: User Management</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email"
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => { setPage(1); fetchUsers(); }}
            className="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
          >Search</button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No users found</td></tr>
            ) : (
              users.map(u => (
                <tr key={u._id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{u.username}</div>
                        <div className="text-xs text-gray-500">{u.firstName} {u.lastName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{u.email}</td>
                  <td className="px-6 py-4">
                    {isSuper ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value as AdminUser['role'])}
                        disabled={!!actionLoading}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="super">super</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${u.role === 'super' ? 'bg-yellow-100 text-yellow-800' : u.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        <Shield className="w-3 h-3 mr-1" />{u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3 items-center">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!u.permissions?.canSell}
                          onChange={(e) => handlePermissionsToggle(u, 'canSell', e.target.checked)}
                          disabled={!!actionLoading || !isAdmin}
                        />
                        <span>Sell</span>
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!u.permissions?.canBid}
                          onChange={(e) => handlePermissionsToggle(u, 'canBid', e.target.checked)}
                          disabled={!!actionLoading || !isAdmin}
                        />
                        <span>Bid</span>
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!u.permissions?.canModerate}
                          onChange={(e) => handlePermissionsToggle(u, 'canModerate', e.target.checked)}
                          disabled={!!actionLoading || !isAdmin}
                        />
                        <span>Moderate</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {isSuper && u.role === 'user' && (
                        <button
                          onClick={() => handlePromote(u)}
                          disabled={!!actionLoading}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >Promote</button>
                      )}
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={!!actionLoading}
                        className={`px-3 py-1.5 rounded text-xs text-white ${u.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                      >{u.isActive ? 'Deactivate' : 'Activate'}</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalUsers} users</div>
          <div className="flex gap-2">
            <button
              onClick={() => { if (pagination.hasPrevPage) { setPage(p => p - 1); } }}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 border rounded text-sm disabled:opacity-50"
            >Previous</button>
            <button
              onClick={() => { if (pagination.hasNextPage) { setPage(p => p + 1); } }}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 border rounded text-sm disabled:opacity-50"
            >Next</button>
            <select
              value={limit}
              onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
              className="px-2 py-2 border rounded text-sm"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;