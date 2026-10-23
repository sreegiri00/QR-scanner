# QR Code Scanner App

A simple, responsive web application for scanning QR codes using your device's camera.

## Features

- Scans QR codes in real-time using your device's camera.
- Responsive design that works well on both desktop and mobile devices.
- Automatically detects if the scanned result is a URL and makes it clickable.
- Easy copy-to-clipboard functionality.

## Technologies Used

- HTML5
- CSS3
- JavaScript (Vanilla)
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) library (loaded via CDN)

## How to Run

Because modern browsers require a secure context (HTTPS) or `localhost` to access the camera via the WebRTC API (`navigator.mediaDevices.getUserMedia`), you need to serve these files through a web server rather than just opening the `index.html` file directly in your browser.

Here are a few simple ways to serve the application locally:

### Option 1: Using Python (Recommended)

If you have Python installed, you can use its built-in HTTP server:

```bash
# Python 3
python3 -m http.server 8000
```

Then open your browser and navigate to `http://localhost:8000`

### Option 2: Using Node.js / npm

If you have Node.js installed, you can use a package like `serve` or `http-server`:

```bash
npx http-server -p 8000
```

Then open your browser and navigate to `http://localhost:8000`

## Note on Camera Permissions

When you first load the application, the browser will ask for permission to access your camera. You must grant this permission for the scanner to work.

If you are trying to access this application from another device on your local network (e.g., viewing it on your phone while hosting it on your computer), your phone's browser will likely block camera access because it is not being served over HTTPS. To test on mobile devices, you either need to set up a local HTTPS server, use a tunneling service like ngrok, or deploy the application to a secure hosting provider (like GitHub Pages, Vercel, or Netlify).
