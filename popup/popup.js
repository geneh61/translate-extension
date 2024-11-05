document.getElementById('options-button').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
});
document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = chrome.i18n.getMessage(element.getAttribute("data-i18n"));
});