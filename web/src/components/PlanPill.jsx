import React from 'react';

export default function PlanPill({ plan, onOpenPlans }) {
  return (
    <button
      onClick={onOpenPlans}
      title="Тарифы"
      className="flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-sm border border-border
        bg-bg-elevated hover:bg-bg-hover transition-colors duration-150 text-[12px]"
    >
      <span className="text-text-secondary">{plan} plan</span>
      {plan !== 'Pro' && (
        <>
          <span className="text-border">·</span>
          <span className="text-accent font-medium">Upgrade</span>
        </>
      )}
    </button>
  );
}
