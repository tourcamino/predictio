import { createFileRoute, Link } from '@tanstack/react-router';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Tag, ArrowRight } from 'lucide-react';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';

export const Route = createFileRoute('/blog/')({
  component: BlogPage,
});

function BlogPage() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.getBlogPosts.queryOptions({
      published: true,
      limit: 50,
      offset: 0,
    })
  );

  const featuredPost = data?.posts[0];
  const remainingPosts = data?.posts.slice(1) || [];

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl lg:text-5xl font-syne font-bold mb-4">
            Predictio Blog
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl">
            Expert analysis, market insights, and the latest updates from the world of 
            decentralized prediction markets and sports betting.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {/* Featured Post Skeleton */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[21/9] bg-white/10"></div>
              <div className="p-8">
                <div className="h-8 bg-white/10 rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-white/10 rounded mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-2/3"></div>
              </div>
            </div>
            
            {/* Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse"
                >
                  <div className="aspect-video bg-white/10"></div>
                  <div className="p-6">
                    <div className="h-6 bg-white/10 rounded mb-4"></div>
                    <div className="h-4 bg-white/10 rounded mb-2"></div>
                    <div className="h-4 bg-white/10 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : data && data.posts.length > 0 ? (
          <div className="space-y-12">
            {/* Featured Post Hero */}
            {featuredPost && (
              <Link
                to="/blog/$slug"
                params={{ slug: featuredPost.slug }}
                className="block group"
              >
                <article className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-brand-green/50 transition-all duration-300">
                  {/* Featured Image with Gradient Overlay */}
                  <div className="relative aspect-[21/9] overflow-hidden">
                    <img
                      src={featuredPost.featuredImage || `https://via.placeholder.com/1200x630/0A0F1E/00FFA3?text=${encodeURIComponent(featuredPost.title)}`}
                      alt={featuredPost.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/50 to-transparent"></div>
                    
                    {/* Featured Badge */}
                    <div className="absolute top-6 left-6">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green text-black font-semibold rounded-full text-sm">
                        ⭐ Featured
                      </span>
                    </div>
                  </div>

                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    {/* Tags */}
                    {featuredPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {featuredPost.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs text-white"
                          >
                            <Tag size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="text-3xl lg:text-4xl font-syne font-bold mb-3 group-hover:text-brand-green transition-colors">
                      {featuredPost.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-gray-300 text-lg mb-4 line-clamp-2 max-w-3xl">
                      {featuredPost.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar size={16} />
                        {new Date(featuredPost.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-green group-hover:gap-3 transition-all">
                        Read Article
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {/* Grid of Remaining Posts */}
            {remainingPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingPosts.map((post) => (
                  <Link
                    key={post.id}
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="block group"
                  >
                    <article className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-brand-green/50 transition-all duration-300 h-full flex flex-col">
                      {/* Image with 16:9 aspect ratio and gradient overlay */}
                      <div className="relative aspect-video overflow-hidden">
                        <img
                          src={post.featuredImage || `https://via.placeholder.com/1200x630/0A0F1E/00FFA3?text=${encodeURIComponent(post.title)}`}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* Gradient overlay for better text contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                      </div>
                      
                      <div className="p-6 flex-1 flex flex-col">
                        {/* Tags */}
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-brand-green/10 border border-brand-green/30 rounded text-xs text-brand-green"
                              >
                                <Tag size={12} />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Title */}
                        <h2 className="text-xl font-syne font-bold mb-3 group-hover:text-brand-green transition-colors line-clamp-2">
                          {post.title}
                        </h2>

                        {/* Excerpt */}
                        <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">
                          {post.excerpt}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Calendar size={14} />
                            {new Date(post.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          
                          <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-green group-hover:gap-3 transition-all">
                            Read More
                            <ArrowRight size={16} />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-6">
              📝
            </div>
            <h2 className="text-2xl font-syne font-bold mb-2">No Articles Yet</h2>
            <p className="text-gray-400 text-lg">Check back soon for expert insights and analysis!</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
