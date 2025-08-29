const SELECT_ALL_RASHI_QUERY_SELECTOR = ".text_rashi_dh, .line_rashi > .seg";

async function getSettings() {
  return await chrome.storage.sync.get(["openAIApiKey","geminiApiKey"]);
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
      "Authorization": "Bearer "+openAIApiKey
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
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key="+geminiApiKey,
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
async function showTooltipPersistent(el, translationPromise, group) {
  // Apply persistent highlight
  group.forEach(g => g.classList.add("highlight-clicked"));

  // Create tooltip container
  const tooltip = document.createElement("div");
  tooltip.className = "rashi-tooltip";

  // --- Dropdown for LLM selection ---
  const dropdownDiv = document.createElement("div");
  dropdownDiv.className = "dropdown-container";
  const dropdown = document.createElement("select");
  dropdown.className = "llm-selector";

  //which llms are available for this user
  const llms = []
  const { openAIApiKey,geminiApiKey } = await getSettings();
  if (openAIApiKey != "") llms.push("GPT-4", "GPT-3.5");
  if (geminiApiKey != "") llms.push("Gemini");

  llms.forEach(llm => {
    const option = document.createElement("option");
    option.value = llm;
    option.textContent = llm;
    dropdown.appendChild(option);
  });

  // Create the reset button
  const resetBtn = document.createElement("button");
  resetBtn.className = "reset-btn";
  resetBtn.textContent = "↺";

  // --- Translation container ---
  const translationDiv = document.createElement("div");
  translationDiv.className = "translation-result";
  translationDiv.textContent = "Translating…";

  tooltip.appendChild(translationDiv);
  document.body.appendChild(tooltip);

  // Position tooltip
  const rect = el.getBoundingClientRect();
  tooltip.style.top = `${window.scrollY + rect.bottom + 5}px`;
  tooltip.style.left = `${window.scrollX + rect.left}px`;

  // Handle translation resolution
  translationPromise
    .then(translation => {
      if (document.body.contains(tooltip)) {
        translationDiv.textContent = translation || "[No translation available]";
      }
    })
    .catch(err => {
      console.error("Translation error:", err);
      if (document.body.contains(tooltip)) {
        translationDiv.textContent = "[Translation failed]";
      }
    }).then(() => {  
      dropdownDiv.appendChild(dropdown);
      dropdownDiv.appendChild(resetBtn);
      tooltip.appendChild(dropdownDiv);
    })

  // Click outside handler
  function handleClickOutside(event) {
    if (!tooltip.contains(event.target) && !group.some(g => g.contains(event.target))) {
      tooltip.remove();
      group.forEach(g => g.classList.remove("highlight-clicked"));
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);

  // Example: when dropdown changes, log it (replace with API call if needed)
  function translateGroup() {
    const text = group.map(e => e.innerText).join(" ");
    translationDiv.textContent = "Translating…";

    let translationPromise;
    if (dropdown.value === "GPT-4") {
      translationPromise = translateTextOpenAI(text);
    } else if (dropdown.value === "Gemini") {
      translationPromise = translateTextGemini(text);
    } else {
      translationPromise = translateSimulate(text); // fallback/mock
    }

    translationPromise
      .then(translation => {
        if (document.body.contains(tooltip)) {
          translationDiv.textContent = translation || "[No translation available]";
        }
      })
      .catch(err => {
        if (document.body.contains(tooltip)) {
          translationDiv.textContent = "[Translation failed]";
        }
      });
  }

  // Use the shared function in both events
  dropdown.addEventListener("change", translateGroup);
  resetBtn.addEventListener("click", translateGroup);
}


// Example translation function returning a promise
async function translateSimulate(text) {
  await new Promise(resolve => setTimeout(resolve, 1000)); // delay
  return "Translated: " + text; // mock translation
}

// Main function: attach hover and click to Rashi groups
function addHover() {
  const spans = Array.from(document.querySelectorAll(SELECT_ALL_RASHI_QUERY_SELECTOR));
  console.log("Found dh and segs:", spans);

  const filtered = [];
  let lastWasDh = false;
  for (const span of spans) {
    const isDh = span.classList.contains("text_rashi_dh");
    const isSeg = span.classList.contains("seg");
    if (!(isDh && lastWasDh) && !isSeg) {
      filtered.push(span);
    }
    lastWasDh = isDh;
  }
  console.log("reduced dh:", filtered);

  filtered.forEach((dhSpan,index) => {

    const group = [];
    let el = dhSpan;
    const nextInFiltered = filtered[index + 1] || null;
    while (el) {
      // Stop if we reach tosafot
      if (el.id === "tosafot" || el.closest("#tosafot")) break;
      // Stop before the next dh span, except the starting element
      if (el === nextInFiltered) break;
      group.push(el);
      // Move to the next element in document order
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
      
      // el.addEventListener("click", () => {
      //   const text = group.map(e => e.innerText).join(" ");
      //   showTooltipPersistent(el, translateTextGemini(text), group);
      // });
      el.addEventListener("click", () => {
        const text = group.map(e => e.innerText).join(" ");
        showTooltipPersistent(el, translateTextOpenAI(text), group);
      });
    });
  });
}

// Dual observers. observer runs addHover when rashi populates. observer2 watches for rashi being removed.
// When rashi is removed, observer2 disconnects and re-enables observer to wait for rashi to reappear.
const observer2 = new MutationObserver((mutations, obs) => {
  const spans = Array.from(document.querySelectorAll(".line_rashi"));
  if (spans.length == 0) {
    // console.log("Found rashi", spans);
    obs.disconnect();
    observer.observe(document.body, { childList: true, subtree: true });
  }
});

const observer = new MutationObserver((mutations, obs) => {
  const spans = Array.from(document.querySelectorAll(SELECT_ALL_RASHI_QUERY_SELECTOR));
  if (spans.length > 0) {
    // console.log("Found rashi", spans);
    obs.disconnect();
    addHover(spans);
    observer2.observe(document.body, { childList: true, subtree: true });
  }
});

observer.observe(document.body, { childList: true, subtree: true });