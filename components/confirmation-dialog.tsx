'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useScopedI18n } from '@/locales/client';

export function ConfirmationDialog({
  handleConfirm,
  isOpen,
  onOpenChange,
  title,
  description,
  confirmButtonText,
}: {
  handleConfirm: () => void;
  isOpen: boolean;
  onOpenChange: (_open: boolean) => void;
  title: string;
  description: string;
  confirmButtonText: string;
}) {
  const t = useScopedI18n('common');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-center text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center space-x-3">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            {t('cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} variant="destructive">
            {confirmButtonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
