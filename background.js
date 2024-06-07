
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
    openUrls(urls);
  });
});

function openUrls(urls) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { url: urls[0] }, () => {
        for (let i = 1; i < urls.length; i++) {
          chrome.tabs.create({ url: urls[i] });
        }
      });
    } else {
      for (const url of urls) {
        chrome.tabs.create({ url: url });
      }
    }
  });
}