/*=============== CHANGE BACKGROUND HEADER ===============*/
function scrollHeader() {
	const header = document.getElementById("header");
	// When the scroll is greater than 50 viewport height, add the scroll-header class to the header tag
	if (this.scrollY >= 50) header.classList.add("scroll-header");
	else header.classList.remove("scroll-header");
}
window.addEventListener("scroll", scrollHeader);

/*=============== SERVICES MODAL ===============*/
const modalViews = document.querySelectorAll(".services__modal"),
	modalBtns = document.querySelectorAll(".services__button"),
	modalClose = document.querySelectorAll(".services__modal-close");

let modal = function (modalClick) {
	modalViews[modalClick].classList.add("active-modal");
};

modalBtns.forEach((mb, i) => {
	mb.addEventListener("click", () => {
		modal(i);
	});
});

modalClose.forEach((mc) => {
	mc.addEventListener("click", () => {
		modalViews.forEach((mv) => {
			mv.classList.remove("active-modal");
		});
	});
});

/*=============== MIXITUP FILTER PORTFOLIO ===============*/
let mixerPortfolio = mixitup(".work__container", {
	selectors: {
		target: ".work__card",
	},
	animation: {
		duration: 300,
	},
});

/* Link active work */
const linkWork = document.querySelectorAll(".work__item");

function activeWork() {
	linkWork.forEach((l) => l.classList.remove("active-work"));
	this.classList.add("active-work");
}
linkWork.forEach((l) => l.addEventListener("click", activeWork));

/*=============== SCROLL REVEAL ANIMATION ===============*/
const sr = ScrollReveal({
	origin: "top",
	distance: "60px",
	duration: 2500,
});

sr.reveal(`.home__data`);
sr.reveal(`.home__handle`, { delay: 500 });
sr.reveal(`.home__social, .home__scroll`, { delay: 700, origin: "bottom" });
sr.reveal(`.about`, { delay: 1000 });

// Remove duplicate handlers and replace with this single one
document.getElementById("jobSpan").addEventListener("click", function (e) {
	e.preventDefault();
	e.stopPropagation(); // Stop event bubbling
	const contactButton = document.getElementById("contactButton");
	contactButton.classList.add("hover-effect");

	// Remove the effect after 0.5 seconds
	setTimeout(() => {
		contactButton.classList.remove("hover-effect");
	}, 500);
});

// Handle regular hover for contact button
const contactButton = document.getElementById("contactButton");
contactButton.addEventListener("mouseenter", () => {
	contactButton.classList.add("hover-effect");
});
contactButton.addEventListener("mouseleave", () => {
	contactButton.classList.remove("hover-effect");
});

/*=============== SKILLS DUAL EXPLORER FUNCTIONALITY - WITH DEFAULT EXPANSION ===============*/
document.addEventListener("DOMContentLoaded", function () {
	const explorers = document.querySelectorAll(".skills__explorer");

	// Function to setup individual explorer
	function setupExplorer(explorer, index) {
		const folderItems = explorer.querySelectorAll(".folder__item");
		const toggleBtn = explorer.querySelector(".toggle-btn");

		// Toggle folder function
		function toggleFolder(folderItem) {
			folderItem.classList.toggle("expanded");
			updateToggleButton();
		}

		// Update toggle button state
		function updateToggleButton() {
			const expandedCount = explorer.querySelectorAll(
				".folder__item.expanded"
			).length;
			const totalCount = folderItems.length;

			if (expandedCount === totalCount) {
				toggleBtn.classList.add("all-expanded");
			} else {
				toggleBtn.classList.remove("all-expanded");
			}
		}

		// Add click event to folder headers (scoped to this explorer only)
		folderItems.forEach((folder) => {
			const header = folder.querySelector(".folder__header");
			header.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				toggleFolder(folder);
			});
		});

		// Toggle button functionality
		toggleBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();

			const expandedCount = explorer.querySelectorAll(
				".folder__item.expanded"
			).length;
			const totalCount = folderItems.length;

			if (expandedCount === totalCount) {
				// All expanded - collapse all
				folderItems.forEach((folder) => {
					if (folder.classList.contains("expanded")) {
						toggleFolder(folder);
					}
				});
			} else {
				// Not all expanded - expand all
				folderItems.forEach((folder) => {
					if (!folder.classList.contains("expanded")) {
						toggleFolder(folder);
					}
				});
			}
		});

		// Auto-expand all folders on load
		folderItems.forEach((folder) => {
			toggleFolder(folder);
		});
	}

	// Setup each explorer independently
	explorers.forEach((explorer, index) => {
		setupExplorer(explorer, index);
	});
});

/*=============== TOUCH FLIP DISABLED: hover-only ===============*/

// Set current year in footer
document.addEventListener("DOMContentLoaded", function () {
	const yearEl = document.getElementById("currentYear");
	if (yearEl) {
		yearEl.textContent = new Date().getFullYear();
	}
});

/*=============== CLICK-TO-FLIP DISABLED: hover-only ===============*/

/*=============== AUTO-SCROLL CURRENT WORK CARD ON HOVER ===============*/
document.addEventListener("DOMContentLoaded", function () {
	const workCards = document.querySelectorAll(
		".about__current-work .current-work__item"
	);

	function scrollCardIntoView(card) {
		const rect = card.getBoundingClientRect();
		const header = document.getElementById("header");
		const headerH = header ? header.offsetHeight : 0;
		const topSafe = headerH + 50; // keep a small gap below header
		const bottomSafe = window.innerHeight - 50; // bottom padding

		// If top is hidden under header, scroll up
		if (rect.top < topSafe) {
			const delta = rect.top - topSafe; // negative -> scroll up
			window.scrollBy({ top: delta, behavior: "smooth" });
			return; // avoid double scroll this tick
		}

		// If bottom is clipped, scroll down
		if (rect.bottom > bottomSafe) {
			const delta = rect.bottom - bottomSafe;
			window.scrollBy({ top: delta, behavior: "smooth" });
		}
	}

	workCards.forEach((card) => {
		let hoverTimer = null;
		card.addEventListener("mouseenter", () => {
			// Wait for the flip/resize animation to start before scrolling
			hoverTimer = setTimeout(() => scrollCardIntoView(card), 380);
			// Clear any leaving hold if user re-enters quickly
			card.classList.remove("leaving");
		});
		card.addEventListener("mouseleave", () => {
			if (hoverTimer) clearTimeout(hoverTimer);
			// Add a short hold to smooth height collapse vs face flip
			card.classList.add("leaving");
			setTimeout(() => {
				card.classList.remove("leaving");
			}, 180); // delay outer resize slightly
		});
		// Ensure we scroll after the height transition completes as well
		card.addEventListener("transitionend", (e) => {
			if (e.propertyName === "height") {
				scrollCardIntoView(card);
			}
		});
	});
});
