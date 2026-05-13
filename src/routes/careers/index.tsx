import { createFileRoute, Link } from '@tanstack/react-router';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Clock, ArrowRight, Briefcase } from 'lucide-react';
import { Header } from '~/components/Header';

export const Route = createFileRoute('/careers/')({
  component: CareersPage,
});

function CareersPage() {
  const trpc = useTRPC();
  const { data: positions, isLoading } = useQuery(
    trpc.getJobPositions.queryOptions({ isOpen: true })
  );

  type Job = NonNullable<typeof positions>[number];
  // Group positions by department
  const positionsByDepartment = positions?.reduce<Record<string, Job[]>>(
    (acc, position) => {
      const dept = position.department ?? 'General';
      if (!acc[dept]) {
        acc[dept] = [];
      }
      acc[dept].push(position);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Page Header */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green/10 border border-brand-green/30 rounded-full text-sm text-brand-green mb-6">
            <Briefcase size={16} />
            Join Our Team
          </div>
          <h1 className="text-4xl lg:text-6xl font-syne font-bold mb-6">
            Build the Future of Prediction Markets
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We're a remote-first team building the world's most transparent and fair sports prediction platform. Join us in revolutionizing the industry.
          </p>
        </div>

        {/* Why Join Us Section */}
        <div className="mb-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-brand-green/10 border border-brand-green/30 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🌍</span>
            </div>
            <h3 className="text-lg font-syne font-bold mb-2">Remote First</h3>
            <p className="text-gray-400 text-sm">
              Work from anywhere in the world. We believe in flexibility and trust.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-brand-green/10 border border-brand-green/30 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-syne font-bold mb-2">Cutting Edge Tech</h3>
            <p className="text-gray-400 text-sm">
              Work with the latest Web3 technologies and shape the future of DeFi.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="w-12 h-12 bg-brand-green/10 border border-brand-green/30 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💎</span>
            </div>
            <h3 className="text-lg font-syne font-bold mb-2">Token Allocation</h3>
            <p className="text-gray-400 text-sm">
              Competitive salary plus token allocation to share in our success.
            </p>
          </div>
        </div>

        {/* Job Positions */}
        {isLoading ? (
          <div className="space-y-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-8 bg-white/10 rounded w-48 mb-4"></div>
                <div className="space-y-4">
                  <div className="h-32 bg-white/10 rounded-xl"></div>
                  <div className="h-32 bg-white/10 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : positions && positions.length > 0 ? (
          <div className="space-y-12">
            {Object.entries(positionsByDepartment || {}).map(([department, deptPositions]) => (
              <div key={department}>
                <h2 className="text-2xl font-syne font-bold mb-6 flex items-center gap-3">
                  <span className="w-1 h-8 bg-brand-green rounded"></span>
                  {department}
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {deptPositions.map((position) => (
                    <article
                      key={position.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-brand-green/50 transition-all duration-300 group"
                    >
                      {/* Position Header */}
                      <div className="mb-4">
                        <h3 className="text-xl font-syne font-bold mb-3 group-hover:text-brand-green transition-colors">
                          {position.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            {position.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            {position.type}
                          </div>
                        </div>
                      </div>

                      {/* Excerpt from description */}
                      <p className="text-gray-400 text-sm mb-6 line-clamp-3">
                        {position.description.split('\n\n')[1]?.replace(/^#+\s/, '') || 
                         position.description.substring(0, 150) + '...'}
                      </p>

                      {/* Apply Button */}
                      <Link
                        to="/careers/$id"
                        params={{ id: position.id }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-all group-hover:gap-3"
                      >
                        Apply Now
                        <ArrowRight size={18} />
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">No open positions at the moment.</p>
            <p className="text-gray-500 text-sm">Check back soon or follow us on social media for updates!</p>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-20 bg-gradient-to-br from-brand-green/10 to-transparent border border-brand-green/30 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-syne font-bold mb-4">
            Don't See the Right Role?
          </h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            We're always looking for talented people. Send us your resume and let us know how you can contribute to Predictio.
          </p>
          <a
            href="mailto:careers@predictio.com"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-green text-black font-medium rounded-lg hover:bg-brand-green/90 transition-colors"
          >
            Get in Touch
            <ArrowRight size={20} />
          </a>
        </div>
      </main>

    </div>
  );
}

