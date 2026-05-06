import { createFileRoute } from '@tanstack/react-router';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Tag, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import Markdown from 'markdown-to-jsx';
import { MetaTags } from '~/components/MetaTags';
import { ReadingProgressBar } from '~/components/blog/ReadingProgressBar';
import { BlogShareBar } from '~/components/blog/BlogShareBar';
import { AuthorBox } from '~/components/blog/AuthorBox';
import { TradeCTA } from '~/components/blog/TradeCTA';
import { useEffect } from 'react';

export const Route = createFileRoute('/blog/$slug/')({
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const trpc = useTRPC();
  const { data: post, isLoading } = useQuery(
    trpc.getBlogPostDetail.queryOptions({ slug })
  );

  // Get full URL for sharing
  const pageUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/blog/${slug}`
    : `/blog/${slug}`;

  // Inject JSON-LD structured data
  useEffect(() => {
    if (!post) return;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.metaTitle || post.title,
      "description": post.metaDescription || post.excerpt,
      "image": post.featuredImage,
      "datePublished": post.createdAt,
      "dateModified": post.updatedAt,
      "author": {
        "@type": "Organization",
        "name": "Predictio",
        "url": window.location.origin,
      },
      "publisher": {
        "@type": "Organization",
        "name": "Predictio",
        "logo": {
          "@type": "ImageObject",
          "url": `${window.location.origin}/logo.png`,
        },
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": pageUrl,
      },
      "keywords": post.tags.join(", "),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [post, pageUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg text-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-white/10 rounded w-1/2 mb-8"></div>
            <div className="aspect-video bg-white/10 rounded-xl mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-white/10 rounded"></div>
              <div className="h-4 bg-white/10 rounded"></div>
              <div className="h-4 bg-white/10 rounded w-5/6"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-brand-bg text-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center">
            <h1 className="text-4xl font-syne font-bold mb-4">Post Not Found</h1>
            <p className="text-gray-400 mb-8">The blog post you're looking for doesn't exist.</p>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Blog
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      {/* Meta Tags for SEO and Social Sharing */}
      <MetaTags
        title={post.metaTitle || post.title}
        description={post.metaDescription || post.excerpt}
        imageUrl={post.featuredImage ?? undefined}
        url={pageUrl}
      />

      {/* Reading Progress Bar */}
      <ReadingProgressBar />

      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Back Link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-green transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          Back to Blog
        </Link>

        {/* Article */}
        <article>
          <header className="mb-12">
            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-brand-green/10 border border-brand-green/30 rounded-full text-sm text-brand-green"
                  >
                    <Tag size={14} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl lg:text-5xl font-syne font-bold mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar size={16} />
                {new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
              
              {/* Share Bar */}
              <BlogShareBar
                title={post.title}
                url={pageUrl}
                excerpt={post.excerpt}
              />
            </div>
          </header>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="mb-12 rounded-xl overflow-hidden">
              <img
                src={post.featuredImage}
                alt={post.title}
                loading="lazy"
                className="w-full aspect-video object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none mb-12">
            <Markdown
              options={{
                overrides: {
                  h1: {
                    props: {
                      className: 'text-3xl font-syne font-bold mb-4 mt-8',
                    },
                  },
                  h2: {
                    props: {
                      className: 'text-2xl font-syne font-bold mb-3 mt-6',
                    },
                  },
                  h3: {
                    props: {
                      className: 'text-xl font-syne font-bold mb-2 mt-4',
                    },
                  },
                  p: {
                    props: {
                      className: 'text-gray-300 mb-4 leading-relaxed',
                    },
                  },
                  ul: {
                    props: {
                      className: 'list-disc list-inside mb-4 space-y-2 text-gray-300',
                    },
                  },
                  ol: {
                    props: {
                      className: 'list-decimal list-inside mb-4 space-y-2 text-gray-300',
                    },
                  },
                  li: {
                    props: {
                      className: 'text-gray-300',
                    },
                  },
                  a: {
                    props: {
                      className: 'text-brand-green hover:underline',
                    },
                  },
                  strong: {
                    props: {
                      className: 'font-bold text-white',
                    },
                  },
                  code: {
                    props: {
                      className: 'bg-white/10 px-2 py-1 rounded text-sm font-mono',
                    },
                  },
                  img: {
                    props: {
                      className: 'rounded-lg my-6',
                      loading: 'lazy',
                    },
                  },
                },
              }}
            >
              {post.content}
            </Markdown>
          </div>

          {/* Trade CTA */}
          <div className="mb-12">
            <TradeCTA />
          </div>

          {/* Author Box */}
          <div className="mb-12">
            <AuthorBox />
          </div>

          {/* Bottom Share Bar */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex items-center justify-center">
              <BlogShareBar
                title={post.title}
                url={pageUrl}
                excerpt={post.excerpt}
              />
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
