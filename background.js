chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension Installed");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openUrls") {
    chrome.windows.getAll({}, (windows) => {
      if (windows.length > 1) {
        sendResponse({ error: "More than one window open" });
        return;
      }

      const urls = request.urls;
      if (urls && urls.length > 0) {
        chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
          const tabId = tabs[0].id;
          urls.forEach((url, index) => {
            chrome.tabs.create({ url, index: tabId + index + 1 }, (tab) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                sendResponse({ error: chrome.runtime.lastError.message });
              }
            });
          });
        });
      }
    });
    return true;
  }
});
