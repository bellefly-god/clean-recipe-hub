// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const planId = params.get('plan');
  const userId = params.get('userId');
  const userEmail = params.get('email');

  const planNames = {
    monthly: 'Pro Monthly',
    yearly: 'Pro Yearly'
  };
  const planPrices = {
    monthly: '$4.99',
    yearly: '$39.9'
  };
  const planPeriods = {
    monthly: 'per month',
    yearly: 'per year'
  };

  const planNameEl = document.getElementById('plan-name');
  const planPriceEl = document.getElementById('plan-price');
  const planPeriodEl = document.getElementById('plan-period');

  if (planNameEl) planNameEl.textContent = planNames[planId] || 'Pro Monthly';
  if (planPriceEl) planPriceEl.textContent = planPrices[planId] || '$4.99';
  if (planPeriodEl) planPeriodEl.textContent = planPeriods[planId] || 'per month';

  // Fetch config and load PayPal
  fetch('https://clean-hub.ariflim813.workers.dev/')
    .then(r => r.json())
    .then(config => {
      const clientId = config.paypal.clientId;
      const paypalPlanId = config.paypal.plans[planId];

      if (!clientId || !paypalPlanId) {
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.innerHTML = '<div class="error">Configuration error. Please try again.</div>';
        return;
      }

      const baseUrl = config.paypal.environment === 'sandbox'
        ? 'https://www.sandbox.paypal.com'
        : 'https://www.paypal.com';

      // Load PayPal SDK
      const script = document.createElement('script');
      script.src = `${baseUrl}/sdk/js?client-id=${clientId}&intent=subscription&vault=true&currency=USD`;
      script.async = true;
      script.onload = () => {
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.style.display = 'none';

        // @ts-ignore
        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 45
          },
          createSubscription: function(data, actions) {
            return actions.subscription.create({
              plan_id: paypalPlanId
            });
          },
          onApprove: async function(data, actions) {
            const statusEl = document.getElementById('status');
            if (statusEl) {
              statusEl.textContent = 'Processing...';
              statusEl.style.display = 'block';
            }

            // Send subscription to extension via chrome messaging
            try {
              if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                  type: 'PAYPAL_SUBSCRIPTION_COMPLETE',
                  subscriptionId: data.subscriptionID,
                  userId: userId,
                  userEmail: userEmail,
                  planId: planId
                }, response => {
                  const statusEl = document.getElementById('status');
                  if (response && response.success && statusEl) {
                    statusEl.innerHTML =
                      '<div style="color: green;">Payment successful! You can close this tab.</div>';
                    setTimeout(() => window.close(), 2000);
                  }
                });
              } else {
                const statusEl = document.getElementById('status');
                if (statusEl) {
                  statusEl.innerHTML =
                    '<div style="color: green;">Payment successful! Subscription ID: ' + data.subscriptionID + '</div>';
                }
              }
            } catch (err) {
              const statusEl = document.getElementById('status');
              if (statusEl) {
                statusEl.innerHTML =
                  '<div class="error">Payment received but failed to save. Contact support with ID: ' + data.subscriptionID + '</div>';
              }
            }
          },
          onCancel: function() {
            const statusEl = document.getElementById('status');
            if (statusEl) statusEl.textContent = 'Payment cancelled.';
          },
          onError: function(err) {
            const statusEl = document.getElementById('status');
            if (statusEl) {
              statusEl.innerHTML =
                '<div class="error">Payment failed. Please try again.</div>';
            }
          }
        }).render('#paypal-button');
      };
      script.onerror = () => {
        const statusEl = document.getElementById('status');
        if (statusEl) {
          statusEl.innerHTML =
            '<div class="error">Failed to load PayPal. Please check your connection.</div>';
        }
      };
      document.head.appendChild(script);
    })
    .catch(err => {
      const statusEl = document.getElementById('status');
      if (statusEl) {
        statusEl.innerHTML =
          '<div class="error">Failed to load configuration. Please refresh.</div>';
      }
    });
});
