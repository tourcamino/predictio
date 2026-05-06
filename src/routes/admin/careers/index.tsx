import { createFileRoute, Link } from '@tanstack/react-router';
import { useTRPC } from '~/trpc/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useAdmin } from '~/store/useAdminStore';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/admin/careers/')({
  component: CareersManagerPage,
});

function CareersManagerPage() {
  const { adminToken } = useAdmin();
  const trpc = useTRPC();
  
  const { data: positions, isLoading, refetch } = useQuery(
    trpc.getJobPositions.queryOptions({
      isOpen: undefined as any, // Get all positions
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteJobPosition.mutationOptions({
      onSuccess: () => {
        toast.success('Job position deleted');
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete position');
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateJobPosition.mutationOptions({
      onSuccess: () => {
        toast.success('Position updated');
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update position');
      },
    })
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this job position?')) {
      deleteMutation.mutate({ adminToken, id });
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    updateMutation.mutate({
      adminToken,
      id,
      isOpen: !currentStatus,
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white p-8">
      <AdminTopBar title="Careers Manager" />

      <div className="max-w-7xl mx-auto mt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-syne font-bold">Job Positions</h2>
            <p className="text-gray-400 text-sm mt-1">
              Manage open positions and hiring
            </p>
          </div>
          <Link
            to="/admin/careers/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            <PlusCircle size={20} />
            Create New Position
          </Link>
        </div>

        {/* Positions Table */}
        {isLoading ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/10 rounded"></div>
              ))}
            </div>
          </div>
        ) : positions && positions.length > 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Department</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Location</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {positions.map((position) => (
                  <tr key={position.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{position.title}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {position.department}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {position.location}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {position.type}
                    </td>
                    <td className="px-6 py-4">
                      {position.isOpen ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-500">
                          <CheckCircle size={12} />
                          Open
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/10 border border-gray-500/30 rounded text-xs text-gray-400">
                          <XCircle size={12} />
                          Closed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(position.id, position.isOpen)}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                          title={position.isOpen ? 'Close position' : 'Open position'}
                        >
                          {position.isOpen ? (
                            <XCircle size={18} className="text-gray-400" />
                          ) : (
                            <CheckCircle size={18} className="text-gray-400" />
                          )}
                        </button>
                        <Link
                          to="/admin/careers/edit/$id"
                          params={{ id: position.id }}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} className="text-gray-400" />
                        </Link>
                        <button
                          onClick={() => handleDelete(position.id)}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-4">No job positions yet</p>
            <Link
              to="/admin/careers/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              <PlusCircle size={20} />
              Create First Position
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
