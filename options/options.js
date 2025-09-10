document.addEventListener("DOMContentLoaded", () => {
  // Load saved settings
  chrome.storage.sync.get(
    ["openAIApiKey", "geminiApiKey"],
    (items) => {
      if (items.openAIApiKey) document.getElementById("openAIApiKey").value = items.openAIApiKey;
      if (items.geminiApiKey) document.getElementById("geminiApiKey").value = items.geminiApiKey;
    }
  );

  // Save button listener
  document.getElementById("save").addEventListener("click", async () => {
    // Declare variables here, inside the listener
    const openAIApiKey = document.getElementById("openAIApiKey").value;
    const geminiApiKey = document.getElementById("geminiApiKey").value;

    await chrome.storage.sync.set({ openAIApiKey, geminiApiKey});

    const status = document.getElementById("status");
    if (status) {
      status.textContent = "Saved!";
      setTimeout(() => (status.textContent = ""), 1500);
    }
  });
});
