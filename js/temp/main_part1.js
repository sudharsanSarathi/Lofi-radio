document.addEventListener('DOMContentLoaded', () => {
    const playbackControls = document.querySelector('.playback-controls');
    const playButton = document.querySelector('.play-button');
    const pauseButton = document.querySelector('.pause-button');
    const danceVideo = document.getElementById('danceVideo');
    const lofiRadio = document.getElementById('lofiRadio');
    const toast = document.getElementById('toast');
    const radioElement = document.querySelector('.radio');
    const bottomStrip = document.querySelector('.bottom-strip');
    
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
    const MAX_ATTEMPTS = 3;
    let audioContext;
    let analyser;
    let audioSource;
    let animationId;
    let audioStreamActive = false;
    
    // Free Lofi Stations URLs (prioritized by connection speed)
    const lofiStations = [
        'https://streams.ilovemusic.de/iloveradio17.mp3', // Fast connection
        'https://play.streamafrica.net/lofiradio',
        'https://streamer.radio.co/s5c5da6a36/listen'
    ];
    
    // Immediately set the src to the first station
    let currentStationIndex = 0;
    lofiRadio.src = lofiStations[currentStationIndex];
    lofiRadio.preload = "auto";
    lofiRadio.crossOrigin = "anonymous"; // Add CORS support
    
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
    
    // Test each station and find the best one
    function fastConnectionTest() {
        return Promise.race(lofiStations.map((station, index) => {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.addEventListener('canplaythrough', () => {
                    resolve(index);
                });
                
                audio.addEventListener('error', () => {
                    resolve(null);
                });
                
                // Set timeout to avoid waiting too long
                setTimeout(() => {
                    resolve(null);
                }, 500);
                
                audio.src = station;
                audio.load();
            });
        }));
    }
    
    // Try to find the fastest station immediately
    fastConnectionTest().then(bestIndex => {
        if (bestIndex !== null) {
            currentStationIndex = bestIndex;
            lofiRadio.src = lofiStations[currentStationIndex];
            lofiRadio.load();
            console.log("Found fastest station:", lofiStations[currentStationIndex]);
        }
    });
    
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
