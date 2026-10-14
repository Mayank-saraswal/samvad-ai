import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DossiersLoading(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[38rem] bg-[radial-gradient(circle_at_50%_12%,rgba(212,233,74,0.36)_0%,rgba(212,233,74,0.13)_28%,transparent_60%)] animate-blob-slow" />
      <div className="relative z-10 flex-1 max-w-6xl w-full mx-auto p-6 sm:p-10 space-y-8 animate-pulse">
      {/* Top Header skeleton */}
      <div className="space-y-3 pb-6 border-b border-border/60">
        <div className="h-9 w-96 max-w-full bg-muted/80 rounded-lg" />
        <div className="h-4 w-2/3 bg-muted/50 rounded" />
      </div>

      {/* Workspace Selector skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2 p-1 bg-muted/40 rounded-2xl border border-border/60 w-fit">
          <div className="h-7 w-28 bg-card rounded-xl" />
          <div className="h-7 w-32 bg-muted/40 rounded-xl" />
          <div className="h-7 w-28 bg-muted/40 rounded-xl" />
        </div>
        <div className="h-20 bg-card rounded-2xl border border-border/60" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="pb-2 space-y-2">
              <div className="h-3 w-20 bg-muted/60 rounded" />
              <div className="h-8 w-14 bg-muted/80 rounded" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-3 w-36 bg-muted/40 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Files list card skeleton */}
      <Card className="bg-card">
        <CardHeader className="pb-4 space-y-2">
          <div className="h-5 w-48 bg-muted/70 rounded" />
          <div className="h-3 w-72 bg-muted/40 rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border/60 bg-muted/20" />
          ))}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
