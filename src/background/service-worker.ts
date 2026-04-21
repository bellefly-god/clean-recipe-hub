const SIDE_PANEL_PATH = "src/sidepanel/index.html";

async function configureSidePanel() {
  try {
    await chrome.sidePanel.setOptions({
      path: SIDE_PANEL_PATH,
      enabled: true,
    });

    await chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true,
    });

    console.log("[Recipe Cleaner] Side panel behavior configured.");
  } catch (error) {
    console.error("[Recipe Cleaner] Failed to configure side panel behavior.", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Recipe Cleaner] Extension installed or updated.");
  void configureSidePanel();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[Recipe Cleaner] Browser startup detected.");
  void configureSidePanel();
});

// Listen for messages from payment page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Service Worker] Received message:", message);

  if (message.type === "PAYPAL_SUBSCRIPTION_COMPLETE") {
    // Security: Verify the message comes from a trusted source
    // Only allow messages from our payment page or extension pages
    const allowedOrigins = [
      'https://api.pagecleans.com',
      'null', // file:// URLs in some cases
    ];
    
    // Check if sender URL is from a trusted origin
    if (sender.url) {
      const url = new URL(sender.url);
      const isTrusted = allowedOrigins.some(origin => 
        origin === 'null' ? sender.url?.startsWith('file://') : url.origin === origin
      );
      
      if (!isTrusted) {
        console.error("[Service Worker] Rejected message from untrusted origin:", sender.url);
        sendResponse({ success: false, error: 'Untrusted message source' });
        return true;
      }
    }

    // Forward to side panel
    chrome.runtime.sendMessage({
      type: "SUBSCRIPTION_UPDATED",
      ...message
    }).then(response => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error("[Service Worker] Failed to send to side panel:", err);
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async response
  }

  return false;
});

void configureSidePanel();
