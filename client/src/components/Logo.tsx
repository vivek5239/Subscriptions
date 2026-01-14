import { useState, useEffect } from 'react';

export const Logo = ({ name, url, manualLogo, size = 32 }: { name: string; url?: string; manualLogo?: string; size?: number }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [name, url, manualLogo]);
  
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=${size * 2}`;
  
  let finalLogoUrl = fallbackUrl;

  if (manualLogo) {
    finalLogoUrl = manualLogo;
  } else {
    let domain = url || `${name.replace(/\s+/g, '').toLowerCase()}.com`;
    
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        domain = new URL(url).hostname;
      } catch (e) {
        domain = url;
      }
    }
    finalLogoUrl = `https://logo.clearbit.com/${domain}`;
  }

  return (
    <div 
      className="rounded-circle me-2 flex-shrink-0 d-inline-flex align-items-center justify-content-center overflow-hidden bg-white border shadow-sm"
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        padding: error ? '0' : (size > 40 ? '6px' : '3px')
      }}
    >
      <img
        src={error ? fallbackUrl : finalLogoUrl}
        alt={name}
        onError={() => setError(true)}
        style={{ 
          maxWidth: '100%', 
          maxHeight: '100%', 
          objectFit: error ? 'cover' : 'contain',
          display: 'block'
        }}
      />
    </div>
  );
};
