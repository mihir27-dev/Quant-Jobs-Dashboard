document.addEventListener('DOMContentLoaded', () => {
  const fields = ['firstName', 'lastName', 'email', 'phone', 'linkedin'];

  // Load existing data
  chrome.storage.local.get("profile", (data) => {
    if (data.profile) {
      fields.forEach(f => {
        if (data.profile[f]) document.getElementById(f).value = data.profile[f];
      });
    }
  });

  // Save profile
  document.getElementById('saveBtn').addEventListener('click', () => {
    const profile = {};
    fields.forEach(f => {
      profile[f] = document.getElementById(f).value;
    });
    chrome.storage.local.set({ profile }, () => {
      alert("Profile saved!");
    });
  });

  // Trigger autofill
  document.getElementById('autofillBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "autofill" }, (response) => {
        if (chrome.runtime.lastError) {
          alert("Could not connect to the page. Make sure you are on a supported job board and refresh the page.");
        }
      });
    });
  });
});
