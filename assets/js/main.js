/*=============== LENIS SMOOTH SCROLL ===============*/
const lenis = new Lenis({
	autoRaf: true,
	lerp: 0.1,
	smoothWheel: true,
	smoothTouch: false,
});

/*=============== CHANGE BACKGROUND HEADER ===============*/
function scrollHeader() {
	const header = document.getElementById("header");
	// When the scroll is greater than 50 viewport height, add the scroll-header class to the header tag
	if (this.scrollY >= 50) header.classList.add("scroll-header");
	else header.classList.remove("scroll-header");
}
window.addEventListener("scroll", scrollHeader);

/*=============== MOBILE NAV MENU ===============*/
document.addEventListener("DOMContentLoaded", function () {
	const navMenu = document.getElementById("nav-menu");
	const navToggle = document.getElementById("nav-toggle");
	const navClose = document.getElementById("nav-close");
	const navLinks = document.querySelectorAll(".nav__link");

	if (!navMenu || !navToggle || !navClose) return;

	navToggle.addEventListener("click", () => {
		navMenu.classList.add("show-menu");
	});

	navClose.addEventListener("click", () => {
		navMenu.classList.remove("show-menu");
	});

	navLinks.forEach((link) => {
		link.addEventListener("click", (e) => {
			navMenu.classList.remove("show-menu");
			const href = link.getAttribute("href");
			if (href && href.startsWith("#")) {
				e.preventDefault();
				const target = document.querySelector(href);
				if (target) lenis.scrollTo(target);
			}
		});
	});
});

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

/*=============== CONTACT FORM (simple client-side ack) ===============*/
// document.addEventListener("DOMContentLoaded", function () {
// 	const form = document.getElementById("contactForm");
// 	const nameInput = document.getElementById("contactName");
// 	const textarea = document.getElementById("contactMessage");
// 	const note = document.getElementById("contactNote");
// 	if (!form) return;

// 	const DISCORD_WEBHOOK =
// 		"https://discord.com/api/webhooks/1410494471929466963/DDOq095Uv-N04wCrEX2Ff7WLwu4oTiJH-wtCGQzHPwSC8lHAG3x0fvtV6TpY0HiV-C7k";

// 	form.addEventListener("submit", async function (e) {
// 		e.preventDefault();
// 		const msg = (textarea.value || "").trim();
// 		const sender = (
// 			nameInput && nameInput.value ? nameInput.value : ""
// 		).trim();
// 		if (!msg) {
// 			note.textContent = "Please enter a message.";
// 			return;
// 		}

// 		const btn = form.querySelector(".contact__button");
// 		if (btn) {
// 			btn.disabled = true;
// 			btn.textContent = "Sending...";
// 		}
// 		note.textContent = "";

// 		try {
// 			const payload = {
// 				username: "nauqh.dev",
// 				embeds: [
// 					{
// 						title: `From ${sender ? sender : "Anonymous"}`,
// 						description: msg,
// 						timestamp: new Date().toISOString(),
// 					},
// 				],
// 			};

// 			const res = await fetch(DISCORD_WEBHOOK, {
// 				method: "POST",
// 				headers: { "Content-Type": "application/json" },
// 				body: JSON.stringify(payload),
// 			});

// 			if (!res.ok) throw new Error("Request failed: " + res.status);

// 			textarea.value = "";
// 			if (nameInput) nameInput.value = "";
// 			note.textContent = "Thank you for your message!";
// 			setTimeout(() => (note.textContent = ""), 4000);
// 		} catch (err) {
// 			note.textContent = "Hmm. Something went wrong. Please try again.";
// 		} finally {
// 			if (btn) {
// 				btn.disabled = false;
// 				btn.textContent = "Send";
// 			}
// 		}
// 	});
// });

modalClose.forEach((mc) => {
	mc.addEventListener("click", () => {
		modalViews.forEach((mv) => {
			mv.classList.remove("active-modal");
		});
	});
});

/*=============== SCROLL REVEAL ANIMATION ===============*/
const sr = ScrollReveal({
	origin: "top",
	distance: "60px",
	duration: 2500,
});

sr.reveal(`.nav__logo`, {
	origin: "left",
	distance: "20px",
	duration: 1200,
});
sr.reveal(`.nav__list`, {
	origin: "right",
	distance: "20px",
	duration: 1200,
	delay: 150,
});
sr.reveal(`.home__left-panel`);
sr.reveal(`.home__right-panel`, { delay: 500 });
sr.reveal(`.about`, { delay: 1000 });

