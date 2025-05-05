    
    // Reset audio for playback
    function resetAudioForPlayback() {
        // Don't reset the src if already set correctly and recently played
        if (isPlaying === false && !lofiRadio.paused && !lofiRadio.ended) {
            // Just resume existing audio
            return true;
        }
        
        // If connection failed previously, try the next station
        if (connectionAttempts > 0) {
            if (currentStationIndex < lofiStations.length - 1) {
                currentStationIndex++;
            } else {
                currentStationIndex = 0; // Cycle back to first station
            }
            lofiRadio.src = lofiStations[currentStationIndex];
        }
        
        try {
            lofiRadio.load();
            return true;
        } catch (e) {
            console.error("Failed to reset audio:", e);
            return false;
        }
    }
    
    // Function to try playing radio with fallback
    function tryPlayRadio() {
        connectionAttempts++;
        updatePlaybackUI('fetching');
        
        // Make sure our audio is in the right state
        if (!resetAudioForPlayback()) {
            showToast("Connection error. Please refresh the page.");
            updatePlaybackUI('paused');
            return;
        }
        
        // Try to play current station
        const playPromise = lofiRadio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Success! Reset attempts counter
                connectionAttempts = 0;
                console.log("Radio playing successfully!");
                updatePlaybackUI('playing');
                hideToast();
            }).catch(e => {
                console.error('Audio playback error:', e);
                
                // Try next station if we have attempts left
                if (connectionAttempts < MAX_ATTEMPTS && currentStationIndex < lofiStations.length - 1) {
                    currentStationIndex++;
                    lofiRadio.src = lofiStations[currentStationIndex];
                    lofiRadio.load();
                    showToast("Trying another station...");
                    
                    // Try again with a small delay
                    setTimeout(tryPlayRadio, 300);
                } else {
                    updatePlaybackUI('paused');
                    showToast("Connection failed. Try again.");
                    
                    // Reset connection attempts to allow trying again
                    connectionAttempts = 0;
                    
                    // Auto-hide after 2 seconds
                    toastTimeout = setTimeout(() => {
                        hideToast();
                    }, 2000);
                }
            });
        }
    }
    
    // Handle loading errors for audio stream
    lofiRadio.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        if ((isPlaying || isFetching) && currentStationIndex < lofiStations.length - 1) {
            showToast("Connection failed. Trying another station...");
            updatePlaybackUI('fetching');
            
            // Try next station
            currentStationIndex++;
            lofiRadio.src = lofiStations[currentStationIndex];
            lofiRadio.load();
            tryPlayRadio();
        } else if ((isPlaying || isFetching) && currentStationIndex >= lofiStations.length - 1) {
            // We've tried all stations, cycle back to first
            currentStationIndex = 0;
            lofiRadio.src = lofiStations[currentStationIndex];
            lofiRadio.load();
            tryPlayRadio();
        }
    });
    
    // When radio starts playing, start the video
    lofiRadio.addEventListener('playing', () => {
        if (isPlaying || isFetching) {
            // Audio is playing, now play the video
            playVideo();
            updatePlaybackUI('playing');
            
            // Hide toast when radio starts playing
            hideToast();
            console.log("Radio started playing!");
        }
    });
    
    // Add load start event to detect when the station is being fetched
    lofiRadio.addEventListener('loadstart', () => {
        if (isPlaying || isFetching) {
            // Stop video while loading audio
            stopVideo();
            updatePlaybackUI('fetching');
            
            showToast("Fetching from station...");
            
            // Set a shorter timeout to improve perceived performance
            toastTimeout = setTimeout(() => {
                hideToast();
            }, 1000); // 1 second timeout
        }
    });
    
    // Handle ended event - restart if we're still in playing state
    lofiRadio.addEventListener('ended', () => {
        if (isPlaying) {
            // Stream ended unexpectedly, try to restart
            showToast("Stream ended. Reconnecting...");
            
            // Reset audio element and try again
            lofiRadio.src = lofiStations[currentStationIndex];
            lofiRadio.load();
            tryPlayRadio();
        }
    });
    
    // Handle stalled event - when audio download stalls
    lofiRadio.addEventListener('stalled', () => {
        if (isPlaying) {
            showToast("Connection stalled. Reconnecting...");
            
            // Try next station
            if (currentStationIndex < lofiStations.length - 1) {
                currentStationIndex++;
            } else {
                currentStationIndex = 0; // Cycle back to first station
            }
            
            lofiRadio.src = lofiStations[currentStationIndex];
            lofiRadio.load();
            tryPlayRadio();
        }
    });
    
    // Play/Pause button event listener
    playbackControls.addEventListener('click', () => {
        if (isPlaying) {
            // Currently playing, so pause
            lofiRadio.pause();
            stopVideo();
            updatePlaybackUI('paused');
            hideToast();
        } else {
            // Currently paused, so play
            showToast("Connecting to radio...");
            updatePlaybackUI('fetching');
            
            // Don't reset currentTime for streaming audio - it will break the stream
            // lofiRadio.currentTime = 0; 
            
            // Instead, properly reset connection state
            connectionAttempts = 0;
            tryPlayRadio();
        }
    });
    
    // Pre-connect to stations to speed up initial connection
    lofiStations.forEach(station => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = new URL(station).origin;
        document.head.appendChild(link);
    });
}); 
