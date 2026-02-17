'use client';

import { useEffect, useState } from 'react';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { useScopedI18n } from '@/locales/client';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CookieBanner() {
  const t = useScopedI18n('cookies');
  const { consent, updateConsent, saveConsent, hasInteracted } =
    useCookieConsent();
  const [isOpen, setIsOpen] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // If user has already interacted, don't show the banner
    if (hasInteracted) {
      setIsOpen(false);
    }
  }, [hasInteracted]);

  if (!isOpen) return null;

  const handleAcceptAll = () => {
    updateConsent({
      analytics: true,
      marketing: true,
    });
    saveConsent();
    setIsOpen(false);
  };

  const handleRejectAll = () => {
    updateConsent({
      analytics: false,
      marketing: false,
    });
    saveConsent();
    setIsOpen(false);
  };

  const handleSavePreferences = () => {
    saveConsent();
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed inset-x-0 bottom-0 z-50 w-full p-4 md:p-6"
        >
          <Card className="mx-auto max-w-4xl border bg-card p-6 shadow-lg">
            {!showDetails ? (
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{t('title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('description')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="default"
                      onClick={handleAcceptAll}
                      className="w-full sm:w-auto"
                    >
                      {t('acceptAll')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRejectAll}
                      className="w-full sm:w-auto"
                    >
                      {t('rejectAll')}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowDetails(true)}
                    className="w-full sm:w-auto"
                  >
                    {t('customize')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {t('preferencesTitle')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('preferencesDescription')}
                  </p>
                </div>

                <Tabs defaultValue="essential" className="w-full">
                  <div className="relative w-full overflow-hidden rounded-lg">
                    <TabsList className="no-scrollbar flex h-10 w-full items-center justify-start gap-0 overflow-x-auto whitespace-nowrap bg-muted p-1">
                      <TabsTrigger
                        value="essential"
                        className="inline-flex shrink-0 rounded-md px-3 py-1.5 ring-offset-background transition-all hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        {t('essential.title')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="analytics"
                        className="inline-flex shrink-0 rounded-md px-3 py-1.5 ring-offset-background transition-all hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        {t('analytics.title')}
                      </TabsTrigger>
                      <TabsTrigger
                        value="marketing"
                        className="inline-flex shrink-0 rounded-md px-3 py-1.5 ring-offset-background transition-all hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        {t('marketing.title')}
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="essential" className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('essential.title')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('essential.description')}
                        </p>
                      </div>
                      <Switch checked disabled />
                    </div>
                  </TabsContent>
                  <TabsContent value="analytics" className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('analytics.title')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('analytics.description')}
                        </p>
                      </div>
                      <Switch
                        checked={consent.analytics}
                        onCheckedChange={(checked) =>
                          updateConsent({ analytics: checked })
                        }
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="marketing" className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t('marketing.title')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('marketing.description')}
                        </p>
                      </div>
                      <Switch
                        checked={consent.marketing}
                        onCheckedChange={(checked) =>
                          updateConsent({ marketing: checked })
                        }
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetails(false)}
                  >
                    {t('back')}
                  </Button>
                  <Button onClick={handleSavePreferences}>
                    {t('savePreferences')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
