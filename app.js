document.addEventListener('DOMContentLoaded', () => {
    const resultBox = document.getElementById('result');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    let html5QrcodeScanner = null;
    let lastScanResult = null;

    // Function to handle successful scans
    function onScanSuccess(decodedText, decodedResult) {
        // Prevent processing the same code multiple times quickly
        if (decodedText === lastScanResult) {
            return;
        }
        
        lastScanResult = decodedText;
        
        // Clear previous result securely
        resultBox.innerHTML = '';
        
        // Check if the result is a safe URL (http or https)
        const isSafeUrl = isSafeHttpUrl(decodedText);
        
        if (isSafeUrl) {
            const linkElement = document.createElement('a');
            linkElement.href = decodedText;
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer';
            linkElement.textContent = decodedText;
            resultBox.appendChild(linkElement);
        } else {
            const pElement = document.createElement('p');
            pElement.textContent = decodedText;
            resultBox.appendChild(pElement);
        }
        
        // Enable buttons
        copyBtn.disabled = false;
        clearBtn.disabled = false;
        
        // Optional: Provide some visual feedback
        resultBox.style.backgroundColor = '#e8f5e9';
        resultBox.style.borderColor = '#28a745';
        
        setTimeout(() => {
            resultBox.style.backgroundColor = '';
            resultBox.style.borderColor = '';
        }, 500);
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    }

    // Utility function to check if string is a safe HTTP/HTTPS URL
    function isSafeHttpUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (err) {
            return false;
        }
    }

    // Initialize scanner
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        /* verbose= */ false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);

    // Event Listeners for buttons
    copyBtn.addEventListener('click', async () => {
        if (!lastScanResult) return;
        
        try {
            await navigator.clipboard.writeText(lastScanResult);
            const originalText = copyBtn.innerText;
            copyBtn.innerText = 'Copied!';
            setTimeout(() => {
                copyBtn.innerText = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text to clipboard');
        }
    });

    clearBtn.addEventListener('click', () => {
        lastScanResult = null;
        resultBox.innerHTML = '<p class="placeholder-text">Waiting for a scan...</p>';
        copyBtn.disabled = true;
        clearBtn.disabled = true;
    });
});
