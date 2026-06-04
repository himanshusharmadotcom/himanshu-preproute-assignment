import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <img
    src="/images/logo.png"
    alt="PrepRoute"
    className={`h-8 w-auto select-none ${className}`}
  />
);

export const LogoFull: React.FC<{ className?: string }> = ({ className = '' }) => (
  <img
    src="/images/logo.png"
    alt="PrepRoute"
    className={`h-8 w-auto select-none ${className}`}
  />
);
