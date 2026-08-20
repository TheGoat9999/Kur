const copy = {
  finance: ['Branch, ATM and phone access rules', 'Checking, savings, transfers and transaction ledger', 'Credit score, loans and DoradoX crypto exchange'],
  vehicles: ['Persistent owned vehicles and active vehicle selection', 'Fuel, condition, mileage, trunk and parking location', 'Walk, bus, taxi and vehicle travel consequences'],
  property: ['Property ownership separated from operating businesses', 'Rentals, tenants, storage, parking and access', 'Agent, broker and commission progression'],
  jobs: ['Opportunity-based work offers', 'Career, job and skill XP with qualifications', 'Reliability, employer trust and shift history'],
  hospitality: ['Supplier orders, ingredients and slot storage', 'Recipes, prepared products and customer demand', 'Staff, reputation, certification and venue operations'],
  police: ['Imperfect dispatch information and civilian perspective', 'Encounters, legal grounds, evidence and intelligence', 'Pursuit, visual loss, Last Known Position and search areas']
} as const;

export function IntegrationView({ feature }: { feature: keyof typeof copy }) {
  return <section className="glass-panel migration-panel"><div className="feature-badge feature-badge-migration"><span /> Not yet playable</div><span className="eyebrow">Prototype migration</span><h1>{feature}</h1><p>The prototype defines the functionality below. It is visible in navigation so the browser game has a stable information architecture, but it will not be counted as implemented until its PostgreSQL state, API commands and React interactions work together.</p><div className="migration-grid">{copy[feature].map((item, index) => <div key={item}><b>0{index + 1}</b><span>{item}</span></div>)}</div></section>;
}
