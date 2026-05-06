import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useAdmin } from '~/store/useAdminStore';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/admin/careers/create')({
  component: CreateJobPositionPage,
});

interface JobPositionForm {
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string;
  isOpen: boolean;
}

function CreateJobPositionPage() {
  const navigate = useNavigate();
  const { adminToken } = useAdmin();
  const trpc = useTRPC();
  
  const { register, handleSubmit, formState: { errors } } = useForm<JobPositionForm>({
    defaultValues: {
      isOpen: true,
    },
  });

  const createMutation = useMutation(
    trpc.createJobPosition.mutationOptions({
      onSuccess: () => {
        toast.success('Job position created successfully');
        navigate({ to: '/admin/careers' });
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create job position');
      },
    })
  );

  const onSubmit = (data: JobPositionForm) => {
    createMutation.mutate({
      adminToken,
      ...data,
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white p-8">
      <AdminTopBar title="Create Job Position" />

      <div className="max-w-4xl mx-auto mt-8">
        <Link
          to="/admin/careers"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Back to Careers Manager
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors"
              placeholder="Senior Solidity Developer"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <input
              {...register('department', { required: 'Department is required' })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors"
              placeholder="Engineering"
            />
            {errors.department && (
              <p className="text-red-500 text-sm mt-1">{errors.department.message}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              {...register('location', { required: 'Location is required' })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors"
              placeholder="Remote"
            />
            {errors.location && (
              <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Employment Type <span className="text-red-500">*</span>
            </label>
            <input
              {...register('type', { required: 'Type is required' })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors"
              placeholder="Full-time"
            />
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Job Description (Markdown) <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={15}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors resize-none font-mono text-sm"
              placeholder="# Job Title&#10;&#10;## About the Role&#10;&#10;Description here..."
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Requirements & Benefits (Markdown) <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('requirements', { required: 'Requirements are required' })}
              rows={15}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors resize-none font-mono text-sm"
              placeholder="## Requirements&#10;&#10;- Requirement 1&#10;- Requirement 2&#10;&#10;## Benefits&#10;&#10;- Benefit 1&#10;- Benefit 2"
            />
            {errors.requirements && (
              <p className="text-red-500 text-sm mt-1">{errors.requirements.message}</p>
            )}
          </div>

          {/* Open Status Checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('isOpen')}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <label className="text-sm font-medium">
              Position is open for applications
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4 pt-6">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-8 py-3 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Position'}
            </button>
            <Link
              to="/admin/careers"
              className="px-8 py-3 bg-white/5 border border-white/10 font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
