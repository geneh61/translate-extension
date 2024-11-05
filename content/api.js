async function fetchSubtitles(videoId) {
    try {
        const response = await fetch(videoId);
        const html = await response.text();
        
        // Try to find the captionTracks in the ytInitialPlayerResponse
        const ytInitialPlayerResponse = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (ytInitialPlayerResponse) {
            const playerResponse = JSON.parse(ytInitialPlayerResponse[1]);
            const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;

            if (captionTracks && Array.isArray(captionTracks)) {
                const track = captionTracks.find(t => t.trackName === "");
                if (track) {
                    const subtitle = await fetch(track.baseUrl);
                    const subtitleText = await subtitle.text();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(subtitleText, "text/xml");
                    const textElements = xmlDoc.getElementsByTagName("text");

                    return Array.from(textElements).map(element => ({
                        start: parseFloat(element.getAttribute("start")),
                        dur: parseFloat(element.getAttribute("dur")),
                        text: element.textContent
                    }));
                }
            }
        }
        
        // If the above method fails, try the old method
        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (match) {
            const captionTracks = JSON.parse(match[1]);
            const track = captionTracks.find(t => t.languageCode === lang);
            if (track) {
                const subtitle = await fetch(track.baseUrl);
                const subtitleText = await subtitle.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(subtitleText, "text/xml");
                const textElements = xmlDoc.getElementsByTagName("text");

                return Array.from(textElements).map(element => ({
                    start: parseFloat(element.getAttribute("start")),
                    dur: parseFloat(element.getAttribute("dur")),
                    text: element.textContent
                }));
            }
        }

        throw new Error('No captions found');
    } catch (error) {
        console.log('Error fetching subtitles:', error);
        return null;
    }
}

async function translateChunks(chunks, targetLanguage) {
    const apiKey = (await chrome.storage.local.get({ apiKey: "" })).apiKey;
    
    const translatedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const startNumber = chunk.captions[0].number;
        
        let retries = 3;
        while (retries > 0) {
            try {
                const response = await sendTranslationRequest(chunk.text, targetLanguage, "1.5-flash", "text");
                console.log(response);
                
                if (response.ok && response.body && response.body.candidates && response.body.candidates[0] && response.body.candidates[0].content && response.body.candidates[0].content.parts && response.body.candidates[0].content.parts[0] && response.body.candidates[0].content.parts[0].text) {
                    const translatedText = response.body.candidates[0].content.parts[0].text;
                    const translatedLines = translatedText.split('\n');
                    console.log(translatedText);
                    console.log(translatedLines);
                    
                    translatedChunks.push({
                        originalCaptions: chunk.captions,
                        translatedLines: translatedLines,
                        startNumber: startNumber
                    });
                    break; // Success, exit retry loop
                } else {
                    throw new Error(`Unexpected response structure for chunk ${i + 1}`);
                }
            } catch (error) {
                console.log(`Error translating chunk ${i + 1}:`, error);
                retries--;
                if (retries === 0) {
                    console.log(`Failed to translate chunk ${i + 1} after 3 attempts. Using original text.`);
                    translatedChunks.push({
                        originalCaptions: chunk.captions,
                        translatedLines: chunk.text.split('\n'),
                    });
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
                }
            }
        }
    }

    return translatedChunks;
}

const getSystemPrompt = async (languageCode) => {
    const languageNames = {
      en: "English",
      de: "German",
      es: "Spanish",
      fr: "French",
      it: "Italian",
      pt_br: "Brazilian Portuguese",
      vi: "Vietnamese",
      ru: "Russian",
      ar: "Arabic",
      hi: "Hindi",
      bn: "Bengali",
      zh_cn: "Simplified Chinese",
      zh_tw: "Traditional Chinese",
      ja: "Japanese",
      ko: "Korean"
    };
  
    return `Translate the following captions into ${languageNames[languageCode]}. The input starts with "Captions:" on a separate line. Each caption is formatted as '[start_time-end_time] Text'. Preserve this format in your translation, only translating the text part. Maintain the original number of captions and their time codes. Start your response with "Captions:" on a separate line. Example:

Input:
Captions:
[0.00-3.45] This is the first caption.
[3.46-7.89] This is the second caption.

Output:
Captions:
[0.00-3.45] Dies ist die erste Untertitelung.
[3.46-7.89] Dies ist die zweite Untertitelung.`;
};

const tryJsonParse = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return { error: { message: text } };
    }
};

async function sendTranslationRequest(chunk, targetLanguage) {
    const { apiKey } = await chrome.storage.local.get({ apiKey: "" });
    const systemPrompt = await getSystemPrompt(targetLanguage);
    let contents = [];
    contents.push({
        role: "user",
        parts: [{ text: systemPrompt + "\nText:\n" + chunk }]
    });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                contents: contents,
                safetySettings: [{
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                  },
                  {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_NONE"
                  },
                  {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                  },
                  {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                  }]
            }),
        });

        const responseData = {
            ok: response.ok,
            status: response.status,
            body: tryJsonParse(await response.text()),
        };

        console.log(responseData.body);

        return responseData;
    } catch (error) {
        console.log("Error in content script:", error);
        return {
            ok: false,
            status: 1000,
            body: { error: { message: error.stack } },
        };
    }
}

