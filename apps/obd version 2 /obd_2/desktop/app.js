import { Router } from '../js/router.js';
import { useAuthGuard } from '../js/hooks/useAuthGuard.js';
import { dashboardScreen } from '../js/screens/desktop/dashboard.js';
import { liveSensorsScreen } from '../js/screens/desktop/live-sensors.js';
import { faultCodesScreen } from '../js/screens/desktop/fault-codes.js';
import { connectionManagerScreen } from '../js/screens/desktop/connection-manager.js';
import { performanceScreen } from '../js/screens/desktop/performance.js';
import { systemSettingsScreen } from '../js/screens/desktop/system-settings.js';
import { authScreen } from '../js/screens/auth.js';
import { proSubscriptionScreen, paymentSuccessScreen } from '../js/screens/pro-subscription.js';

function guarded(screen, opts) {
  return {
    render(container) {
      if (!useAuthGuard(opts)) return;
      screen.render(container);
    },
    destroy() { screen.destroy?.(); },
  };
}

const outlet = document.getElementById('outlet');
const router = new Router(outlet);
router
  .register('/dashboard', guarded(dashboardScreen))
  .register('/live-sensors', guarded(liveSensorsScreen))
  .register('/fault-codes', guarded(faultCodesScreen))
  .register('/connection-manager', guarded(connectionManagerScreen))
  .register('/performance', guarded(performanceScreen, { requirePro: true }))
  .register('/system-settings', guarded(systemSettingsScreen))
  .register('/auth', authScreen)
  .register('/pro-subscription', guarded(proSubscriptionScreen))
  .register('/payment-success', guarded(paymentSuccessScreen));

router.start('/auth');
