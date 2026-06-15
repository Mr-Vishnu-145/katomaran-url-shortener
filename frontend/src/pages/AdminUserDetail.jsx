import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Shield, Link2, Eye, Calendar, Phone, Mail, ShieldAlert, AlertTriangle, Trash2, ShieldCheck, Activity } from 'lucide-react';
import api from '../api/axios';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Dialog from '../components/ui/Dialog';
import toast from 'react-hot-toast';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userToDelete, setUserToDelete] = useState(null);

  useDocumentTitle('Admin: User Details');

  // Fetch single user detail (includes user metadata and their links)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-user-detail', id],
    queryFn: () => api.get(`/api/admin/users/${id}`).then(res => res.data.data),
  });

  // Toggle user suspension
  const suspendMutation = useMutation({
    mutationFn: ({ isSuspended }) => api.put('/api/admin/users/' + id, { isSuspended }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(res.data.message || 'Operation successful', { duration: 3000 });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Action failed');
    }
  });

  // Delete user account
  const deleteUserMutation = useMutation({
    mutationFn: () => api.delete('/api/admin/users/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      toast.success('User account deleted successfully');
      navigate('/admin');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete user');
    }
  });

  // Delete a specific link created by this user
  const deleteUrlMutation = useMutation({
    mutationFn: (urlId) => api.delete('/api/admin/urls/' + urlId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-urls'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      toast.success('Link deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete link');
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-150 mb-2">User details not found</h2>
        <p className="text-sm text-slate-500 mb-6">The requested user account does not exist or has been deleted from database.</p>
        <Link to="/admin">
          <Button variant="secondary" className="flex gap-2 items-center">
            <ArrowLeft size={16} /> Back to Admin Panel
          </Button>
        </Link>
      </div>
    );
  }

  const { user, urls } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <div>
        <Link to="/admin" className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors mb-2 w-fit">
          <ArrowLeft size={14} /> Back to Administration
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-50 flex items-center gap-2">
          <User size={24} className="text-primary" /> User Details & Links
        </h1>
        <p className="text-sm text-slate-500">
          Detailed overview of user account status, registrations, and short campaign codes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User profile card */}
        <Card className="md:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Account Profile</h2>
            <div>
              {user.status === 'deleted' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-rose-500/10 text-rose-500 border-rose-500/25">
                  Deleted
                </span>
              ) : user.is_suspended || user.status === 'suspended' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-amber-500/10 text-amber-500 border-amber-500/25">
                  Suspended
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-100 dark:border-emerald-950/30">
                  Active
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
              <span className="text-sm text-slate-800 dark:text-slate-100">{user.full_name || 'N/A (Deleted)'}</span>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Email Address</span>
              <span className="text-sm text-slate-800 dark:text-slate-100 font-mono">{user.email}</span>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400">Mobile Number</span>
              <span className="text-sm text-slate-800 dark:text-slate-100">{user.mobile_number || 'N/A (Deleted)'}</span>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400">System Role</span>
              <span className="text-sm text-slate-800 dark:text-slate-100 capitalize">{user.role}</span>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400">Auth Method</span>
              <span className="text-sm text-slate-800 dark:text-slate-100 uppercase">{user.auth_provider}</span>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase font-bold text-slate-400">Created Date</span>
              <span className="text-sm text-slate-800 dark:text-slate-100">{new Date(user.created_at).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* User quick actions */}
        <Card className="flex flex-col gap-4">
          <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Moderator Actions</h2>
          </div>

          <div className="flex flex-col gap-3 h-full justify-center">
            {user.role === 'admin' ? (
              <div className="flex flex-col gap-2 items-center text-center p-4">
                <ShieldCheck size={36} className="text-primary mb-2 animate-pulse" />
                <span className="text-xs font-bold">Admin Account Protected</span>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 max-w-xs">Administration accounts are protected from suspension and soft-deletion moderations.</p>
              </div>
            ) : user.status === 'deleted' ? (
              <div className="flex flex-col gap-2 items-center text-center p-4">
                <ShieldAlert size={36} className="text-rose-500 mb-2" />
                <span className="text-xs font-bold text-rose-500">Account Permanently Deleted</span>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 max-w-xs">This account has been completely wiped. No further active moderation actions can be executed.</p>
              </div>
            ) : (
              <>
                <Button
                  variant={user.is_suspended ? 'secondary' : 'danger'}
                  onClick={() => suspendMutation.mutate({ isSuspended: !user.is_suspended })}
                  disabled={suspendMutation.isPending}
                  className="w-full font-bold text-xs"
                >
                  {user.is_suspended ? 'Activate User Account' : 'Suspend User Account'}
                </Button>
                <Button
                  variant="danger"
                  className="w-full font-bold text-xs bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700"
                  onClick={() => setUserToDelete(user)}
                  disabled={deleteUserMutation.isPending}
                >
                  Delete User Account
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* User Short codes / Links table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-850 dark:text-slate-50">Shortened Links Created By User ({urls.length})</h3>
        </div>
        <div className="overflow-x-auto">
          {urls.length === 0 ? (
            <div className="p-8 text-center text-slate-450 text-sm font-semibold">
              This user has not created any shortened links yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-bold uppercase">
                  <th className="pb-3 px-3 pt-3">Short code</th>
                  <th className="pb-3 px-3 pt-3">Original URL</th>
                  <th className="pb-3 px-3 pt-3">Clicks</th>
                  <th className="pb-3 px-3 pt-3">Created Date</th>
                  <th className="pb-3 px-3 pt-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {urls.map((url) => {
                  const isExpired = url.expires_at && new Date(url.expires_at) < new Date();
                  return (
                    <tr key={url.id} className="text-slate-700 dark:text-slate-300">
                      <td className="py-3 px-3 font-mono">
                        <Link to={'/urls/' + url.id} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-450 dark:hover:text-emerald-350 hover:underline font-bold">
                          /{url.short_code}
                        </Link>
                      </td>
                      <td className="py-3 px-3 truncate max-w-xs text-xs">{url.original_url}</td>
                      <td className="py-3 px-3 font-semibold">{url.click_count}</td>
                      <td className="py-3 px-3">{new Date(url.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="danger"
                          className="p-1 px-3 text-xs leading-none"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this link as an administrator?')) {
                              deleteUrlMutation.mutate(url.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title="Delete User Account"
      >
        {userToDelete && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 p-3.5 rounded-xl mt-1">
              <ShieldAlert size={20} className="shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold uppercase tracking-wider">Warning: Irreversible Action</span>
                <p className="text-[10px] leading-normal font-medium opacity-90">
                  This will permanently delete the user account for <strong className="font-extrabold">{userToDelete.email}</strong>, all their shortened links, and click telemetry.
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 dark:text-slate-350">
              Are you sure you want to proceed with deleting this user? An audit log will be created in the database.
            </p>

            <div className="flex justify-end gap-2.5 mt-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <Button 
                variant="secondary" 
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="danger" 
                onClick={() => {
                  deleteUserMutation.mutate();
                  setUserToDelete(null);
                }}
                disabled={deleteUserMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
