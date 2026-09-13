/*=============== PIXEL KNIGHTS LIVE DEMO ===============*/
(function pixelKnightsDemo() {
	const frame = document.getElementById("pixelKnightsDemo");
	if (!frame) return;

	const errorButtons = [...document.querySelectorAll("[data-pixel-knights-errors]")];
	const colourButton = document.querySelector("[data-pixel-knights-colour]");
	let errors = 0;
	let colour = "colour1";

	function send(message) {
		if (frame.contentWindow) frame.contentWindow.postMessage(message, window.location.origin);
	}

	function setErrors(next) {
		errors = Math.max(0, next);
		send({ type: "world", errors });
		errorButtons.forEach((button) => {
			button.setAttribute(
				"aria-pressed",
				String(Number(button.dataset.pixelKnightsErrors) === errors),
			);
		});
	}

	frame.addEventListener("load", () => {
		send({ type: "colour", colour });
		send({ type: "world", errors });
	});

	errorButtons.forEach((button) => {
		button.addEventListener("click", () => {
			setErrors(errors ? 0 : Number(button.dataset.pixelKnightsErrors));
		});
	});

	colourButton?.addEventListener("click", () => {
		colour = colour === "colour1" ? "colour2" : "colour1";
		send({ type: "colour", colour });
		colourButton.setAttribute("aria-pressed", String(colour === "colour2"));
		colourButton.textContent = colour === "colour2" ? "blue faction" : "black faction";
	});
})();
