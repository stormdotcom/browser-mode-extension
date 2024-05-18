chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ mode: "work" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.toggleMode === "work") {
    chrome.storage.sync.set({ mode: "work" });
  } else if (message.toggleMode === "personal") {
    chrome.storage.sync.set({ mode: "personal" });
  }
});
