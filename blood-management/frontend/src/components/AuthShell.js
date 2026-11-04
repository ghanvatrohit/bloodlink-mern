export default function AuthShell({ title, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-800 to-gray-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-red-700 m-0">🩸 BloodLink</h1>
        <p className="text-gray-500 mt-1 mb-6">{title}</p>{children}
      </div>
    </div>
  );
}
