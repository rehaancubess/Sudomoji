export const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-4xl animate-bounce">🧩</div>
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-gray-600">Loading Sudomoji...</p>
    </div>
  );
};
