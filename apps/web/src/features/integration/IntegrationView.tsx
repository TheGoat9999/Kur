const copy = {
  inventory: ['Slot storage', 'Item instances', 'Drag/drop commands'],
  finance: ['Cash + bank ledger', 'Transfers', 'Loans'],
  vehicles: ['Owned vehicles', 'Active vehicle', 'Travel state'],
  property: ['Apartment', 'Storage', 'Parking access']
} as const;

export function IntegrationView({ feature }: { feature: keyof typeof copy }) {
  return <section className="glass-panel p-6"><span className="eyebrow">Migration queue</span><h1 className="mt-3 text-2xl font-semibold capitalize">{feature}</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">The standalone prototype is preserved in the repository. This feature will be ported through PostgreSQL tables, shared contracts and server commands instead of pasting its old localStorage code.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{copy[feature].map(item => <div key={item} className="rounded-xl border border-white/8 bg-white/[.025] p-4 text-sm text-slate-300">{item}</div>)}</div></section>;
}
