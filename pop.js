// Function to handle the "Work Mode" button click
document.getElementById("workModeBtn").addEventListener("click", () => {
  // Clear any existing content in the popup
  clearPopupContent();

  // Display the list of bookmarked URLs
  displayBookmarks();
});

// Function to clear any existing content in the popup
function clearPopupContent() {
  const body = document.body;
  body.innerHTML = "<h1>Explore Mode</h1>";
}

// Function to retrieve and display bookmarked URLs
function displayBookmarks() {
  chrome.bookmarks.getTree((bookmarkTree) => {
    // Find the folder containing the work-related bookmarks (adjust folderName as needed)
    const folderName = "Work Bookmarks"; // Change this to match your folder name
    const workFolder = findFolder(bookmarkTree, folderName);

    if (workFolder) {
      // Process the bookmarks in the work folder
      const urls = [];
      processBookmarks(workFolder.children, urls);

      // Display the URLs to the user
      renderURLs(urls);
    } else {
      // Display a message if the folder is not found
      const errorMessage = document.createElement("p");
      errorMessage.textContent = "Work folder not found";
      document.body.appendChild(errorMessage);
    }
  });
}

// Recursive function to find a folder by name in the bookmark tree
function findFolder(bookmarkTree, folderName) {
  for (const node of bookmarkTree) {
    if (node.title === folderName && node.children) {
      return node;
    } else if (node.children) {
      const folder = findFolder(node.children, folderName);
      if (folder) {
        return folder;
      }
    }
  }
  return null;
}

// Recursive function to process bookmark tree and extract URLs
function processBookmarks(bookmarkTree, urls) {
  for (const node of bookmarkTree) {
    if (node.url) {
      urls.push({ url: node.url, title: node.title });
    } else if (node.children) {
      processBookmarks(node.children, urls);
    }
  }
}

// Function to render bookmarked URLs to the user
function renderURLs(urls) {
  const urlList = document.createElement("ul");
  urls.forEach(({ url, title }) => {
    const listItem = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = url;
    const label = document.createElement("label");
    label.textContent = title;
    listItem.appendChild(checkbox);
    listItem.appendChild(label);
    urlList.appendChild(listItem);
  });
  document.body.appendChild(urlList);
}
