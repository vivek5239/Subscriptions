import { useState } from 'react';

export const Logo = ({ name, url }: { name: string; url?: string }) => {
  const [error, setError] = useState(false);
  
  const domain = url || `${name.replace(/\s+/g, '').toLowerCase()}.com`;
  const logoUrl = `https://logo.clearbit.com/${domain}`;
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=64`;

  return (
    <img
      src={error ? fallbackUrl : logoUrl}
      alt={name}
      className="rounded-circle me-2"
      width="32"
      height="32"
      onError={() => setError(true)}
      style={{ objectFit: 'cover' }}
    />
  );
};
