import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="grid place-items-center rounded-[2rem] border border-dashed border-rose-200 bg-white/55 px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-rose-100 text-rose-500">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-bold text-rose-950">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-rose-700/75">{description}</p>
    </div>
  );
}
