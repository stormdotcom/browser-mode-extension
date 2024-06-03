chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    mode: "work", // default mode
    workUrls: ["https://gmail.google.com", "https://jira.com"],
    personalUrls: ["https://youtube.com", "https://scaler.com"],
  });
});

chrome.windows.onCreated.addListener(() => {
  chrome.storage.sync.get(["mode", "workUrls", "personalUrls"], (result) => {
    const urls = result.mode === "work" ? result.workUrls : result.personalUrls;
    for (const url of urls) {
      chrome.tabs.create({ url: url });
    }
  });
});
