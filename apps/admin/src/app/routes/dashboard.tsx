import { createFileRoute } from '@tanstack/react-router';

function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600">
        Welcome to the CMS Platform admin dashboard. You are successfully authenticated!
      </p>
    </div>
  );
}

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
});