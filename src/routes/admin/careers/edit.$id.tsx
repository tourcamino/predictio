import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/careers/edit/$id")({
  component: EditCareerPage,
});

function EditCareerPage() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-brand-bg text-white p-8">
      <p className="text-gray-400 mb-4">
        Edit job position{" "}
        <span className="font-mono text-brand-green">{id}</span>
      </p>
      <Link to="/admin/careers" className="text-brand-green hover:underline">
        ← Back to Careers Manager
      </Link>
    </div>
  );
}