// Set up job span and contact button interactions safely
document.addEventListener("DOMContentLoaded", function () {
	const jobSpan = document.getElementById("jobSpan");
	const contactButton = document.getElementById("contactButton");

	if (jobSpan && contactButton) {
		jobSpan.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			contactButton.classList.add("hover-effect");

			setTimeout(() => {
				contactButton.classList.remove("hover-effect");
			}, 500);
		});
	}

	if (contactButton) {
		contactButton.addEventListener("mouseenter", () => {
			contactButton.classList.add("hover-effect");
		});
		contactButton.addEventListener("mouseleave", () => {
			contactButton.classList.remove("hover-effect");
		});
	}
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
				".folder__item.expanded",
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
				".folder__item.expanded",
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

/*=============== LOCATION / TIME / TIMEZONE STRIP ===============*/
document.addEventListener("DOMContentLoaded", function () {
	const locationEl = document.getElementById("metaLocation");
	const timeEl = document.getElementById("metaTime");
	const timezoneEl = document.getElementById("metaTimezone");
	if (!locationEl || !timeEl || !timezoneEl) return;

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

	function getGMTOffsetLabel(date) {
		const parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			timeZoneName: "shortOffset",
		}).formatToParts(date);
		const offsetPart = parts.find((part) => part.type === "timeZoneName");
		const label = offsetPart ? offsetPart.value : "GMT+0";
		return label.replace("UTC", "GMT");
	}

	function updateTime() {
		const now = new Date();
		timeEl.textContent = new Intl.DateTimeFormat("en-US", {
			timeZone,
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		}).format(now);
		timezoneEl.textContent = getGMTOffsetLabel(now);
	}

	updateTime();
	setInterval(updateTime, 1000);
	locationEl.textContent = "MELBOURNE, AU";
});

/*=============== CLICK-TO-FLIP DISABLED: hover-only ===============*/

// Experience tab functionality with sliding highlight
document.addEventListener("DOMContentLoaded", function () {
	const companyTabs = document.querySelectorAll(".company-tab");
	const jobContents = document.querySelectorAll(".job-content");
	const companyList = document.querySelector(".company-list");

	if (companyTabs.length > 0 && companyList) {
		companyTabs.forEach((tab) => {
			tab.addEventListener("click", () => {
				// Remove active class from all tabs and contents
				companyTabs.forEach((t) => t.classList.remove("active"));
				jobContents.forEach((content) =>
					content.classList.remove("active"),
				);

				// Add active class to clicked tab
				tab.classList.add("active");

				// Update the data-active attribute to move the highlight bar
				const companyId = tab.getAttribute("data-company");
				companyList.setAttribute("data-active", companyId);

				// Show corresponding content
				const content = document.getElementById(companyId);
				if (content) {
					content.classList.add("active");
				}
			});
		});
	}
});

