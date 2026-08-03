import React from "react";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-neutral-100 pb-4">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-marine-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm sm:text-base text-neutral-600">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
