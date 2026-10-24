document.addEventListener('DOMContentLoaded', () => {
    const resultBox = document.getElementById('result');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');

    const methodSelect = document.getElementById('method-select');
    const cameraSection = document.getElementById('camera-section');
    const fileSection = document.getElementById('file-section');

    const cameraSelect = document.getElementById('camera-select');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const qrInputFile = document.getElementById('qr-input-file');
    const fileScannerPreview = document.getElementById('file-scanner-preview');
    
    let html5Qrcode = null;
    let isScanning = false;
    let camerasList = [];
    let lastScanResult = null;
    let cameraListPopulated = false;

    // Function to handle successful scans
    function onScanSuccess(decodedText, decodedResult) {
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
        
        // Visual feedback
        resultBox.style.backgroundColor = '#e8f5e9';
        resultBox.style.borderColor = '#28a745';
        
        setTimeout(() => {
            resultBox.style.backgroundColor = '';
            resultBox.style.borderColor = '';
        }, 500);
    }

    function onScanFailure(error) {
        // handle live scan failure (scanning continuous frames)
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
        if (devices.length > 1) {
            return devices[devices.length - 1];
        }
        return devices[0];
    }

    // Find front camera from list of camera devices
    function findFrontCamera(devices) {
        if (!devices || devices.length === 0) return null;

        const frontKeywords = ['front', 'user', 'facing front', 'selfie', '1, facing front'];
        for (const device of devices) {
            const label = (device.label || '').toLowerCase();
            if (frontKeywords.some(keyword => label.includes(keyword))) {
                return device;
            }
        }
        return devices[0];
    }

    function populateCameraSelect(devices) {
        cameraSelect.innerHTML = '';

        // Add standard facingMode choices
        const backOption = document.createElement('option');
        backOption.value = 'environment';
        backOption.textContent = 'Back Camera (Environment)';
        cameraSelect.appendChild(backOption);

        const frontOption = document.createElement('option');
        frontOption.value = 'user';
        frontOption.textContent = 'Front Camera (User)';
        cameraSelect.appendChild(frontOption);

        // Add specific detected devices if available
        if (devices && devices.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Specific Devices';
            devices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.id;
                option.textContent = device.label || `Camera ${index + 1}`;
                optgroup.appendChild(option);
            });
            cameraSelect.appendChild(optgroup);
        }
    }

    async function stopScanning() {
        if (isScanning && html5Qrcode) {
            try {
                await html5Qrcode.stop();
                isScanning = false;
            } catch (err) {
                console.error('Error stopping scan session:', err);
            }
        }
    }

    async function startScanning(cameraSource) {
        await stopScanning();

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        try {
            await html5Qrcode.start(
                cameraSource,
                config,
                onScanSuccess,
                onScanFailure
            );
            isScanning = true;

            // Refresh camera list if labels were missing originally
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
                    if (currentSelected) {
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
        if (!html5Qrcode) {
            html5Qrcode = new Html5Qrcode('reader');
        }

        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                camerasList = devices;
                populateCameraSelect(devices);

                const defaultCamera = findBackCamera(devices);
                const cameraSource = defaultCamera ? defaultCamera.id : { facingMode: 'environment' };

                if (defaultCamera) {
                    cameraSelect.value = defaultCamera.id;
                } else {
                    cameraSelect.value = 'environment';
                }

                await startScanning(cameraSource);
            } else {
                populateCameraSelect([]);
                cameraSelect.value = 'environment';
                await startScanning({ facingMode: 'environment' });
            }
        } catch (err) {
            console.warn('Unable to query cameras beforehand, defaulting to environment facingMode:', err);
            populateCameraSelect([]);
            cameraSelect.value = 'environment';
            await startScanning({ facingMode: 'environment' });
        }
    }

    // Handle Method Selection (Camera vs File)
    methodSelect.addEventListener('change', async () => {
        const method = methodSelect.value;
        if (method === 'camera') {
            fileSection.classList.add('hidden');
            cameraSection.classList.remove('hidden');
            await initScanner();
        } else if (method === 'file') {
            await stopScanning();
            cameraSection.classList.add('hidden');
            fileSection.classList.remove('hidden');
        }
    });

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
        const currentVal = cameraSelect.value;

        if (currentVal === 'user') {
            cameraSelect.value = 'environment';
            await startScanning({ facingMode: 'environment' });
            return;
        } else if (currentVal === 'environment') {
            cameraSelect.value = 'user';
            await startScanning({ facingMode: 'user' });
            return;
        }

        // If specific device is selected
        if (camerasList.length > 1) {
            const backCam = findBackCamera(camerasList);
            const frontCam = findFrontCamera(camerasList);

            if (backCam && currentVal === backCam.id && frontCam && frontCam.id !== backCam.id) {
                cameraSelect.value = frontCam.id;
                await startScanning(frontCam.id);
            } else if (frontCam && currentVal === frontCam.id && backCam && backCam.id !== frontCam.id) {
                cameraSelect.value = backCam.id;
                await startScanning(backCam.id);
            } else {
                // Cycle to next camera device in array
                const currentIndex = camerasList.findIndex(c => c.id === currentVal);
                const nextIndex = (currentIndex + 1) % camerasList.length;
                const nextCamera = camerasList[nextIndex];
                cameraSelect.value = nextCamera.id;
                await startScanning(nextCamera.id);
            }
        } else {
            // Default toggle between environment and user
            const newVal = (currentVal === 'user') ? 'environment' : 'user';
            cameraSelect.value = newVal;
            await startScanning({ facingMode: newVal });
        }
    });

    // File Input change listener for image scanning
    qrInputFile.addEventListener('change', async (e) => {
        if (e.target.files.length === 0) {
            return;
        }

        const imageFile = e.target.files[0];
        fileScannerPreview.innerHTML = '';

        // Display image preview
        const img = document.createElement('img');
        img.src = URL.createObjectURL(imageFile);
        img.alt = 'Uploaded QR Code Preview';
        img.className = 'uploaded-qr-preview';
        fileScannerPreview.appendChild(img);

        if (!html5Qrcode) {
            html5Qrcode = new Html5Qrcode('reader');
        }

        try {
            const decodedText = await html5Qrcode.scanFile(imageFile, true);
            onScanSuccess(decodedText);
        } catch (err) {
            console.error('Error scanning file:', err);
            const errorMsg = document.createElement('p');
            errorMsg.className = 'error-text';
            errorMsg.textContent = 'No QR code found in the selected image. Please try another image.';
            fileScannerPreview.appendChild(errorMsg);
        }
    });

    // Initialize camera mode on page load
    initScanner();

    // Event Listeners for action buttons
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
        qrInputFile.value = '';
        fileScannerPreview.innerHTML = '<p class="placeholder-text">Select an image file above to scan for QR code</p>';
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
