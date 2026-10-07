import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title, description, actions, back,
}: { title: string; description?: string; actions?: React.ReactNode; back?: string }) {
  return (
    <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && (
          <Link href={back} className="mb-1 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" /> Kembali
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
