import { createFileRoute } from "@tanstack/react-router";
import { AuthExperience } from "@/components/AuthExperience";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  return <AuthExperience mode="login" />;
}
