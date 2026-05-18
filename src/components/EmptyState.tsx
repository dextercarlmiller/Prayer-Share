interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <div className="mb-4 text-4xl text-amber-300" aria-hidden="true">✦</div>
      <h3 className="mb-2 font-serif text-xl font-medium text-stone-700">{title}</h3>
      <p className="mb-6 leading-relaxed text-stone-500">{description}</p>
      {action}
    </div>
  )
}
