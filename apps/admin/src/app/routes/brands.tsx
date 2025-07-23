import { createFileRoute } from '@tanstack/react-router';

function Brands() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Brands</h1>
      <p className="text-gray-600">
        Manage brands and their configurations.
      </p>
    </div>
  );
}

export const Route = createFileRoute('/brands')({
  component: Brands,
});