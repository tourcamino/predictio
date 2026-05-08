import { createFileRoute, Link } from '@tanstack/react-router';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Clock, ArrowLeft, Briefcase } from 'lucide-react';
import { Header } from '~/components/Header';
import Markdown from 'markdown-to-jsx';

export const Route = createFileRoute('/careers/$id/')({
  component: JobPositionPage,
});

function JobPositionPage() {
  const { id } = Route.useParams();
  const trpc = useTRPC();
  const { data: position, isLoading } = useQuery(
    trpc.getJobPositionDetail.queryOptions({ id })
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg text-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-white/10 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-4 bg-white/10 rounded"></div>
              <div className="h-4 bg-white/10 rounded"></div>
              <div className="h-4 bg-white/10 rounded w-5/6"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="min-h-screen bg-brand-bg text-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center">
            <h1 className="text-4xl font-syne font-bold mb-4">Position Not Found</h1>
            <p className="text-gray-400 mb-8">The job position you're looking for doesn't exist.</p>
            <Link
              to="/careers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Careers
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Back Link */}
        <Link
          to="/careers"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-green transition-colors mb-8"
        >
          <ArrowLeft size={20} />
          Back to Careers
        </Link>

        {/* Position Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-green/10 border border-brand-green/30 rounded-full text-sm text-brand-green mb-4">
            <Briefcase size={14} />
            {position.department}
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-syne font-bold mb-6">
            {position.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-gray-400 mb-8">
            <div className="flex items-center gap-2">
              <MapPin size={20} />
              <span>{position.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={20} />
              <span>{position.type}</span>
            </div>
            {position.isOpen && (
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-sm text-green-500">
                Open Position
              </div>
            )}
          </div>

          {/* Apply Button */}
          <a
            href={`mailto:careers@predictio.com?subject=Application for ${position.title}`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            Apply Now
          </a>
        </div>

        {/* Position Description */}
        <div className="space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-syne font-bold mb-6">About the Role</h2>
            <div className="prose prose-invert prose-lg max-w-none">
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
                    strong: {
                      props: {
                        className: 'font-bold text-white',
                      },
                    },
                  },
                }}
              >
                {position.description}
              </Markdown>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-syne font-bold mb-6">Requirements & Benefits</h2>
            <div className="prose prose-invert prose-lg max-w-none">
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
                    strong: {
                      props: {
                        className: 'font-bold text-white',
                      },
                    },
                  },
                }}
              >
                {position.requirements}
              </Markdown>
            </div>
          </div>
        </div>

        {/* Bottom Apply CTA */}
        <div className="mt-12 bg-gradient-to-br from-brand-green/10 to-transparent border border-brand-green/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-syne font-bold mb-4">
            Ready to Apply?
          </h2>
          <p className="text-gray-400 mb-6">
            Send us your resume and tell us why you're a great fit for this role.
          </p>
          <a
            href={`mailto:careers@predictio.com?subject=Application for ${position.title}`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            Apply Now
          </a>
        </div>
      </main>

    </div>
  );
}

