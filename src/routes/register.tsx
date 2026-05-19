import { createFileRoute } from "@tanstack/react-router";
import { AuthExperience } from "@/components/AuthExperience";

export const Route = createFileRoute("/register")({
  component: RegisterRoute,
});

function RegisterRoute() {
  return <AuthExperience mode="register" />;
}
