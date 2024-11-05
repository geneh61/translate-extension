
let currentVideoId = null;
let translatedCaptions = null;
let captionOverlay = null;
let isTranslating = false;
let targetLanguage = 'en';

function injectToggleButton() {
    const existingButton = document.getElementById('ai-caption-toggle');
    if (existingButton) {
        existingButton.removeEventListener('click', handleToggleClick);
        return existingButton;
    }
  
    const button = document.createElement('button');
    button.id = 'ai-caption-toggle';
    button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
      <path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-8 7H6v-2h5v2zm7 0h-5v-2h5v2zm-7 4H6v-2h5v2zm7 0h-5v-2h5v2z"/>
    </svg>
  `;
    button.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 16px;
      cursor: pointer;
      z-index: 1000;
      padding: 0;
    `;
  
    const player = document.querySelector('.html5-video-player');
    if (player) {
      player.appendChild(button);
      button.addEventListener('click', () => {
        chrome.storage.local.get({ languageCode: 'en' }, (result) => {
          const languageCode = result.languageCode;
          handleToggleClick(languageCode);
        });
      });
    }
    updateToggleButtonState();
    return button;
}

async function handleToggleClick(languageCode) {
    const { apiKey } = await chrome.storage.local.get({ apiKey: "" });

    if (!apiKey) {
        console.log('no api');
        displayCaption(chrome.i18n.getMessage('display_no_api'));
        //displayCaption('No API key found. Please enter an API key in the extension settings.');
        setTimeout(() => displayCaption(''), 5000);
        return;
    }

    if (!translatedCaptions) {
        displayCaption(chrome.i18n.getMessage('display_starting'));
        //displayCaption('Starting translation process...');
        setTimeout(async () => {
            await main(targetLanguage);
            isTranslating = true;
            updateToggleButtonState();
        }, 0);
        // await main(languageCode);
        // isTranslating = true;
    } else {
        isTranslating = !isTranslating;
        displayCaption(isTranslating ? chrome.i18n.getMessage('display_enabled') : chrome.i18n.getMessage('display_disabled'));
        //displayCaption(isTranslating ? 'Captions enabled' : 'Captions disabled');
        setTimeout(() => displayCaption(''), 2000);
    }
    updateToggleButtonState();
}

function updateToggleButtonState() {
    const button = document.getElementById('ai-caption-toggle');
    if (button) {
        button.style.backgroundColor = isTranslating ? 'rgba(0, 128, 0, 0.6)' : 'rgba(0, 0, 0, 0.6)';
        if (captionOverlay) {
            captionOverlay.style.display = isTranslating ? 'block' : 'none';
        }
    }
}

async function translateFullTranscript(transcript, targetLanguage) {
    const MAX_CHARS = 8000;
    const chunks = chunkTranscript(transcript, MAX_CHARS);

    // Send all chunks in a single API call
    const translatedChunks = await translateChunks(chunks, targetLanguage);
    const reassembledTranscript = reassembleTranscript(translatedChunks);
    return reassembleTranscript(translatedChunks);
}

async function main(targetLanguage) {
    const videoId = window.location.href;

    if (videoId !== currentVideoId) {
        cleanup();
        currentVideoId = videoId;
        translatedCaptions = null;
        if (captionOverlay) {
            captionOverlay.textContent = '';
        }
    }

    if (!translatedCaptions) {
        const transcript = await fetchSubtitles(videoId);

        if (!transcript) {
            console.log('Failed to extract transcript');
            displayCaption(chrome.i18n.getMessage('display_failed'));
            //displayCaption('Failed to load captions. Please try refreshing the page');
            return;
        }

        displayCaption(chrome.i18n.getMessage('display_translating'));
        //displayCaption('Translating captions..');
        translatedCaptions = await translateFullTranscript(transcript, targetLanguage);
    }

    const video = document.querySelector('video');

    if (!video) {
        console.log('Video element not found');
        return;
    }

    console.log('Translation state:', isTranslating ? 'enabled' : 'disabled');

    const CAPTION_DELAY = 0;

    const updateCaption = () => {
        if (!isTranslating || !translatedCaptions) {
            displayCaption('');
            return;
        }

        const currentTime = video.currentTime - CAPTION_DELAY;
        const currentCaption = translatedCaptions.find(caption =>
            currentTime >= caption.start && currentTime < (caption.start + caption.dur)
        );

        if (currentCaption) {
            displayCaption(currentCaption.text);
        } else {
            displayCaption('');
        }
    };

    video.addEventListener('timeupdate', updateCaption);

    return () => {
        video.removeEventListener('timeupdate', updateCaption);
    };
}

function cleanup() {
    if (captionOverlay) {
        const player = document.querySelector('.html5-video-player');
        if (player) {
            const resizeObserver = new ResizeObserver(() => {});
            resizeObserver.unobserve(player);
        }
        captionOverlay.remove();
        captionOverlay = null;
    }
    currentVideoId = null;
    translatedCaptions = null;
    isTranslating = false;
    updateToggleButtonState();
}

function initializeExtension() {
    chrome.storage.local.get(['targetLanguage'], function(result) {
        targetLanguage = result.targetLanguage || 'en';
    });
    const toggleButton = injectToggleButton();

    document.querySelectorAll("[data-i18n]").forEach(element => {
        element.textContent = chrome.i18n.getMessage(element.getAttribute("data-i18n"));
    });

    window.addEventListener('yt-navigate-start', cleanup);
    window.addEventListener('yt-navigate-finish', () => {
        cleanup();
        injectToggleButton();
    });
}

initializeExtension();