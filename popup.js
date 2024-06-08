import { MODE } from "./constants.js";
document.addEventListener("DOMContentLoaded", () => {
  const workModeBtn = document.getElementById("workModeBtn");
  const personalModeBtn = document.getElementById("personalModeBtn");
  const setWorkUrlsBtn = document.getElementById("setWorkUrlsBtn");
  const setPersonalUrlsBtn = document.getElementById("setPersonalUrlsBtn");
  const modeTitle = document.getElementById("modeTitle");

  if (workModeBtn) {
    workModeBtn.addEventListener("click", () => {
      chrome.storage.sync.set({ mode: MODE.WORK }, () => {
        updateModeTitle(MODE.WORK);
        alert("Switched to Work Mode");
      });
    });
  }

  if (personalModeBtn) {
    personalModeBtn.addEventListener("click", () => {
      chrome.storage.sync.set({ mode: MODE.PERSONAL }, () => {
        updateModeTitle(MODE.PERSONAL);
        alert("Switched to Personal Mode");
      });
    });
  }

  if (setWorkUrlsBtn) {
    setWorkUrlsBtn.addEventListener("click", () => {
      const workEmailUrl = prompt(
        "[Mode: Work] Enter URL for Work Email:",
        "https://gmail.google.com"
      );
      const jiraUrl = prompt("Enter URL for Jira:", "https://jira.com");
      if (workEmailUrl && jiraUrl) {
        chrome.storage.sync.set({ workUrls: [workEmailUrl, jiraUrl] });
        alert("Work URLs updated");
      }
    });
  }

  if (setPersonalUrlsBtn) {
    setPersonalUrlsBtn.addEventListener("click", () => {
      const youtubeUrl = prompt(
        "[Mode: Personal] Enter URL for YouTube:",
        "https://youtube.com"
      );
      const scalerUrl = prompt(
        "[Mode: Personal] Enter URL for Learning App:",
        "https://udemy.com"
      );
      if (youtubeUrl && scalerUrl) {
        chrome.storage.sync.set({ personalUrls: [youtubeUrl, scalerUrl] });
        alert("Personal URLs updated");
      }
    });
  }

  function updateModeTitle(mode) {
    modeTitle.textContent = `Current Mode: ${mode}`;
  }

  chrome.storage.sync.get("mode", (data) => {
    if (data.mode) {
      updateModeTitle(data.mode);
    }
  });
});

