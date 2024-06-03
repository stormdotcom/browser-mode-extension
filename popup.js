document.addEventListener("DOMContentLoaded", () => {
  const workModeBtn = document.getElementById("workModeBtn");
  const personalModeBtn = document.getElementById("personalModeBtn");
  const setWorkUrlsBtn = document.getElementById("setWorkUrlsBtn");
  const setPersonalUrlsBtn = document.getElementById("setPersonalUrlsBtn");
  const modeTitle = document.getElementById("modeTitle");

  chrome.windows.getAll({}, (windows) => {
    if (windows.length > 1) {
      return;
    }

    if (workModeBtn) {
      workModeBtn.addEventListener("click", () => {
        chrome.storage.sync.set({ mode: "work" }, () => {
          updateModeTitle("work");
          alert("Switched to Work Mode");
        });
      });
    }

    if (personalModeBtn) {
      personalModeBtn.addEventListener("click", () => {
        chrome.storage.sync.set({ mode: "personal" }, () => {
          updateModeTitle("personal");
          alert("Switched to Personal Mode");
        });
      });
    }

    if (setWorkUrlsBtn) {
      setWorkUrlsBtn.addEventListener("click", () => {
        const workEmailUrl = prompt(
          "Enter URL for Work Email:",
          "https://mail.example.com"
        );
        const jiraUrl = prompt(
          "Enter URL for Jira:",
          "https://jira.example.com"
        );
        if (workEmailUrl && jiraUrl) {
          chrome.storage.sync.set({ workUrls: [workEmailUrl, jiraUrl] });
          alert("Work URLs updated");
        }
      });
    }

    if (setPersonalUrlsBtn) {
      setPersonalUrlsBtn.addEventListener("click", () => {
        const youtubeUrl = prompt(
          "Enter URL for YouTube:",
          "https://youtube.com"
        );
        const scalerUrl = prompt(
          "Enter URL for Learning App:",
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
});
