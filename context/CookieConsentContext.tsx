'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type CookieConsent = {
  analytics: boolean;
  marketing: boolean;
  necessary: boolean;
};

type CookieConsentContextType = {
  consent: CookieConsent;
  updateConsent: (_newConsent: Partial<CookieConsent>) => void;
  saveConsent: () => void;
  hasInteracted: boolean;
};

const defaultConsent: CookieConsent = {
  necessary: true, // Always true as these are essential
  analytics: false, // Default to false for GDPR compliance
  marketing: false, // Default to false for GDPR compliance
};

const CookieConsentContext = createContext<
  CookieConsentContextType | undefined
>(undefined);

export function CookieConsentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [consent, setConsent] = useState<CookieConsent>(defaultConsent);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Load saved consent from localStorage
    const savedConsent = localStorage.getItem('cookie-consent');
    if (savedConsent) {
      setConsent(JSON.parse(savedConsent));
      setHasInteracted(true);
    }
  }, []);

  const updateConsent = (newConsent: Partial<CookieConsent>) => {
    setConsent((prev) => ({ ...prev, ...newConsent }));
  };

  const saveConsent = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setHasInteracted(true);
  };

  return (
    <CookieConsentContext.Provider
      value={{ consent, updateConsent, saveConsent, hasInteracted }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error(
      'useCookieConsent must be used within a CookieConsentProvider'
    );
  }
  return context;
}
