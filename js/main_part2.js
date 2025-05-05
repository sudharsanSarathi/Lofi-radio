    // Pre-connect to stations to speed up initial connection
    lofiStations.forEach(station => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = new URL(station).origin;
        document.head.appendChild(link);
    });
}); 
