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

void configureSidePanel();
