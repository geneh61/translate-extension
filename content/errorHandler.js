const ERROR_MESSAGES = {
    NO_API_KEY: 'No API key found. Please enter an API key in the extension settings.',
    FETCH_FAILED: 'Failed to fetch subtitles. Please try again.',
    TRANSLATION_FAILED: 'Translation failed. Please check your API key and try again.',
    UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
  };
  
function handleError(error) {
    console.error('Error:', error);
    let message = ERROR_MESSAGES.UNEXPECTED_ERROR;
    
    if (error.message === 'No API key found') {
      message = ERROR_MESSAGES.NO_API_KEY;
    } else if (error.message === 'Failed to fetch subtitles') {
      message = ERROR_MESSAGES.FETCH_FAILED;
    } else if (error.message === 'Translation failed') {
      message = ERROR_MESSAGES.TRANSLATION_FAILED;
    }
  
    displayCaption(message);
    setTimeout(() => displayCaption(''), 5000);
}