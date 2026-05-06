import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTRPC } from '~/trpc/react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useAdmin } from '~/store/useAdminStore';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/blog/create')({
  component: CreateBlogPostPage,
});

interface BlogPostForm {
  title: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  tags: string;
  metaTitle?: string;
  metaDescription?: string;
  published: boolean;
}

function CreateBlogPostPage() {
  const navigate = useNavigate();
  const { adminToken } = useAdmin();
  const trpc = useTRPC();
  
  const { register, handleSubmit, formState: { errors } } = useForm<BlogPostForm>({
    defaultValues: {
      published: false,
    },
  });

  const createMutation = useMutation(
    trpc.createBlogPost.mutationOptions({
      onSuccess: () => {
        toast.success('Blog post created successfully');
        navigate({ to: '/admin/blog' });
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create blog post');
      },
    })
  );

  const onSubmit = (data: BlogPostForm) => {
    createMutation.mutate({
      adminToken,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      featuredImage: data.featuredImage || undefined,
      tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
      metaTitle: data.metaTitle || undefined,
      metaDescription: data.metaDescription || undefined,
      published: data.published,
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-white p-8">
      <AdminTopBar title="Create Blog Post" />

      <div className="max-w-4xl mx-auto mt-8">
        <Link
          to="/admin/blog"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Back to Blog Manager
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors"
              placeholder="The Future of Decentralized Betting"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Excerpt <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('excerpt', { required: 'Excerpt is required' })}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors resize-none"
              placeholder="A brief summary of the post..."
            />
            {errors.excerpt && (
              <p className="text-red-500 text-sm mt-1">{errors.excerpt.message}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Content (Markdown) <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('content', { required: 'Content is required' })}
              rows={20}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors resize-none font-mono text-sm"
              placeholder="# Heading&#10;&#10;Your content here..."
            />
            {errors.content && (
              <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tags (comma-separated)
            </label>
            <input
              {...register('tags')}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors"
              placeholder="Web3, Blockchain, DeFi"
            />
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Featured Image URL
            </label>
            <input
              {...register('featuredImage')}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          {/* SEO Section */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-lg font-syne font-bold mb-4">SEO Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Meta Title
                </label>
                <input
                  {...register('metaTitle')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors"
                  placeholder="Leave empty to use post title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Meta Description
                </label>
                <textarea
                  {...register('metaDescription')}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-brand-green focus:ring-1 focus:ring-brand-green outline-none transition-colors resize-none"
                  placeholder="Leave empty to use excerpt"
                />
              </div>
            </div>
          </div>

          {/* Publish Checkbox */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              {...register('published')}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <label className="text-sm font-medium">
              Publish immediately
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4 pt-6">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-8 py-3 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Post'}
            </button>
            <Link
              to="/admin/blog"
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
