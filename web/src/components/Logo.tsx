export function Logo({ className = 'text-6xl' }: { className?: string }) {
  return (
    <h1 className={`sticker leading-[0.9] ${className}`}>
      <span className="text-cream">CASH</span>{' '}
      <span className="text-gold">RICH</span>
    </h1>
  );
}
