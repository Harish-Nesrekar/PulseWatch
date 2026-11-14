
import type { HTMLAttributes } from 'react';

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function GlassCard({
  className,
  interactive = false,
  ...props
}: GlassCardProps) {
  const classes = [
    'glass-card',
    interactive && 'glass-card--interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} {...props} />;
}
