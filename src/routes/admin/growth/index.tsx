import { createFileRoute } from "@tanstack/react-router";
import { GrowthEngine } from "~/components/admin/GrowthEngine";

export const Route = createFileRoute("/admin/growth/")({
  component: GrowthEnginePage,
});

function GrowthEnginePage() {
  return <GrowthEngine />;
}
