chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.local.set({
      apiKey: '',
      targetLanguage: 'en'
    }, function() {
      console.log('Default settings initialized');
    });
});