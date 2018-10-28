var modeMap = {
	disabled: 0, crop: 1, forceCrop: 2
};

window.onload = function () {
	const modes = modesSel.children;

	// Set active mode
	for (var i = 0, l = modes.length; i < l; i++) modes[i].onclick = onModeClick;

	// Get current active mode
	chrome.storage.local.get('extensionMode', function (results) {
		var mode = Object.keys(modeMap)[results.extensionMode];
		for (let i = 0, l = modes.length, inp; i < l; i++) {
			inp = modes[i].children[0];
			if (inp.id == mode) { inp.checked = true; break; }
		}
	});
	
	// Get SBS toggle state
	chrome.storage.local.get('extensionSBSToggle', function (results) {
		if (results.extensionSBSToggle) {
			sbsToggle.checked = true;
		}
	});

	// Show help & about
	helpShow.onclick = function (e) {
		e.preventDefault(); help.className = 'is-active';
	}
	helpHide.onclick = function (e) {
		e.preventDefault(); help.className = null;
	}

	// Attribution links
	const aLinks = links.children;
	for (let i = 0, l = aLinks.length; i < l; i++) if (aLinks[i].tagName == 'A') {
		aLinks[i].onclick = function () { chrome.tabs.create({ url: this.href }); };
	}
}

function onModeClick(e) {
	if (e.target.type == 'radio') {
		chrome.storage.local.set({ 'extensionMode': modeMap[e.target.id] }, function () { });
	} else if (e.target.type = 'checkbox') {
		chrome.storage.local.set({ 'extensionSBSToggle': e.target.checked }, function () { });
	}
}