import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <div className="text-6xl font-mono font-bold text-muted-foreground mb-4">404</div>
      <div className="text-lg font-medium mb-2">Page not found</div>
      <div className="text-sm text-muted-foreground mb-6">This route doesn't exist in SentinelAI.</div>
      <Link href="/">
        <span className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
          Go to Dashboard
        </span>
      </Link>
    </div>
  );
}
