import { createFileRoute } from "@tanstack/react-router";
import { WikiApp } from "@/components/wiki/WikiApp";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <WikiApp />;
}
