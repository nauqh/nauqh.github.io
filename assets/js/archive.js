/*=============== ARCHIVE PAGE ANIMATIONS ===============*/

// Initialize ScrollReveal for archive page
const sr = ScrollReveal({
	origin: "top",
	distance: "60px",
	duration: 2500,
	delay: 200,
	reset: false,
});

// Archive page specific animations
document.addEventListener("DOMContentLoaded", function () {
	// Animate archive header
	sr.reveal(".archive__header", {
		origin: "top",
		distance: "40px",
		duration: 1000,
		delay: 100,
	});

	// Animate table header
	sr.reveal(".archive__table-header", {
		origin: "left",
		distance: "50px",
		duration: 1000,
		delay: 500,
	});

	// Animate table rows with staggered delay
	const archiveRows = document.querySelectorAll(".archive__row");
	archiveRows.forEach((row, index) => {
		sr.reveal(row, {
			origin: "bottom",
			distance: "30px",
			duration: 800,
			delay: 800 + index * 100,
		});
	});

	// Add hover effects for project links
	const projectLinks = document.querySelectorAll(".archive__title-link");
	projectLinks.forEach((link) => {
		link.addEventListener("mouseenter", function () {
			this.style.transform = "translateX(8px)";
		});

		link.addEventListener("mouseleave", function () {
			this.style.transform = "translateX(0)";
		});
	});

	// Add click ripple effect for links
	const allLinks = document.querySelectorAll(
		".archive__link, .archive__title-link"
	);
	allLinks.forEach((link) => {
		link.addEventListener("click", function (e) {
			const ripple = document.createElement("span");
			const rect = this.getBoundingClientRect();
			const size = Math.max(rect.width, rect.height);
			const x = e.clientX - rect.left - size / 2;
			const y = e.clientY - rect.top - size / 2;

			ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(100, 255, 218, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;

			this.style.position = "relative";
			this.style.overflow = "hidden";
			this.appendChild(ripple);

			setTimeout(() => {
				ripple.remove();
			}, 600);
		});
	});

	// Add CSS for ripple animation
	const style = document.createElement("style");
	style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
	document.head.appendChild(style);

	// Add smooth scroll for navigation
	const backHomeLink = document.querySelector(".back-home");
	if (backHomeLink) {
		backHomeLink.addEventListener("click", function (e) {
			// Remove the preventDefault and let the link work normally
			// The href="index.html" will handle the navigation
			// e.preventDefault(); // Remove this line
			// Remove the scrollIntoView logic since we want normal navigation
			// const target = document.querySelector(this.getAttribute("href"));
			// if (target) {
			// 	target.scrollIntoView({
			// 		behavior: "smooth",
			// 		block: "start",
			// 	});
			// }
		});
	}

	// Add keyboard navigation support
	document.addEventListener("keydown", function (e) {
		const focusedElement = document.activeElement;
		const allFocusableElements = document.querySelectorAll(
			".archive__title-link, .archive__link, .back-home"
		);
		const currentIndex =
			Array.from(allFocusableElements).indexOf(focusedElement);

		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			const direction = e.key === "ArrowDown" ? 1 : -1;
			const nextIndex =
				(currentIndex + direction + allFocusableElements.length) %
				allFocusableElements.length;
			allFocusableElements[nextIndex].focus();
		}
	});

	// Add loading animation for external links
	const externalLinks = document.querySelectorAll('a[target="_blank"]');
	externalLinks.forEach((link) => {
		link.addEventListener("click", function () {
			this.style.transform = "scale(0.95)";
			setTimeout(() => {
				this.style.transform = "scale(1)";
			}, 150);
		});
	});

	// Add smooth reveal for social sidebars
	const socialSidebar = document.querySelector(".home__social-sidebar");
	const emailSidebar = document.querySelector(".home__email-sidebar");

	if (socialSidebar) {
		sr.reveal(socialSidebar, {
			origin: "left",
			distance: "30px",
			duration: 1000,
			delay: 1200,
		});
	}

	if (emailSidebar) {
		sr.reveal(emailSidebar, {
			origin: "right",
			distance: "30px",
			duration: 1000,
			delay: 1200,
		});
	}
});

// Add smooth scrolling for the entire page
document.documentElement.style.scrollBehavior = "smooth";

// Add performance optimization for animations
const prefersReducedMotion = window.matchMedia(
	"(prefers-reduced-motion: reduce)"
);
if (prefersReducedMotion.matches) {
	// Disable animations for users who prefer reduced motion
	document.documentElement.style.setProperty("--animation-duration", "0s");
	document.documentElement.style.setProperty("--transition-duration", "0s");
}
