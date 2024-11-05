function createCaptionOverlay() {
    if (captionOverlay) {
        document.body.removeChild(captionOverlay);
    }
    captionOverlay = document.createElement('div');
    captionOverlay.id = 'ai-caption-overlay';
    captionOverlay.style.cssText = `
        position: absolute;
        bottom: 60px;
        left: 0;
        right: 0;
        text-align: center;
        color: white;
        font-size: 20px;
        margin: 0 auto;
        border-radius: 4px;
        max-width: 80%;
        padding: 5px 10px;
        background-color: rgba(0, 0, 0, 0.7);
        text-shadow: 1px 1px 2px black;
        z-index: 1000;
        pointer-events: none;
        display: none;
    `;
    adjustCaptionPosition();
    
    const player = document.querySelector('.html5-video-player');
    if (player) {
        const resizeObserver = new ResizeObserver(() => {
            adjustCaptionPosition();
        });
        resizeObserver.observe(player);
    }
    return captionOverlay;
}

function displayCaption(text) {
    const overlay = captionOverlay || createCaptionOverlay();
    overlay.textContent = text;
    overlay.style.display = text ? 'block' : 'none';

    const player = document.querySelector('.html5-video-player');
    if (player && !player.contains(overlay)) {
        player.appendChild(overlay);
    }
}

function adjustCaptionPosition() {
    const controls = document.querySelector('.ytp-chrome-bottom');
    if (controls && captionOverlay) {
        const controlsHeight = controls.offsetHeight;
        captionOverlay.style.bottom = `${controlsHeight + 10}px`;
    }
}

function chunkTranscript(transcript, chunkSize) {
    const chunks = [];
    let currentChunk = { captions: [], text: "Captions:\n" };

    transcript.forEach(caption => {
        const captionText = `[${caption.start.toFixed(2)}-${(caption.start + caption.dur).toFixed(2)}] ${caption.text}\n`;
        if ((currentChunk.text + captionText).length > chunkSize && currentChunk.captions.length >= 40) {
            chunks.push(currentChunk);
            currentChunk = { captions: [], text: "Captions:\n" };
        }

        currentChunk.captions.push(caption);
        currentChunk.text += captionText;
    });

    if (currentChunk.captions.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

function reassembleTranscript(translatedChunks) {
    const translatedTranscript = [];

    translatedChunks.forEach((chunk, chunkIndex) => {
        const translatedLines = chunk.translatedLines;
        const originalCaptions = chunk.originalCaptions;

        let startIndex = translatedLines[0].trim().toLowerCase() === "captions:" ? 1 : 0;

        originalCaptions.forEach((originalCaption, index) => {
            if (startIndex + index < translatedLines.length) {
                const line = translatedLines[startIndex + index];
                const match = line.match(/\[(\d+\.\d+)-(\d+\.\d+)\]\s(.+)/);
                if (match) {
                    const start = parseFloat(match[1]);
                    const end = parseFloat(match[2]);
                    const text = match[3].trim();
                    
                    translatedTranscript.push({
                        start: originalCaption.start,
                        dur: originalCaption.dur,
                        text: text
                    });
                } else {
                    //console.warn(`Chunk ${chunkIndex + 1}: Unexpected format for line: ${line}`);
                    // Fallback to original caption if format is unexpected
                    translatedTranscript.push(originalCaption);
                }
            } else {
                //console.warn(`Chunk ${chunkIndex + 1}: Missing translation for caption ${index + 1}`);
                // Fallback to original caption if translation is missing
                translatedTranscript.push(originalCaption);
            }
        });

        if (translatedLines.length - startIndex > originalCaptions.length) {
            //console.warn(`Chunk ${chunkIndex + 1}: ${translatedLines.length - startIndex - originalCaptions.length} extra translated lines`);
        }
    });

    return translatedTranscript;
}

