export default function AppLoading() {
  return (
    <div className="flex items-center justify-center py-32">
      <div
        className="h-8 w-8 rounded-full border-2 border-mist-2 border-t-graphite animate-spin"
        role="status"
        aria-label="A carregar"
      />
    </div>
  );
}
