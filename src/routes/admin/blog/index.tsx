import { createFileRoute, Link } from '@tanstack/react-router';
import { useTRPC } from '~/trpc/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlusCircle, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useAdmin } from '~/store/useAdminStore';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/admin/blog/')({
  component: BlogManagerPage,
});

function BlogManagerPage() {
  const { adminToken } = useAdmin();
  const trpc = useTRPC();
  
  const { data, isLoading, refetch } = useQuery(
    trpc.getBlogPosts.queryOptions({
      published: undefined as any, // Get all posts
      limit: 100,
      offset: 0,
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteBlogPost.mutationOptions({
      onSuccess: () => {
        toast.success('Blog post deleted');
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to delete post');
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateBlogPost.mutationOptions({
      onSuccess: () => {
        toast.success('Post updated');
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update post');
      },
    })
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      deleteMutation.mutate({ adminToken, id });
    }
  };

  const handleTogglePublish = (id: string, currentStatus: boolean) => {
    updateMutation.mutate({
      adminToken,
      id,
      published: !currentStatus,
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white p-8">
      <AdminTopBar title="Blog Manager" />

      <div className="max-w-7xl mx-auto mt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-syne font-bold">Blog Posts</h2>
            <p className="text-gray-400 text-sm mt-1">
              Manage your blog content and SEO settings
            </p>
          </div>
          <Link
            to="/admin/blog/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            <PlusCircle size={20} />
            Create New Post
          </Link>
        </div>

        {/* Posts Table */}
        {isLoading ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white/10 rounded"></div>
              ))}
            </div>
          </div>
        ) : data && data.posts.length > 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Tags</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold">Created</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.posts.map((post) => (
                  <tr key={post.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium">{post.title}</div>
                        <div className="text-xs text-gray-500 mt-1">/{post.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {post.published ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-500">
                          <Eye size={12} />
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/10 border border-gray-500/30 rounded text-xs text-gray-400">
                          <EyeOff size={12} />
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-brand-green/10 border border-brand-green/30 rounded text-xs text-brand-green"
                          >
                            {tag}
                          </span>
                        ))}
                        {post.tags.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{post.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTogglePublish(post.id, post.published)}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                          title={post.published ? 'Unpublish' : 'Publish'}
                        >
                          {post.published ? (
                            <EyeOff size={18} className="text-gray-400" />
                          ) : (
                            <Eye size={18} className="text-gray-400" />
                          )}
                        </button>
                        <Link
                          to="/admin/blog/edit/$id"
                          params={{ id: post.id }}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} className="text-gray-400" />
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
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
            <p className="text-gray-400 mb-4">No blog posts yet</p>
            <Link
              to="/admin/blog/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              <PlusCircle size={20} />
              Create First Post
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
