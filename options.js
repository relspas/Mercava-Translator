document.addEventListener("DOMContentLoaded", () => {
  // Load saved settings
  chrome.storage.sync.get(
    ["openAIApiKey", "geminiApiKey", "tooltipColor", "fontSize"],
    (items) => {
      if (items.openAIApiKey) document.getElementById("openAIApiKey").value = items.openAIApiKey;
      if (items.geminiApiKey) document.getElementById("geminiApiKey").value = items.geminiApiKey;
      if (items.tooltipColor) document.getElementById("tooltipColor").value = items.tooltipColor;
      if (items.fontSize) document.getElementById("fontSize").value = items.fontSize;
    }
  );

  // Save button listener
  document.getElementById("save").addEventListener("click", async () => {
    // Declare variables here, inside the listener
    const openAIApiKey = document.getElementById("openAIApiKey").value;
    const geminiApiKey = document.getElementById("geminiApiKey").value;
    const tooltipColor = document.getElementById("tooltipColor").value;
    const fontSize = document.getElementById("fontSize").value;

    await chrome.storage.sync.set({ openAIApiKey, geminiApiKey, tooltipColor, fontSize });

    const status = document.getElementById("status");
    if (status) {
      status.textContent = "Saved!";
      setTimeout(() => (status.textContent = ""), 1500);
    }
  });
});
