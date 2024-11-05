document.addEventListener('DOMContentLoaded', function() {
    // Load saved options
    chrome.storage.local.get(['apiKey', 'targetLanguage'], function(result) {
      document.getElementById('api-key').value = result.apiKey || '';
      document.getElementById('target-language').value = result.targetLanguage || 'en';
    });
  
    // Save options
    document.getElementById('options-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const apiKey = document.getElementById('api-key').value;
      const targetLanguage = document.getElementById('target-language').value;
      chrome.storage.local.set({
        apiKey: apiKey,
        targetLanguage: targetLanguage
      }, function() {
        // Update status to let user know options were saved.
        const status = document.createElement('div');
        status.textContent = chrome.i18n.getMessage('options_button_saved');
        document.body.appendChild(status);
        setTimeout(function() {
          status.remove();
        }, 750);
      });
    });
    document.querySelectorAll("[data-i18n]").forEach(element => {
        element.textContent = chrome.i18n.getMessage(element.getAttribute("data-i18n"));
    });
  });