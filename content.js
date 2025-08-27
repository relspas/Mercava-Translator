async function getSettings() {
  return await chrome.storage.sync.get(["openAIApiKey","geminiApiKey", "tooltipColor", "fontSize"]);
}

// Helper: check if an element is just whitespace
function isWhitespace(el) {
  return (el.nodeType === Node.TEXT_NODE && !el.textContent.trim()) ||
         (el.nodeType === Node.ELEMENT_NODE && el.textContent.trim() === "");
}

// Helper: traverse to next element in document order if needed
function getNextFromParent(el) {
  let parent = el.parentElement;
  while (parent) {
    if (parent.nextElementSibling) {
      return parent.nextElementSibling.firstElementChild || parent.nextElementSibling;
    }
    parent = parent.parentElement;
  }
  return null;
}

// Function to fetch translation from LLM API (replace with your API)
async function translateTextOpenAI(text) {
  const { openAIApiKey } = await getSettings();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer "+openAIApiKey // Replace with your key
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Translate Talmudic Rashi text to English concisely." },
        { role: "user", content: text }
      ]
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

async function translateTextGemini(text) {
  const { geminiApiKey } = await getSettings();
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key="+geminiApiKey, // replace API_KEY with your key
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: "Translate Talmudic Rashi text to English concisely." },
              { text: text }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}


// Function to show a tooltip with persistent highlight
function showTooltipPersistent(el, translationPromise, group) {
  // Apply persistent highlight
  group.forEach(g => g.classList.add("highlight-clicked"));

  // Create tooltip
  const tooltip = document.createElement("div");
  tooltip.className = "rashi-tooltip";
  tooltip.textContent = "Translating…";
  document.body.appendChild(tooltip);

  const rect = el.getBoundingClientRect();
  tooltip.style.top = `${window.scrollY + rect.bottom + 5}px`;
  tooltip.style.left = `${window.scrollX + rect.left}px`;

  // Update tooltip when translation resolves
  translationPromise
    .then(translation => {
      if (document.body.contains(tooltip)) {
        tooltip.textContent = translation || "[No translation available]";
      }
    })
    .catch(err => {
      console.error("Translation error:", err);
      if (document.body.contains(tooltip)) tooltip.textContent = "[Translation failed]";
    });

  // Click outside handler
  function handleClickOutside(event) {
    if (!tooltip.contains(event.target) && !group.some(g => g.contains(event.target))) {
      tooltip.remove();
      group.forEach(g => g.classList.remove("highlight-clicked"));
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
}

// Example translation function returning a promise
async function translateSimulate(text) {
  await new Promise(resolve => setTimeout(resolve, 1000)); // delay
  return "Translated: " + text; // mock translation
}

// Main function: attach hover and click to Rashi groups
function addHover() {
  const dhSpans = document.querySelectorAll(".text_rashi_dh:not([data-highlighted])");
  dhSpans.forEach(dhSpan => {
    dhSpan.setAttribute("data-highlighted", "true");

    const group = [];
    let el = dhSpan;
    while (el) {
      if (el.id === "tosafot" || el.closest("#tosafot")) break;
      group.push(el);
      if (el.nextElementSibling && el.nextElementSibling.classList.contains("text_rashi_dh")) break;
      el = el.nextElementSibling || getNextFromParent(el);
    }

    // Remove trailing whitespace elements
    while (group.length && isWhitespace(group[group.length - 1])) {
      group.pop();
    }

    // Attach hover and click events
    group.forEach(el => {
      el.addEventListener("mouseenter", () => group.forEach(g => g.classList.add("highlight")));
      el.addEventListener("mouseleave", () => group.forEach(g => g.classList.remove("highlight")));

      // el.addEventListener("click", () => {
      //   const text = group.map(e => e.innerText).join(" ");
      //   showTooltipPersistent(el, translateSimulate(text), group);
      // });
      el.addEventListener("click", () => {
        const text = group.map(e => e.innerText).join(" ");
        showTooltipPersistent(el, translateTextGemini(text), group);
      });
    });
  });
}

// Initial run
addHover();

// Observe dynamic content
const observer = new MutationObserver(addHover);
observer.observe(document.body, { childList: true, subtree: true });
