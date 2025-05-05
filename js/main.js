document.addEventListener('DOMContentLoaded', () => {
    const playbackControls = document.querySelector('.playback-controls');
    const playButton = document.querySelector('.play-button');
    const pauseButton = document.querySelector('.pause-button');
    const danceVideo = document.getElementById('danceVideo');
    const lofiRadio = document.getElementById('lofiRadio');
    const toast = document.getElementById('toast');
    const radioElement = document.querySelector('.radio');
    const bottomStrip = document.querySelector('.bottom-strip');
    const blinkingText = document.querySelector('.blinking-text');
    
    // Add click event listener to the bottom strip
    bottomStrip.addEventListener('click', () => {
        window.open('https://www.linkedin.com/in/sudharsan-sarathi/', '_blank');
    });
    
    // Set volume to 25%
    lofiRadio.volume = 0.25; // Set volume to exactly 25%

    let isPlaying = false;
    let isFetching = false;
    let toastTimeout;
    let connectionAttempts = 0;
    const MAX_ATTEMPTS = 5;
    let connectionTimeout;
    let audioContext;
    let analyser;
    let audioSource;
    let animationId;
    let audioStreamActive = false;
    
    // Add CSS to ensure playback controls are 44px x 44px
    const style = document.createElement('style');
    style.textContent = `
        .playback-controls {
            width: 44px !important;
            height: 44px !important;
        }
        .play-button,
        .pause-button {
            width: 44px !important;
            height: 44px !important;
        }
    `;
    document.head.appendChild(style);
    
    // Free Lofi Stations URLs (prioritized by connection speed)
    const lofiStations = [
        'https://ice6.somafm.com/groovesalad-128-mp3', // SomaFM Groove Salad - ambient/downtempo
        'https://ice4.somafm.com/groovesalad-128-mp3', // SomaFM Groove Salad (backup)
        'https://ice2.somafm.com/fluid-128-mp3',       // SomaFM Fluid - instrumental hiphop
        'https://ice6.somafm.com/fluid-128-mp3',       // SomaFM Fluid (backup)
        'https://ice1.somafm.com/vaporwaves-128-mp3',  // SomaFM Vaporwaves
        'https://ice4.somafm.com/vaporwaves-128-mp3',  // SomaFM Vaporwaves (backup)
        'https://ice1.somafm.com/deepspaceone-128-mp3', // SomaFM Deep Space One
        'https://ice4.somafm.com/deepspaceone-128-mp3', // SomaFM Deep Space One (backup)
        'https://ice2.somafm.com/dronezone-128-mp3',   // SomaFM Drone Zone
        'https://ice6.somafm.com/dronezone-128-mp3',   // SomaFM Drone Zone (backup)
        'https://ice1.somafm.com/spacestation-128-mp3', // SomaFM Space Station
        'https://ice4.somafm.com/spacestation-128-mp3', // SomaFM Space Station (backup)
        'https://ice2.somafm.com/beatblender-128-mp3', // SomaFM Beat Blender
        'https://ice6.somafm.com/beatblender-128-mp3', // SomaFM Beat Blender (backup)
        'https://ice2.somafm.com/gsclassic-128-mp3',   // SomaFM Groove Salad Classic
        'https://ice6.somafm.com/gsclassic-128-mp3',   // SomaFM Groove Salad Classic (backup)
        'https://ice1.somafm.com/lush-128-mp3',        // SomaFM Lush
        'https://ice4.somafm.com/lush-128-mp3',        // SomaFM Lush (backup)
        'https://ice2.somafm.com/defcon-128-mp3',      // SomaFM DEF CON
        'https://ice6.somafm.com/defcon-128-mp3'       // SomaFM DEF CON (backup)
    ];
    
    // Station names for display
    const stationNames = [
        'SomaFM Groove Salad',
        'SomaFM Groove Salad (Alt)',
        'SomaFM Fluid',
        'SomaFM Fluid (Alt)',
        'SomaFM Vaporwaves',
        'SomaFM Vaporwaves (Alt)',
        'SomaFM Deep Space One',
        'SomaFM Deep Space One (Alt)',
        'SomaFM Drone Zone',
        'SomaFM Drone Zone (Alt)',
        'SomaFM Space Station',
        'SomaFM Space Station (Alt)',
        'SomaFM Beat Blender',
        'SomaFM Beat Blender (Alt)',
        'SomaFM Groove Salad Classic',
        'SomaFM Groove Salad Classic (Alt)',
        'SomaFM Lush',
        'SomaFM Lush (Alt)',
        'SomaFM DEF CON',
        'SomaFM DEF CON (Alt)'
    ];
    
    // Create navigation buttons
    const createNavigationButtons = () => {
        // Container for the buttons
        const navContainer = document.createElement('div');
        navContainer.className = 'navigation-buttons';
        navContainer.style.position = 'absolute';
        navContainer.style.top = '29%'; // Position above the radio
        navContainer.style.left = '56%';
        navContainer.style.transform = 'translateX(-50%)';
        navContainer.style.display = 'flex';
        navContainer.style.alignItems = 'center';
        navContainer.style.width = '80px'; // Smaller width without the station display
        navContainer.style.zIndex = '20';
        
        // Back button
        const backButton = document.createElement('img');
        backButton.src = 'assets/back_button.png';
        backButton.className = 'nav-button back-button';
        backButton.style.height = '12px';
        backButton.style.width = 'auto';
        backButton.style.cursor = 'pointer';
        backButton.style.transition = 'transform 0.1s ease-in-out';
        
        // Next button
        const nextButton = document.createElement('img');
        nextButton.src = 'assets/next_button.png';
        nextButton.className = 'nav-button next-button';
        nextButton.style.height = '12px';
        nextButton.style.width = 'auto';
        nextButton.style.paddingLeft = '4px';
        nextButton.style.cursor = 'pointer';
        nextButton.style.transition = 'transform 0.1s ease-in-out';
        
        // Add mouse events for desktop
        backButton.addEventListener('mousedown', () => {
            backButton.style.transform = 'translateY(2px)';
        });
        
        backButton.addEventListener('mouseup', () => {
            backButton.style.transform = 'translateY(0)';
            
            // Change to previous station
            currentStationIndex = (currentStationIndex - 1 + lofiStations.length) % lofiStations.length;
            changeStation();
        });
        
        nextButton.addEventListener('mousedown', () => {
            nextButton.style.transform = 'translateY(2px)';
        });
        
        nextButton.addEventListener('mouseup', () => {
            nextButton.style.transform = 'translateY(0)';
            
            // Change to next station
            currentStationIndex = (currentStationIndex + 1) % lofiStations.length;
            changeStation();
        });
        
        // Add touch events for mobile devices
        backButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            backButton.style.transform = 'translateY(2px)';
        });
        
        backButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            backButton.style.transform = 'translateY(0)';
            
            // Change to previous station
            currentStationIndex = (currentStationIndex - 1 + lofiStations.length) % lofiStations.length;
            changeStation();
        });
        
        nextButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            nextButton.style.transform = 'translateY(2px)';
        });
        
        nextButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            nextButton.style.transform = 'translateY(0)';
            
            // Change to next station
            currentStationIndex = (currentStationIndex + 1) % lofiStations.length;
            changeStation();
        });
        
        // Add mouseout event to reset transform if mouse leaves button while pressed
        backButton.addEventListener('mouseout', () => {
            backButton.style.transform = 'translateY(0)';
        });
        
        nextButton.addEventListener('mouseout', () => {
            nextButton.style.transform = 'translateY(0)';
        });
        
        // Add touchcancel event to handle interrupted touch events
        backButton.addEventListener('touchcancel', () => {
            backButton.style.transform = 'translateY(0)';
        });
        
        nextButton.addEventListener('touchcancel', () => {
            nextButton.style.transform = 'translateY(0)';
        });
        
        // Add buttons to container
        navContainer.appendChild(backButton);
        navContainer.appendChild(nextButton);
        
        // Add container to radio element to move with animation
        const radioElement = document.querySelector('.radio');
        radioElement.appendChild(navContainer);
    };
    
    // Function to change station
    const changeStation = () => {
        const wasPlaying = isPlaying;
        
        // Pause current playback
        if (isPlaying) {
            lofiRadio.pause();
            stopVideo();
            updatePlaybackUI('paused');
        }
        
        // Update station source
        lofiRadio.src = lofiStations[currentStationIndex];
        lofiRadio.load();
        
        showToast(`Changed to station ${currentStationIndex + 1}`);
        
        // Resume playback if it was playing
        if (wasPlaying) {
            showToast("Connecting to radio...");
            updatePlaybackUI('fetching');
            connectionAttempts = 0;
            tryPlayRadio();
        }
    };
    
    // Immediately set the src to the first station
    let currentStationIndex = 0;
    lofiRadio.src = lofiStations[currentStationIndex];
    lofiRadio.preload = "auto";
    lofiRadio.crossOrigin = "anonymous"; // Add CORS support
    
    // Add error handling
    lofiRadio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        if (isPlaying && connectionAttempts < MAX_ATTEMPTS) {
            // Try alternating between primary and backup servers
            if (currentStationIndex % 2 === 0 && currentStationIndex + 1 < lofiStations.length) {
                // Try the backup server for the same station
                currentStationIndex++;
            } else {
                // Move to next station's primary server
                currentStationIndex = (currentStationIndex + 1) % lofiStations.length;
                if (currentStationIndex % 2 === 1) {
                    currentStationIndex++;
                }
            }
            
            // Make sure we don't go out of bounds
            currentStationIndex = currentStationIndex % lofiStations.length;
            
            showToast(`Connection error. Trying ${stationNames[currentStationIndex]}...`);
            lofiRadio.src = lofiStations[currentStationIndex];
            lofiRadio.load();
            setTimeout(tryPlayRadio, 300);
        }
    });
    
    // Add stalled event handler
    lofiRadio.addEventListener('stalled', () => {
        if (isPlaying) {
            showToast("Stream stalled. Reconnecting...");
            // Wait a bit and then try to resume
            setTimeout(() => {
                if (isPlaying) {
                    lofiRadio.load();
                    lofiRadio.play().catch(e => {
                        console.error("Error resuming after stall:", e);
                        tryPlayRadio();
                    });
                }
            }, 2000);
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
    
    // Create navigation buttons after DOM is fully loaded
    createNavigationButtons();
    
    // Force load the audio immediately
    lofiRadio.load();
    
    // Set up audio analysis
    function setupAudioAnalysis() {
        try {
            // Create audio context if not already created
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            // Only create analyzer and connect source if not already done
            if (!analyser) {
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
            }
            
            // Properly handle reconnection by disconnecting any previous connections first
            if (audioSource) {
                try {
                    audioSource.disconnect();
                } catch (e) {
                    console.log("No need to disconnect source");
                }
            }
            
            // Create a new media element source each time
            audioSource = audioContext.createMediaElementSource(lofiRadio);
            audioSource.connect(analyser);
            analyser.connect(audioContext.destination);
            
            audioStreamActive = true;
            console.log("Audio analysis setup completed");
        } catch (error) {
            console.error("Error setting up audio analysis:", error);
            // Continue without visualization if there's an error
        }
    }
    
    // Analyze audio and adjust radio movement
    function analyzeAudio() {
        if (!isPlaying || !audioContext || !analyser) return;
        
        try {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteFrequencyData(dataArray);
            
            // Get average bass frequencies (typically 0-100 Hz)
            const bassSum = dataArray.slice(0, 5).reduce((acc, val) => acc + val, 0);
            const bassAvg = bassSum / 5;
            
            // Get average mid-range frequencies
            const midSum = dataArray.slice(5, 15).reduce((acc, val) => acc + val, 0);
            const midAvg = midSum / 10;
            
            // Calculate intensity based on bass and mid-range (gives a gentler response)
            const intensity = (bassAvg * 0.6 + midAvg * 0.4) / 255;
            
            // Apply gentle movement based on audio intensity
            if (intensity > 0.05) {
                radioElement.classList.add('playing');
            } else {
                radioElement.classList.remove('playing');
            }
        } catch (error) {
            console.error("Error analyzing audio:", error);
        }
        
        // Continue analyzing
        animationId = requestAnimationFrame(analyzeAudio);
    }
    
    // Stop audio analysis
    function stopAudioAnalysis() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        radioElement.classList.remove('playing');
    }
    
    // Update UI based on playback state
    function updatePlaybackUI(state) {
        playbackControls.classList.remove('playing', 'fetching');
        
        if (state === 'playing') {
            playbackControls.classList.add('playing');
            isPlaying = true;
            isFetching = false;
            
            // Start audio analysis for visualization if not already active
            if (!audioStreamActive) {
                setupAudioAnalysis();
            }
            analyzeAudio();
        } else if (state === 'fetching') {
            playbackControls.classList.add('fetching');
            isPlaying = false;
            isFetching = true;
            stopAudioAnalysis();
        } else {
            // Paused state
            isPlaying = false;
            isFetching = false;
            stopAudioAnalysis();
        }
    }
    
    // Fast connection test to adjust station order
    function fastConnectionTest() {
        // Create a map of test results for each station
        const stationLatencies = new Map();
        const stationPromises = [];
        
        // Test primary stations only (even indices)
        for (let i = 0; i < lofiStations.length; i += 2) {
            const stationUrl = lofiStations[i];
            
            // Create a promise for each station test
            const promise = new Promise((resolve) => {
                const startTime = performance.now();
                const testAudio = new Audio();
                
                // Set a timeout for the test
                const timeout = setTimeout(() => {
                    // If it takes too long, mark as unreachable
                    stationLatencies.set(i, Infinity);
                    resolve();
                }, 5000);
                
                testAudio.addEventListener('canplaythrough', () => {
                    clearTimeout(timeout);
                    const endTime = performance.now();
                    const latency = endTime - startTime;
                    stationLatencies.set(i, latency);
                    testAudio.src = '';
                    resolve();
                }, { once: true });
                
                testAudio.addEventListener('error', () => {
                    clearTimeout(timeout);
                    stationLatencies.set(i, Infinity);
                    resolve();
                }, { once: true });
                
                // Start loading the audio
                testAudio.src = stationUrl;
                testAudio.load();
            });
            
            stationPromises.push(promise);
        }
        
        // Wait for all tests to complete
        Promise.all(stationPromises).then(() => {
            // Sort stations by latency
            const stationOrder = Array.from(stationLatencies.entries())
                .sort((a, b) => a[1] - b[1])
                .map(entry => entry[0]);
            
            // Only reorder if we found at least one working station
            if (stationOrder.length > 0 && stationOrder[0] !== 0 && stationLatencies.get(stationOrder[0]) !== Infinity) {
                // Start with the fastest station
                currentStationIndex = stationOrder[0];
                lofiRadio.src = lofiStations[currentStationIndex];
                lofiRadio.load();
                console.log("Fast connection test complete. Starting with station:", stationNames[currentStationIndex]);
            }
        });
    }

    // Run the fast connection test when the page loads
    setTimeout(fastConnectionTest, 1000);
    
    // Handle video loading
    function loadVideo() {
        if (!danceVideo.querySelector('source').src.includes('dance.mp4')) {
            danceVideo.querySelector('source').src = 'assets/dance.mp4';
            danceVideo.load();
        }
        
        danceVideo.addEventListener('canplay', () => {
            console.log('Video ready to play');
        });
    }
    
    function playVideo() {
        danceVideo.muted = false;
        
        const playPromise = danceVideo.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Fallback to muted if necessary
                danceVideo.muted = true;
                danceVideo.play().catch(e => console.error('Video playback failed'));
            });
        }
    }
    
    function stopVideo() {
        danceVideo.pause();
        danceVideo.currentTime = 0;
    }
    
    // Toast message functions
    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        
        // Clear any existing timeout
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
    }
    
    function hideToast() {
        toast.classList.remove('show');
    }
    
    // Initialize the video
    loadVideo();
    
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
        
        // Add event listener for canplaythrough before attempting to play
        const canPlayHandler = () => {
            console.log("Audio can play through, attempting playback");
            lofiRadio.removeEventListener('canplaythrough', canPlayHandler);
            
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
                    
                    // Check if it's an autoplay policy error
                    if (e.name === 'NotAllowedError') {
                        showToast("Autoplay blocked. Click to play.");
                        updatePlaybackUI('paused');
                        return;
                    }
                    
                    // Try next station if we have attempts left
                    if (connectionAttempts < MAX_ATTEMPTS) {
                        // Try alternating between primary and backup servers for the same station
                        if (connectionAttempts % 2 === 0 && currentStationIndex + 1 < lofiStations.length) {
                            // Try the backup server for the same station
                            currentStationIndex++;
                        } else if (currentStationIndex % 2 === 1) {
                            // If we're on a backup server, move to the next station's primary server
                            currentStationIndex++;
                        } else {
                            // If we're on an odd index (primary server), skip to the next station's primary server
                            currentStationIndex += 2;
                        }
                        
                        // Make sure we don't go out of bounds
                        currentStationIndex = currentStationIndex % lofiStations.length;
                        
                        lofiRadio.src = lofiStations[currentStationIndex];
                        lofiRadio.load();
                        showToast(`Trying ${stationNames[currentStationIndex]}...`);
                        
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
        };
        
        // Set up canplaythrough listener
        lofiRadio.addEventListener('canplaythrough', canPlayHandler, { once: true });
        
        // Set up timeout in case canplaythrough doesn't fire within 8 seconds (increased from 5)
        const timeoutId = setTimeout(() => {
            lofiRadio.removeEventListener('canplaythrough', canPlayHandler);
            
            // Try next station if we have attempts left
            if (connectionAttempts < MAX_ATTEMPTS) {
                // Try alternating between primary and backup servers for the same station
                if (connectionAttempts % 2 === 0 && currentStationIndex + 1 < lofiStations.length) {
                    // Try the backup server for the same station
                    currentStationIndex++;
                } else if (currentStationIndex % 2 === 1) {
                    // If we're on a backup server, move to the next station's primary server
                    currentStationIndex++;
                } else {
                    // If we're on an odd index (primary server), skip to the next station's primary server
                    currentStationIndex += 2;
                }
                
                // Make sure we don't go out of bounds
                currentStationIndex = currentStationIndex % lofiStations.length;
                
                lofiRadio.src = lofiStations[currentStationIndex];
                lofiRadio.load();
                showToast(`Station timed out. Trying ${stationNames[currentStationIndex]}...`);
                
                // Try again with a small delay
                setTimeout(tryPlayRadio, 300);
            } else {
                updatePlaybackUI('paused');
                showToast("Connection failed. Try again.");
                
                // Reset connection attempts to allow trying again
                connectionAttempts = 0;
            }
        }, 8000); // 8 second timeout (increased from 5)
        
        // Clear timeout if canplaythrough fires
        lofiRadio.addEventListener('canplaythrough', () => {
            clearTimeout(timeoutId);
        }, { once: true });
    }
    
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
    
    // Play/Pause button event listener
    playbackControls.addEventListener('click', () => {
        if (isPlaying) {
            // Currently playing, so pause
            lofiRadio.pause();
            stopVideo();
            updatePlaybackUI('paused');
            hideToast();
            
            // Show blinking text again when paused
            if (blinkingText) {
                blinkingText.style.display = 'block';
            }
        } else {
            // Initialize audio context if needed
            try {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            } catch (e) {
                console.error("Could not initialize audio context:", e);
            }
            
            // Hide blinking text when play is clicked
            if (blinkingText) {
                blinkingText.style.display = 'none';
            }
            
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
