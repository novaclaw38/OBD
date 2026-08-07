import { Router } from '../js/router.js';
import { useAuthGuard } from '../js/hooks/useAuthGuard.js';
import { mobileDashboardScreen } from '../js/screens/mobile/dashboard.js';
import { pocketSensorsScreen } from '../js/screens/mobile/pocket-sensors.js';
import { pdfExportScreen } from '../js/screens/mobile/pdf-export.js';
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
  .register('/dashboard', guarded(mobileDashboardScreen))
  .register('/pocket-sensors', guarded(pocketSensorsScreen))
  .register('/pdf-export', guarded(pdfExportScreen))
  .register('/auth', authScreen)
  .register('/pro-subscription', guarded(proSubscriptionScreen))
  .register('/payment-success', guarded(paymentSuccessScreen));

router.start('/auth');
