import React from 'react';

type LogoProps = {
  className?: string;
  src?: string;
  alt?: string;
};

const Logo: React.FC<LogoProps> = ({ className, src, alt }) => {
  const publicUrl = process.env.PUBLIC_URL || '';
  const primarySrc = `${publicUrl}/assets/nexus-logo.png`;
  const fallbackSrc = `${publicUrl}/favicon.svg`;
  const [useFallback, setUseFallback] = React.useState(false);

  return (
    <img
      src={useFallback ? fallbackSrc : (src || primarySrc)}
      alt={alt || 'Nexus Auction'}
      className={className ? className : 'h-8 w-auto'}
      onError={() => setUseFallback(true)}
      loading="eager"
      decoding="async"
    />
  );
};

export default Logo;