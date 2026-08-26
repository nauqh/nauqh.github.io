/*=============== ARCHIVE PAGE ===============*/

document.addEventListener("DOMContentLoaded", function () {
	// Arrow-key navigation across the table's focusable elements
	document.addEventListener("keydown", function (e) {
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

		const focusable = document.querySelectorAll(
			".archive__title-link, .archive__link",
		);
		const currentIndex = Array.from(focusable).indexOf(
			document.activeElement,
		);
		if (currentIndex === -1) return;

		e.preventDefault();
		const direction = e.key === "ArrowDown" ? 1 : -1;
		const nextIndex =
			(currentIndex + direction + focusable.length) % focusable.length;
		focusable[nextIndex].focus();
	});
});
