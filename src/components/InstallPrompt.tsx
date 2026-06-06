import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from './Button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISSED_KEY = 'for-us:install-dismissed';

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => window.localStorage.getItem(DISMISSED_KEY) === 'true');

  const isStandalone = useMemo(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
    [],
  );

  const isIos = useMemo(() => /iphone|ipad|ipod/i.test(window.navigator.userAgent), []);
  const shouldShow = !dismissed && !isStandalone && (Boolean(installEvent) || isIos);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    await installEvent.userChoice;
    dismiss();
  }, [dismiss, installEvent]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="glass-card fixed inset-x-4 bottom-28 z-50 mx-auto max-w-xl rounded-[1.75rem] p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-500">
          {installEvent ? <Download className="size-5" /> : <Share className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-rose-950">Install For Us</p>
          <p className="mt-1 text-xs leading-5 text-rose-700/75">
            {installEvent ? 'Add this app to your home screen for a more private app-like feel.' : 'On iPhone, tap Share in Safari, then Add to Home Screen.'}
          </p>
          <div className="mt-3 flex gap-2">
            {installEvent ? (
              <Button onClick={() => void install()} className="px-4 py-2 text-xs">
                Install
              </Button>
            ) : null}
            <Button variant="secondary" onClick={dismiss} className="px-4 py-2 text-xs">
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
