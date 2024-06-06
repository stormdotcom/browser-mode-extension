
chrome.runtime.onInstalled.addListener(() => {
  console.log("StartSmart Installed");
  chrome.storage.sync.set({
    mode: "Work", // default mode
    workUrls: ["https://google.com", "https://jira.com", "https://chatgpt.com"],
    personalUrls: ["https://youtube.com", "https://chatgpt.com", "https://www.scaler.com/academy/mentee-dashboard/todos"],
  });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(["mode", "workUrls", "personalUrls"], (result) => {
    const urls = result.mode === "Work" ? result.workUrls : result.personalUrls;
    for (const url of urls) {
      chrome.tabs.create({ url: url });
    }
  });
});


