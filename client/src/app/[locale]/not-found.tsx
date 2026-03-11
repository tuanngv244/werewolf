export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg text-gray-600 mb-6">Page not found</p>
        <a
          href="/"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
