
chrome.runtime.onInstalled.addListener(() => {
  console.log("StartSmart Installed");
  chrome.storage.sync.set({
    mode: "Work", // default mode
    workUrls: ["https://google.com", "https://jira.com"],
    personalUrls: ["https://youtube.com", "https://scaler.com"],
  });
});

chrome.windows.onCreated.addListener(() => {
  chrome.storage.sync.get(["mode", "workUrls", "personalUrls"], (result) => {
    const urls = result.mode === "Work" ? result.workUrls : result.personalUrls;
    // Open a new window with the specified URLs
    chrome.windows.create({ url: urls }, () => {
      console.log("Opened a new window with the specified URLs");
    });
  });
});
