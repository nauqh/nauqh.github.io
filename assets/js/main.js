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
