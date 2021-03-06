'use strict';

function addClass(video, styleClass) {
    var totalVideosOnPage = video.length;
    var videoClassList = [];

    for (var i = 0; i < totalVideosOnPage; i++) {
        videoClassList = video[i].classList;
        videoClassList.add(styleClass);
    }
}
function remClass(video, styleClass) {
    var totalVideosOnPage = video.length;
    var videoClassList = [];

    for (var i = 0; i < totalVideosOnPage; i++) {
        videoClassList = video[i].classList;
        if (videoClassList.contains(styleClass)) {
            videoClassList.remove(styleClass);
        }
    }
}

function getFullScreenStatus() {
    return document.webkitCurrentFullScreenElement;
}

UltraWide.prototype.updateAspectRatio = function () {
    // Calculate scale factor:
    const aspect = screen.width / screen.height;
    if (aspect >= 1.88) { // If wider than 16:9 widescreen:
        const scale = aspect / 1.77;
        this.scale = Math.round(scale * 100) / 100;
    } else this.scale = 1; // Default

    // Update Styles:
    this.styles.innerHTML = '.extraClassCrop { -webkit-transform:scale(' + this.scale + ')!important; }';

    const fullscreen = getFullScreenStatus();

    const video = document.getElementsByTagName('video');
    if (!video) return;
    if (!video[0]) return;
    if (!video[0].videoWidth) return;

    // Check if video is already Ultrawide
    const videoAspect = video[0].videoWidth / video[0].videoHeight;

    // Check if video is Ultrawide in 16:9 format
    const { centerPixelColor, topPixelColor, bottomPixelColor } = getPixelColors(video);

    // Check topPixel first, and if it is black, then check if centerPixel is the same color
    // If topPixel is black, and centerPixel is not, then apply the zoom
    let shouldCrop = false;

    if (checkProximityToBlack(topPixelColor) && checkProximityToBlack(bottomPixelColor)) {
        if (!checkProximityToBlack(centerPixelColor)) {
            shouldCrop = true;
        }
    }

    // Update Classes:
    if (video.length !== 0) {
        switch (this.mode) {
            case 0: // Disabled
                remClass(video, 'extraClassCrop');
                break;
            case 1: // Crop
                if (fullscreen && this.scale > 1 && videoAspect < 2.37 & shouldCrop) {
                    addClass(video, 'extraClassCrop');
                } else {
                    remClass(video, 'extraClassCrop');
                }
                break;
            case 2: // Force Crop
                if (fullscreen) {
                    addClass(video, 'extraClassCrop');
                } else {
                    remClass(video, 'extraClassCrop');
                }
                break;
        }
    }

    // Update every 5s in fullscreen mode:
    if (fullscreen && this.mode > 0 && video.length > 0) {
        if (this.aspectRatioTimer != null) {
            clearTimeout(this.aspectRatioTimer);
        }
        this.aspectRatioTimer = setTimeout(function () {
            this.updateAspectRatio();
            this.aspectRatioTimer = null;
        }.bind(this), 5000);
    }
}

function getPixelColors(video) {
    const canvas = document.createElement('canvas');
    canvas.height = video[0].videoHeight;
    canvas.width = video[0].videoWidth;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video[0], 0, 0, canvas.width, canvas.height);

    const centerHeight = canvas.height - canvas.height / 4.5;
    const topBottomHeight = canvas.height / 9;

    const centerPixelColor = getAverageColor(
        ctx.getImageData(0, canvas.height / 9, canvas.width, centerHeight).data,
        canvas.width,
        topBottomHeight
    );
    const topPixelColor = getAverageColor(
        ctx.getImageData(0, 0, canvas.width, topBottomHeight).data,
        canvas.width,
        topBottomHeight
    );
    const bottomPixelColor = getAverageColor(
        ctx.getImageData(0, canvas.height - canvas.height / 9, canvas.width, topBottomHeight).data,
        canvas.width,
        topBottomHeight
    );

    return { centerPixelColor, topPixelColor, bottomPixelColor };
}

function getAverageColor(imageData, width, height) {
    let red = 0,
        green = 0,
        blue = 0,
        length = 4 * width * height;

    for (var i = 0; i < length; i += 4) {
        red += imageData[i];
        green += imageData[i + 1];
        blue += imageData[i + 2];
    }
    length = length / 4;
    red = Math.round(red / length);
    green = Math.round(green / length);
    blue = Math.round(blue / length);

    return [red, green, blue];
}

function checkProximityToBlack(pixelColor) {
    // No single one value should be over 30
    if (pixelColor.sort()[2] > 30) return false;

    // The max difference between any two of the color values should be no more than 5
    if (Math.abs(pixelColor[1] - pixelColor[2]) > 5) return false;
    if (Math.abs(pixelColor[0] - pixelColor[2]) > 5) return false;
    if (Math.abs(pixelColor[0] - pixelColor[1]) > 5) return false;

    return true;
}

UltraWide.prototype.updateSBSMode = function () {
    if (window.location.host === 'www.youtube.com') {
        const video = document.getElementsByTagName('video');
        if (!video) return;

        const canvasMask = video[0].nextElementSibling;
        if (canvasMask) {
            canvasMask.hidden = this.sbsToggle;
        }
        // Update every 5s because sometimes the canvas element takes a moment to appear:
        if (this.sbsToggle && video.length > 0) {
            if (this.sbsTimer != null) {
                clearTimeout(this.sbsTimer);
            }
            this.sbsTimer = setTimeout(function () {
                this.updateSBSMode();
                this.sbsTimer = null;
            }.bind(this), 5000);
        }
    }
}

function UltraWide() {
    this.mode = 0;
    this.sbsToggle = false;
    document.addEventListener('webkitfullscreenchange', function () {
        this.updateAspectRatio();
    }.bind(this));

    document.addEventListener('keydown', function (hotKeyPressed) {
        if (hotKeyPressed.ctrlKey && hotKeyPressed.altKey && hotKeyPressed.key == 'c') {
            if (++this.mode > 2) this.mode = 0;
            chrome.storage.local.set({ 'extensionMode': this.mode }, function () { });
        }
    }.bind(this));

    this.styles = document.createElement('style');
    document.body.appendChild(this.styles);
}

function onLoad() {
    if (!document.body) return;
    const ultrawide = new UltraWide();
    chrome.storage.local.get('extensionMode', function (status) {
        ultrawide.mode = status.extensionMode;
        if (status.extensionMode != 0) ultrawide.updateAspectRatio();
    });
    chrome.storage.local.get('extensionSBSToggle', function (status) {
        ultrawide.sbsToggle = status.extensionSBSToggle;
        if (status.extensionSBSToggle != false) ultrawide.updateSBSMode();
    });
    chrome.storage.onChanged.addListener(function (changes) {
        if (changes.extensionMode) {
            ultrawide.mode = changes.extensionMode.newValue;
            ultrawide.updateAspectRatio();
        } else if (changes.extensionSBSToggle) {
            ultrawide.sbsToggle = changes.extensionSBSToggle.newValue;
            ultrawide.updateSBSMode();
        }
    });
}

if (document.readyState == 'complete') onLoad();
else window.addEventListener('load', onLoad);
