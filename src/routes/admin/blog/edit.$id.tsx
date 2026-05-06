import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/blog/edit/$id")({
  component: EditBlogPostPage,
});

function EditBlogPostPage() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-brand-bg text-white p-8">
      <p className="text-gray-400 mb-4">
        Edit blog post <span className="font-mono text-brand-green">{id}</span>
      </p>
      <Link to="/admin/blog" className="text-brand-green hover:underline">
        ← Back to Blog Manager
      </Link>
    </div>
  );
}
