import type { ReactNode } from 'react';

export function ErrorMessage({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="error-message" role="alert">
      {children}
    </div>
  );
}
