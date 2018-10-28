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

    // Check if video is already Ultrawide
    const videoAspect = video[0].videoWidth / video[0].videoHeight;

    // Check if video is Ultrawide in 16:9 format
    const { centerPixelColors, topPixelColors, bottomPixelColors } = getPixelColors(video);

    // Check topPixel first, and if it is black, then check if centerPixel is the same color
    // If topPixel is black, and centerPixel is not, then apply the zoom
    let shouldCrop = false;
    if (checkProximityToBlack(topPixelColors) && checkProximityToBlack(bottomPixelColors)) {
        if (!checkProximityToBlack(centerPixelColors)) {
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

    const midPoint = canvas.width / 2;
    const leftThirdPoint = canvas.width / 3;
    const rightThirdPoint = (2 * canvas.width) / 3;
    const bottomPoint = canvas.height - 1;
    const centerPoint = canvas.height / 2;

    const centerPixelColors = [
        ctx.getImageData(leftThirdPoint, centerPoint, 1, 1).data.slice(0, 3),
        ctx.getImageData(midPoint, centerPoint, 1, 1).data.slice(0, 3),
        ctx.getImageData(rightThirdPoint, centerPoint, 1, 1).data.slice(0, 3)
    ];
    const topPixelColors = [
        ctx.getImageData(leftThirdPoint, 0, 1, 1).data.slice(0, 3),
        ctx.getImageData(midPoint, 0, 1, 1).data.slice(0, 3),
        ctx.getImageData(rightThirdPoint, 0, 1, 1).data.slice(0, 3)
    ];
    const bottomPixelColors = [
        ctx.getImageData(leftThirdPoint, bottomPoint, 1, 1).data.slice(0, 3),
        ctx.getImageData(midPoint, bottomPoint, 1, 1).data.slice(0, 3),
        ctx.getImageData(rightThirdPoint, bottomPoint, 1, 1).data.slice(0, 3)
    ];

    return { centerPixelColors, topPixelColors, bottomPixelColors };
}

function checkProximityToBlack(pixelColors) {
    for (pixelColor of pixelColors) {
        // No single one value of topPixel should be over 30
        if (pixelColor.sort()[2] > 30) return false;

        // The max difference between any two of the color values should be no more than 5
        if (Math.abs(pixelColor[1] - pixelColor[2]) > 5) return false;
        if (Math.abs(pixelColor[0] - pixelColor[2]) > 5) return false;
        if (Math.abs(pixelColor[0] - pixelColor[1]) > 5) return false;
    }
    return true;
}

UltraWide.prototype.updateSBSMode = function () {
    if (window.location.host === 'www.youtube.com') {
        const video = document.getElementsByTagName('video');
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
