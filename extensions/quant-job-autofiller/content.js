console.log("Quant Jobs Auto-Filler extension loaded on this page.");

// Basic skeleton for form filling
function autoFill() {
  chrome.storage.local.get("profile", (data) => {
    if (!data.profile) {
      console.log("No profile found. Please set one up in the extension popup.");
      return;
    }

    const { firstName, lastName, email, phone, linkedin, github } = data.profile;

    // Greenhouse mappings
    if (window.location.hostname.includes("greenhouse.io")) {
      const inputs = {
        "first_name": firstName,
        "last_name": lastName,
        "email": email,
        "phone": phone,
        "job_application_answers_attributes_0_text_value": linkedin, // often linkedin
      };

      for (const [id, value] of Object.entries(inputs)) {
        const el = document.getElementById(id);
        if (el && value) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }

    // Lever mappings
    if (window.location.hostname.includes("lever.co")) {
      const nameEl = document.querySelector("input[name='name']");
      const emailEl = document.querySelector("input[name='email']");
      const phoneEl = document.querySelector("input[name='phone']");

      if (nameEl && firstName && lastName) { nameEl.value = `${firstName} ${lastName}`; nameEl.dispatchEvent(new Event('input', { bubbles: true })); }
      if (emailEl && email) { emailEl.value = email; emailEl.dispatchEvent(new Event('input', { bubbles: true })); }
      if (phoneEl && phone) { phoneEl.value = phone; phoneEl.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autofill") {
    autoFill();
    sendResponse({ success: true });
  }
});
