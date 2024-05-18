// Function to retrieve and display bookmarked URLs
function displayBookmarks() {
  chrome.bookmarks.getTree((bookmarkTree) => {
    // Process the bookmark tree to extract URLs
    const urls = [];
    processBookmarks(bookmarkTree, urls);

    // Display the URLs to the user
    renderURLs(urls);
  });
}

// Recursive function to process bookmark tree and extract URLs
function processBookmarks(bookmarkTree, urls) {
  for (const node of bookmarkTree) {
    if (node.url) {
      urls.push(node.url);
    } else if (node.children) {
      processBookmarks(node.children, urls);
    }
  }
}

// Function to render bookmarked URLs to the user
function renderURLs(urls) {
  const urlList = document.getElementById("urlList");
  for (const url of urls) {
    const listItem = document.createElement("li");
    listItem.textContent = url;
    urlList.appendChild(listItem);
  }
}

// Call displayBookmarks function when the popup page loads
document.addEventListener("DOMContentLoaded", () => {
  displayBookmarks();
});
