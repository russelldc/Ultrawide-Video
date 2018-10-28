chrome.runtime.onInstalled.addListener(function (details) {
	chrome.storage.local.set({ 'extensionMode': 0 });
});