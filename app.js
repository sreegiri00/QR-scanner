document.addEventListener('DOMContentLoaded', () => {
    const resultBox = document.getElementById('result');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const cameraSelect = document.getElementById('camera-select');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    
    let html5Qrcode = null;
    let isScanning = false;
    let camerasList = [];
    let lastScanResult = null;
    let cameraListPopulated = false;

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

    // Find back camera from list of camera devices
    function findBackCamera(devices) {
        if (!devices || devices.length === 0) return null;

        const backKeywords = ['back', 'rear', 'environment', 'facing back', '0, facing back'];
        for (const device of devices) {
            const label = (device.label || '').toLowerCase();
            if (backKeywords.some(keyword => label.includes(keyword))) {
                return device;
            }
        }
        // On mobile devices with multiple cameras, back camera is often the last device listed
        if (devices.length > 1) {
            return devices[devices.length - 1];
        }
        return devices[0];
    }

    function populateCameraSelect(devices) {
        cameraSelect.innerHTML = '';
        devices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.label || `Camera ${index + 1}`;
            cameraSelect.appendChild(option);
        });
        cameraSelect.disabled = devices.length <= 1;
        switchCameraBtn.disabled = devices.length <= 1;
    }

    async function startScanning(cameraSource) {
        if (isScanning && html5Qrcode) {
            try {
                await html5Qrcode.stop();
                isScanning = false;
            } catch (err) {
                console.error('Error stopping previous scan session:', err);
            }
        }

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        try {
            await html5Qrcode.start(
                cameraSource,
                config,
                onScanSuccess,
                onScanFailure
            );
            isScanning = true;

            // Once camera is active, refresh camera list if labels were not available initially
            refreshCameraListIfNeeded();
        } catch (err) {
            console.error('Error starting scanner:', err);
        }
    }

    async function refreshCameraListIfNeeded() {
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                camerasList = devices;
                const hasLabels = devices.some(d => d.label && d.label.trim() !== '');
                if (hasLabels || !cameraListPopulated) {
                    const currentSelected = cameraSelect.value;
                    populateCameraSelect(devices);
                    if (currentSelected && devices.some(d => d.id === currentSelected)) {
                        cameraSelect.value = currentSelected;
                    }
                    cameraListPopulated = hasLabels;
                }
            }
        } catch (e) {
            console.warn('Could not enumerate cameras:', e);
        }
    }

    async function initScanner() {
        html5Qrcode = new Html5Qrcode('reader');

        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                camerasList = devices;
                populateCameraSelect(devices);

                const defaultCamera = findBackCamera(devices);
                const cameraSource = defaultCamera ? defaultCamera.id : { facingMode: 'environment' };

                if (defaultCamera) {
                    cameraSelect.value = defaultCamera.id;
                }

                await startScanning(cameraSource);
            } else {
                // Fallback to back camera using facingMode environment
                cameraSelect.innerHTML = '<option value="environment">Back Camera (Environment)</option>';
                await startScanning({ facingMode: 'environment' });
            }
        } catch (err) {
            console.warn('Unable to query cameras beforehand, defaulting to environment facingMode:', err);
            cameraSelect.innerHTML = '<option value="environment">Back Camera (Environment)</option>';
            await startScanning({ facingMode: 'environment' });
        }
    }

    // Camera control event listeners
    cameraSelect.addEventListener('change', async () => {
        const selectedValue = cameraSelect.value;
        if (!selectedValue) return;

        if (selectedValue === 'environment' || selectedValue === 'user') {
            await startScanning({ facingMode: selectedValue });
        } else {
            await startScanning(selectedValue);
        }
    });

    switchCameraBtn.addEventListener('click', async () => {
        if (camerasList.length > 1) {
            const currentIndex = camerasList.findIndex(c => c.id === cameraSelect.value);
            const nextIndex = (currentIndex + 1) % camerasList.length;
            const nextCamera = camerasList[nextIndex];
            cameraSelect.value = nextCamera.id;
            await startScanning(nextCamera.id);
        } else {
            // Toggle facingMode between environment (back) and user (front)
            const currentVal = cameraSelect.value;
            const newVal = currentVal === 'user' ? 'environment' : 'user';
            cameraSelect.innerHTML = `<option value="${newVal}">${newVal === 'environment' ? 'Back Camera' : 'Front Camera'}</option>`;
            cameraSelect.value = newVal;
            await startScanning({ facingMode: newVal });
        }
    });

    initScanner();

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

    // QR Code Generator Logic
    const linkInput = document.getElementById('link-input');
    const generateBtn = document.getElementById('generate-btn');
    const qrcodeDisplay = document.getElementById('qrcode-display');
    let qrcodeInstance = null;

    function generateQRCode() {
        const text = linkInput.value.trim();
        if (!text) {
            alert('Please enter a valid link or text');
            return;
        }

        // Clear existing content
        qrcodeDisplay.innerHTML = '';

        try {
            qrcodeInstance = new QRCode(qrcodeDisplay, {
                text: text,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch (err) {
            console.error('Error generating QR code:', err);
            qrcodeDisplay.innerHTML = '<p class="placeholder-text" style="color: red;">Failed to generate QR code.</p>';
        }
    }

    generateBtn.addEventListener('click', generateQRCode);

    linkInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateQRCode();
        }
    });
});
