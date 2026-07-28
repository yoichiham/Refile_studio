import type { ReactNode } from 'react';

interface ErrorMessageProps {
  children?: ReactNode;
  /** 'warn' はバッチ処理の部分失敗など、致命的ではない注意喚起に使う。 */
  tone?: 'error' | 'warn';
}

export function ErrorMessage({ children, tone = 'error' }: ErrorMessageProps) {
  if (!children) return null;
  return (
    <div className={tone === 'warn' ? 'warn-message' : 'error-message'} role={tone === 'warn' ? 'status' : 'alert'}>
      {children}
    </div>
  );
}
