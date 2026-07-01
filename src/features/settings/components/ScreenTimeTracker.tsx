import { useState, useEffect, useRef } from 'react';
import { Coffee, Timer, X, ExternalLink } from 'lucide-react';
import { authService } from '@/services/authService';

export function ScreenTimeTracker() {
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [sessionLimit, setSessionLimit] = useState(30);
  const [dailyLimit, setDailyLimit] = useState(120);

  const lastActiveRef = useRef<number>(Date.now());
  const activeUserRef = useRef<string | null>(null);

  // Load configuration from local storage
  const loadConfig = () => {
    const user = authService.getCurrentUser();
    if (!user) return;
    activeUserRef.current = user.id;

    const sLimit = parseInt(localStorage.getItem('kconnecta_reminder_session_limit') || '30', 10);
    const dLimit = parseInt(localStorage.getItem('kconnecta_reminder_daily_limit') || '120', 10);
    setSessionLimit(sLimit);
    setDailyLimit(dLimit);
  };

  useEffect(() => {
    loadConfig();

    // Listen for custom settings changes event
    const handleSettingsChange = () => {
      loadConfig();
    };
    window.addEventListener('kconnecta_reminders_settings_changed', handleSettingsChange);
    
    // Check configuration changes on auth state change
    const intervalCheckAuth = setInterval(() => {
      const currentUser = authService.getCurrentUser();
      if (currentUser && currentUser.id !== activeUserRef.current) {
        loadConfig();
      }
    }, 5000);

    return () => {
      window.removeEventListener('kconnecta_reminders_settings_changed', handleSettingsChange);
      clearInterval(intervalCheckAuth);
    };
  }, []);

  // Track active events to detect idle
  useEffect(() => {
    const handleActivity = () => {
      lastActiveRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Tracking timer
  useEffect(() => {
    const trackInterval = setInterval(() => {
      const user = authService.getCurrentUser();
      if (!user) return;

      const userId = user.id;
      const today = new Date().toISOString().split('T')[0];

      // 1. Check visibility
      if (document.visibilityState !== 'visible') return;

      // 2. Check idle state (idle if no activity for 5 minutes)
      const isIdle = Date.now() - lastActiveRef.current > 5 * 60 * 1000;
      if (isIdle) return;

      // 3. Read current reminder configurations
      const isSessionEnabled = localStorage.getItem('kconnecta_reminder_session_enabled') === 'true';
      const isDailyEnabled = localStorage.getItem('kconnecta_reminder_daily_enabled') === 'true';

      // 4. Update session active seconds
      let sessionSecs = parseInt(sessionStorage.getItem('kconnecta_session_active_seconds') || '0', 10);
      sessionSecs += 10; // increment by 10 seconds
      sessionStorage.setItem('kconnecta_session_active_seconds', String(sessionSecs));

      // 5. Update daily active seconds
      const dailyKey = `kconnecta_daily_active_seconds_${userId}_${today}`;
      let dailySecs = parseInt(localStorage.getItem(dailyKey) || '0', 10);
      dailySecs += 10;
      localStorage.setItem(dailyKey, String(dailySecs));

      // 6. Evaluate limits
      if (isSessionEnabled && !showSessionModal && !showDailyModal) {
        if (sessionSecs >= sessionLimit * 60) {
          setShowSessionModal(true);
        }
      }

      if (isDailyEnabled && !showDailyModal && !showSessionModal) {
        const dailyShownKey = `kconnecta_daily_reminder_shown_${userId}_${today}`;
        const alreadyShownToday = localStorage.getItem(dailyShownKey) === 'true';
        
        if (!alreadyShownToday && dailySecs >= dailyLimit * 60) {
          setShowDailyModal(true);
        }
      }
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(trackInterval);
    };
  }, [sessionLimit, dailyLimit, showSessionModal, showDailyModal]);

  const handleSkipSession = () => {
    // Reset session counter so it starts counting from 0 again
    sessionStorage.setItem('kconnecta_session_active_seconds', '0');
    setShowSessionModal(false);
  };

  const handleSkipDaily = () => {
    const user = authService.getCurrentUser();
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const dailyShownKey = `kconnecta_daily_reminder_shown_${user.id}_${today}`;
      localStorage.setItem(dailyShownKey, 'true');
    }
    setShowDailyModal(false);
  };

  const handleConfigureReminders = () => {
    // Navigate to settings and tab reminders
    window.location.href = '/settings?tab=reminders';
    setShowSessionModal(false);
    setShowDailyModal(false);

    // If already on the page, force a reload/recheck
    window.dispatchEvent(new Event('kconnecta_reminders_settings_changed'));
  };

  return (
    <>
      {/* Continuous Session Limit Exceeded Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-card p-6 shadow-2xl border border-border text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mb-4">
              <Coffee className="h-7 w-7" />
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-2">Nhắc nhở nghỉ ngơi</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Bạn đã hoạt động liên tục hơn <strong className="text-foreground">{sessionLimit} phút</strong> trên KConnecta.
              Hãy dành ra vài phút đứng dậy, vươn vai và nghỉ ngơi để bảo vệ đôi mắt của mình nhé!
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSkipSession}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                Tôi đã hiểu, tiếp tục lướt
              </button>
              <button
                type="button"
                onClick={handleConfigureReminders}
                className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-border hover:bg-muted py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cài đặt lại giới hạn
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Total Time Limit Exceeded Modal */}
      {showDailyModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-card p-6 shadow-2xl border border-border text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mb-4">
              <Timer className="h-7 w-7" />
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-2">Giới hạn thời gian sử dụng</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Hôm nay bạn đã sử dụng KConnecta quá giới hạn cho phép là <strong className="text-foreground">{dailyLimit} phút</strong>.
              Bạn có muốn tạm dừng và tham gia các hoạt động bên ngoài không?
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSkipDaily}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                Bỏ qua giới hạn hôm nay
              </button>
              <button
                type="button"
                onClick={handleConfigureReminders}
                className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-border hover:bg-muted py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Thay đổi cấu hình cài đặt
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