/*=============== PROJECT GALLERY SIDEBAR ===============*/
document.addEventListener("DOMContentLoaded", function () {
	const cards = document.querySelectorAll(".project-card");
	const filterButtons = document.querySelectorAll(
		".work__filters .work__item",
	);
	const sidebar = document.getElementById("projectSidebar");
	const backdrop = document.getElementById("projectSidebarBackdrop");
	const closeBtn = document.getElementById("projectSidebarClose");

	if (!cards.length || !sidebar || !backdrop || !closeBtn) return;

	const titleEl = document.getElementById("projectSidebarTitle");
	const descEl = document.getElementById("projectSidebarDesc");
	const aboutEl = document.getElementById("projectSidebarAbout");
	const techEl = document.getElementById("projectSidebarTech");
	const websiteEl = document.getElementById("projectSidebarWebsite");
	const githubEl = document.getElementById("projectSidebarGithub");
	const primaryEl = document.getElementById("projectSidebarPrimary");
	const imageEl = document.getElementById("projectSidebarImage");

	function toggleSidebar(isOpen) {
		sidebar.classList.toggle("is-open", isOpen);
		backdrop.classList.toggle("is-open", isOpen);
		if (isOpen) {
			lenis.stop();
			document.body.style.overflow = "hidden";
		} else {
			lenis.start();
			document.body.style.overflow = "";
		}
		sidebar.setAttribute("aria-hidden", isOpen ? "false" : "true");
	}

	function fillProjectDetails(card) {
		const title = card.dataset.title || "";
		const desc = card.dataset.desc || "";
		const about = card.dataset.about || "";
		const tech = (card.dataset.tech || "").split(",").filter(Boolean);
		const website = card.dataset.website || "";
		const github = card.dataset.github || "";
		const image = card.querySelector("img");

		titleEl.textContent = title;
		descEl.textContent = desc;
		aboutEl.textContent = about;

		techEl.innerHTML = "";
		tech.forEach((item) => {
			const chip = document.createElement("span");
			chip.className = "work__tech";
			chip.textContent = item.trim();
			techEl.appendChild(chip);
		});

		if (website) {
			websiteEl.textContent = website;
			websiteEl.href = website;
			websiteEl.style.display = "inline";
			primaryEl.href = website;
		} else {
			websiteEl.textContent = "Private / not deployed";
			websiteEl.removeAttribute("href");
			websiteEl.style.display = "inline";
			primaryEl.href = github || "#work";
		}

		if (github) {
			githubEl.textContent = github;
			githubEl.href = github;
			githubEl.style.display = "inline";
		} else {
			githubEl.textContent = "Private repository";
			githubEl.removeAttribute("href");
			githubEl.style.display = "inline";
		}

		if (imageEl && image) {
			imageEl.src = image.src;
			imageEl.alt = title;
		}
	}

	const filterBar = document.querySelector(".work__filters");
	const filterPill = filterBar?.querySelector(".work__filter-pill");
	const filterTransitionCleanup = new WeakMap();

	function positionWorkFilterPill() {
		if (!filterBar || !filterPill) return;
		const active = filterBar.querySelector(".work__item.active-work");
		if (!active) return;
		const barRect = filterBar.getBoundingClientRect();
		const btnRect = active.getBoundingClientRect();
		filterPill.style.left = `${btnRect.left - barRect.left + filterBar.scrollLeft}px`;
		filterPill.style.top = `${btnRect.top - barRect.top + filterBar.scrollTop}px`;
		filterPill.style.width = `${btnRect.width}px`;
		filterPill.style.height = `${btnRect.height}px`;
	}

	let filterResizeTimer;
	window.addEventListener("resize", () => {
		clearTimeout(filterResizeTimer);
		filterResizeTimer = setTimeout(positionWorkFilterPill, 120);
	});

	function applyWorkFilter(selected) {
		cards.forEach((card) => {
			const category = card.dataset.category;
			const show = selected === "all" || selected === category;

			const prevCleanup = filterTransitionCleanup.get(card);
			if (prevCleanup) {
				prevCleanup();
				filterTransitionCleanup.delete(card);
			}

			if (show) {
				const wasHidden = card.classList.contains("is-hidden");
				card.classList.remove("is-hidden", "is-leaving");
				if (wasHidden) {
					card.classList.add("is-entering");
					void card.offsetHeight;
					requestAnimationFrame(() => {
						card.classList.remove("is-entering");
					});
				}
				return;
			}

			if (card.classList.contains("is-hidden")) return;

			card.classList.add("is-leaving");
			let settled = false;
			const finishHide = () => {
				if (settled) return;
				settled = true;
				card.classList.add("is-hidden");
				card.classList.remove("is-leaving");
				filterTransitionCleanup.delete(card);
			};
			const onEnd = (e) => {
				if (e.target !== card) return;
				if (!["opacity", "transform"].includes(e.propertyName)) return;
				card.removeEventListener("transitionend", onEnd);
				if (card.classList.contains("is-leaving")) finishHide();
			};
			card.addEventListener("transitionend", onEnd);
			const tid = setTimeout(() => {
				card.removeEventListener("transitionend", onEnd);
				if (card.classList.contains("is-leaving")) finishHide();
			}, 480);
			filterTransitionCleanup.set(card, () => {
				clearTimeout(tid);
				card.removeEventListener("transitionend", onEnd);
			});
		});
	}

	filterButtons.forEach((btn) => {
		btn.addEventListener("click", () => {
			filterButtons.forEach((item) =>
				item.classList.remove("active-work"),
			);
			btn.classList.add("active-work");
			applyWorkFilter(btn.dataset.filter);
			positionWorkFilterPill();
		});
	});

	requestAnimationFrame(() => {
		requestAnimationFrame(positionWorkFilterPill);
	});

	cards.forEach((card) => {
		card.addEventListener("click", () => {
			fillProjectDetails(card);
			toggleSidebar(true);
		});
	});

	closeBtn.addEventListener("click", () => toggleSidebar(false));
	backdrop.addEventListener("click", () => toggleSidebar(false));

	const backLink = sidebar.querySelector(".project-sidebar__back-link");
	if (backLink) {
		backLink.addEventListener("click", (e) => {
			e.preventDefault();
			toggleSidebar(false);
			const workSection = document.getElementById("work");
			if (workSection) lenis.scrollTo(workSection);
			history.replaceState(null, "", "#work");
		});
	}

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") toggleSidebar(false);
	});
});
