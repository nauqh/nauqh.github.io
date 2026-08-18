/*=============== LENIS SMOOTH SCROLL ===============*/
const lenis = new Lenis({
	duration: 1.2,
	easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
	smoothWheel: true,
	smoothTouch: true,
	touchMultiplier: 1.5,
});

function raf(time) {
	lenis.raf(time);
	requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

if (document.getElementById("loading-screen")) {
	lenis.stop();
	document.addEventListener(
		"loadingComplete",
		() => {
			lenis.start();
			const homeData = document.querySelector(".home__data");
			if (homeData) homeData.classList.add("hero-revealed");
			setTimeout(() => {
				document
					.getElementById("header")
					.classList.remove("header--pre-reveal");
			}, 1300);
		},
		{ once: true },
	);
}

/*=============== NAV OVERLAY ===============*/
const navOverlay = document.getElementById("navOverlay");
const navBackdrop = document.getElementById("navBackdrop");
const navMenuBtn = document.getElementById("navMenuBtn");
const navClose = document.getElementById("navClose");

function openNav() {
	navOverlay.classList.add("active");
	navBackdrop.classList.add("active");
	document.body.style.overflow = "hidden";
	lenis.stop();
}

function closeNav() {
	navOverlay.classList.remove("active");
	navBackdrop.classList.remove("active");
	document.body.style.overflow = "";
	lenis.start();
}

navMenuBtn.addEventListener("click", openNav);
navClose.addEventListener("click", closeNav);

document.querySelectorAll("[data-close]").forEach((link) => {
	link.addEventListener("click", closeNav);
});

navBackdrop.addEventListener("click", closeNav);

document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") closeNav();
});

/*=============== HIDE/SHOW HEADER ON SCROLL ===============*/
let lastScroll = 0;
const _header = document.getElementById("header");
const _colorSections = Array.from(
	document.querySelectorAll("section[data-header-color]"),
).filter((s) => getComputedStyle(s).position !== "fixed");

function contrastColor(hex) {
	if (!hex) return "#000000";
	const full = (hex.replace("#", "").padEnd(6, "0"));
	const r = parseInt(full.slice(0, 2), 16);
	const g = parseInt(full.slice(2, 4), 16);
	const b = parseInt(full.slice(4, 6), 16);
	// Perceived luminance; light backgrounds get dark text and vice versa.
	return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000000" : "#ffffff";
}

// Natural document top (offset-based) rather than getBoundingClientRect().
// The sticky footer is pinned to fill the viewport (rect.top stays 0 all the
// time), so the rect would always read it as the active section. Summing
// offsetTops ignores that pinning and measures where the section really sits
// in the document, letting the footer count only once you've scrolled to it.
function headerTop(el) {
	let top = 0;
	for (let e = el; e; e = e.offsetParent) top += e.offsetTop;
	return top;
}

function syncHeaderColor() {
	const headerBottom = _header.offsetHeight;
	const scrollY = window.scrollY;
	let activeSection = _colorSections[0] ?? null;
	for (const section of _colorSections) {
		// The sticky footer is pinned to the bottom of the viewport, so both
		// offsetTop and getBoundingClientRect().top read 0 for it at every scroll
		// position (it would always "win"). Measure its natural document top
		// instead: it's the last element, so that's scrollHeight - its height.
		const position = getComputedStyle(section).position;
		const top =
			position === "sticky"
				? document.documentElement.scrollHeight -
						section.offsetHeight -
						scrollY
				: headerTop(section) - scrollY;
		if (top <= headerBottom) {
			activeSection = section;
		}
	}
	if (activeSection) {
		_header.style.backgroundColor = activeSection.dataset.headerColor;
		_header.style.setProperty(
			"--section-color",
			activeSection.dataset.headerAccent ??
				activeSection.dataset.headerColor,
		);
		_header.style.setProperty(
			"--header-fg",
			contrastColor(activeSection.dataset.headerColor),
		);
	}
}

syncHeaderColor();

lenis.on("scroll", ({ scroll, limit }) => {
	if (scroll <= 50) {
		_header.classList.remove("header--hidden");
	} else if (scroll >= limit - 10) {
		_header.classList.add("header--hidden");
	} else if (scroll > lastScroll) {
		_header.classList.add("header--hidden");
	} else {
		_header.classList.remove("header--hidden");
	}
	lastScroll = scroll;
	syncHeaderColor();
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

/*=============== TECH STACK PANELS ===============*/
document.addEventListener("DOMContentLoaded", function () {
	const DISCIPLINES = {
		languages: {
			label: "languages",
			headline: "What I write in day to day.",
			categories: [
				{
					label: null,
					items: [
						{ name: "Python", icon: "assets/img/icons/python.svg" },
						{
							name: "TypeScript",
							icon: "assets/img/icons/typescript.svg",
						},
						{ name: "Java", icon: "assets/img/icons/java.svg" },
						{ name: "HTML", icon: "assets/img/icons/html.svg" },
						{ name: "CSS", icon: "assets/img/icons/css.svg" },
					],
				},
			],
		},
		software: {
			label: "software",
			headline: "I build the whole thing, not just the front.",
			categories: [
				{
					label: "Frontend",
					items: [
						{ name: "React", icon: "assets/img/icons/react.svg" },
						{
							name: "Next.js",
							icon: "https://www.svgrepo.com/show/354113/nextjs-icon.svg",
						},
						{
							name: "Tailwind",
							icon: "assets/img/icons/tailwind.svg",
						},
						{
							name: "Shadcn UI",
							icon: "assets/img/icons/shadcn.png",
						},
						{
							name: "Supabase",
							icon: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/supabase-icon.png",
						},
					],
				},
				{
					label: "Backend",
					items: [
						{
							name: "FastAPI",
							icon: "assets/img/icons/fastapi.svg",
						},
						{
							name: "Nest.js",
							icon: "assets/img/icons/nestjs.png",
						},
						{
							name: "PostgreSQL",
							icon: "assets/img/icons/postgresql.svg",
						},
						{
							name: "Drizzle",
							icon: "assets/img/icons/drizzle.png",
						},
					],
				},
				{
					label: "DevOps",
					items: [
						{ name: "Docker", icon: "assets/img/icons/docker.png" },
						{
							name: "Kubernetes",
							icon: "assets/img/icons/kubernetes.png",
						},
						{
							name: "AWS",
							icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/1280px-Amazon_Web_Services_Logo.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
						},
					],
				},
			],
		},
		data: {
			label: "data",
			headline: "I move data between places it needs to be.",
			categories: [
				{
					label: "Engineering",
					items: [
						{ name: "PySpark", icon: "assets/img/icons/spark.png" },
						{
							name: "Airflow",
							icon: "assets/img/icons/airflow.png",
						},
						{
							name: "GitHub Actions",
							icon: "assets/img/icons/actions.svg",
						},
					],
				},
				{
					label: "Analytics",
					items: [
						{ name: "SQL", icon: "assets/img/icons/sql.svg" },
						{ name: "Pandas", icon: "assets/img/icons/pandas.svg" },
						{ name: "NumPy", icon: "assets/img/icons/numpy.png" },
						{
							name: "Power BI",
							icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/New_Power_BI_Logo.svg/960px-New_Power_BI_Logo.svg.png?_=20210102182532",
						},
					],
				},
			],
		},
		ai: {
			label: "ai",
			headline: "I put LLMs into things people use.",
			categories: [
				{
					label: null,
					items: [
						{ name: "OpenAI", icon: "assets/img/icons/openai.png" },
						{
							name: "Anthropic",
							icon: "assets/img/icons/anthropic.png",
						},
						{
							name: "n8n",
							icon: "https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/n8n-color.png",
						},
						{
							name: "Langchain",
							icon: "https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/logos/langchain-ipuhh4qo1jz5ssl4x0g2a.png/langchain-dp1uxj2zn3752pntqnpfu2.png?_a=DATAiZAAZAA0",
						},
						{
							name: "PyTorch",
							icon: "assets/img/icons/pytorch.png",
						},
					],
				},
			],
		},
	};

	const root = document.getElementById("stack");
	if (!root) return;

	function renderItems(data) {
		return data.categories
			.map((cat) => {
				const label = cat.label
					? `<div class="stack__category-label">${cat.label}</div>`
					: "";
				const items = cat.items
					.map(
						(item) =>
							`<span class="stack__item"><img src="${item.icon}" alt="" loading="lazy">${item.name}</span>`,
					)
					.join("");
				return `<div class="stack__category">${label}<div class="stack__item-grid">${items}</div></div>`;
			})
			.join("");
	}

	root.innerHTML = Object.keys(DISCIPLINES)
		.map((key, i) => {
			const data = DISCIPLINES[key];
			return `
			<button class="stack__panel" type="button" data-discipline="${key}" aria-expanded="false">
				<span class="stack__head">
					<span class="stack__label">${data.label}</span>
				</span>
				<span class="stack__body">${renderItems(data)}</span>
				<span class="stack__headline">${data.headline}</span>
			</button>`;
		})
		.join("");

	const panels = Array.from(root.querySelectorAll(".stack__panel"));
	// Hover-expand only makes sense with a mouse; the whole card is always the
	// click target (pointer-events:none on the hidden chips keeps every part of
	// the card tappable).
	const hoverAble = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

	function activate(panel) {
		panels.forEach((p) => {
			const on = p === panel;
			p.classList.toggle("active", on);
			p.setAttribute("aria-expanded", String(on));
		});
	}

	panels.forEach((panel) => {
		// Mouse: the panel also expands under the cursor and snaps back once
		// the pointer leaves the row.
		if (hoverAble) {
			panel.addEventListener("mouseenter", () => activate(panel));
			panel.addEventListener("focus", () => activate(panel));
		}
		// The whole card is the click target: on a mouse it opens (hover/
		// mouseleave manage closed); on touch it toggles open/closed.
		panel.addEventListener("click", () => {
			if (hoverAble) {
				activate(panel);
			} else {
				activate(panel.classList.contains("active") ? null : panel);
			}
		});
	});

	if (hoverAble) {
		root.addEventListener("mouseleave", () => activate(null));
		root.addEventListener("focusout", (e) => {
			if (!root.contains(e.relatedTarget)) activate(null);
		});
	}
});

/*=============== MOBILE STACK: tap-to-reveal ===============*/

// Set current year in footer
document.addEventListener("DOMContentLoaded", function () {
	const yearEl = document.getElementById("currentYear");
	if (yearEl) {
		yearEl.textContent = new Date().getFullYear();
	}
});

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

	/*=============== SCROLL REVEAL ===============*/
	const revealEls = [
		...document.querySelectorAll(".section__title"),
		...document.querySelectorAll(".about__content p"),
		...document.querySelectorAll(".about__content a"),
		document.querySelector(".stack"),
		...document.querySelectorAll(".timeline-container"),
		document.querySelector(".experience-container"),
		...document.querySelectorAll(".projects-col"),
		document.querySelector(".github__grid"),
		document.querySelector(".contact__container"),
	].filter(Boolean);

	revealEls.forEach((el) => el.setAttribute("data-reveal", ""));

	[
		".about__content p",
		".about__content a",
		".timeline-container",
		".projects-col",
	].forEach((sel) => {
		document.querySelectorAll(sel).forEach((el, i) => {
			el.style.transitionDelay = `${i * 0.1}s`;
		});
	});

	const revealObserver = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add("revealed");
					if (entry.target.classList.contains("section__title")) {
						entry.target.classList.add("is-visible");
					}
					revealObserver.unobserve(entry.target);
				}
			});
		},
		{ threshold: 0.08, rootMargin: "0px 0px -20px 0px" },
	);

	function startReveals() {
		revealEls.forEach((el) => revealObserver.observe(el));
	}

	if (document.getElementById("loading-screen")) {
		document.addEventListener("loadingComplete", startReveals, {
			once: true,
		});
	} else {
		startReveals();
		document
			.getElementById("header")
			.classList.remove("header--pre-reveal");
	}

	/*=============== SCROLL PROGRESS BAR ===============*/
	const scrollProgress = document.getElementById("scroll-progress");
	window.addEventListener("scroll", () => {
		const scrollTop = document.documentElement.scrollTop;
		const scrollHeight =
			document.documentElement.scrollHeight -
			document.documentElement.clientHeight;
		scrollProgress.style.width = (scrollTop / scrollHeight) * 100 + "%";
	});

	/*=============== PROJECT DRAWER ===============*/
	const projectDrawer = document.getElementById("project-drawer");
	const drawerBackdrop = document.getElementById("drawerBackdrop");
	const drawerClose = document.getElementById("drawerClose");
	const drawerTag = document.getElementById("drawerTag");
	const drawerTitle = document.getElementById("drawerTitle");
	const drawerYear = document.getElementById("drawerYear");
	const drawerImg = document.getElementById("drawerImg");
	const drawerDesc = document.getElementById("drawerDesc");
	const drawerTech = document.getElementById("drawerTech");
	const drawerLink = document.getElementById("drawerLink");
	const drawerGithub = document.getElementById("drawerGithub");
	const drawerGithubWrapper = document.getElementById("drawerGithubWrapper");

	function openDrawer(card) {
		drawerTag.textContent =
			card.querySelector(".project-card__tag")?.textContent || "";
		drawerTitle.textContent =
			card.querySelector(".project-card__title")?.textContent || "";
		drawerYear.textContent =
			card.querySelector(".project-card__year")?.textContent || "";
		drawerImg.src = card.querySelector(".project-card__img img")?.src || "";
		drawerImg.alt = card.querySelector(".project-card__img img")?.alt || "";
		drawerDesc.textContent = card.dataset.description || "";
		drawerTech.innerHTML = (card.dataset.tech || "")
			.split(",")
			.filter(Boolean)
			.map((t) => `<span class="project-drawer__chip">${t.trim()}</span>`)
			.join("");
		drawerLink.href = card.href;
		const github = card.dataset.github;
		if (github) {
			drawerGithub.href = github;
			drawerGithubWrapper.style.display = "";
		} else {
			drawerGithubWrapper.style.display = "none";
		}
		projectDrawer.classList.add("active");
		projectDrawer.setAttribute("aria-hidden", "false");
		lenis.stop();
	}

	function closeDrawer() {
		projectDrawer.classList.remove("active");
		projectDrawer.setAttribute("aria-hidden", "true");
		lenis.start();
	}

	document.querySelectorAll(".project-card").forEach((card) => {
		card.addEventListener("click", (e) => {
			e.preventDefault();
			openDrawer(card);
		});
	});

	drawerBackdrop.addEventListener("click", closeDrawer);
	drawerClose.addEventListener("click", closeDrawer);
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && projectDrawer.classList.contains("active"))
			closeDrawer();
	});
});

/*=============== FOOTER SIGNATURE DRAW-IN ===============*/
// Plays the hand-drawn write-in on the footer “nauqh.” once the sticky
// footer has risen far enough into view (so it draws as it slides up).
(function footerSignatureDraw() {
	const contact = document.getElementById("contact");
	const sign = contact && contact.querySelector(".contact__signature");
	if (!contact || !sign) return;

	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		sign.classList.add("is-written");
		return;
	}

	// The footer is sticky, so its rect is in the viewport for most of the
	// page. Use its natural document top instead to time the reveal.
	const footerTop = () =>
		document.documentElement.scrollHeight - contact.offsetHeight;
	let done = false;

	function onScroll() {
		if (done) return;
		// fire once the footer’s top reaches the viewport bottom, i.e. as soon
		// as it starts rising out from under the closing section. (A viewport-
		// fraction threshold fails when the footer is shorter than that
		// fraction of the screen — it would never be reached on mobile.)
		if (window.scrollY + window.innerHeight >= footerTop()) {
			done = true;
			sign.classList.add("is-written");
			if (lenis && lenis.off) lenis.off("scroll", onScroll);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		}
	}

	if (lenis && lenis.on) lenis.on("scroll", onScroll);
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onScroll);
	onScroll(); // already at the bottom on load
})();

/*=============== GITHUB PROJECTS & STATS ===============*/
document.addEventListener("DOMContentLoaded", function () {
	const USERNAME = "nauqh";
	const GITHUB_URL = `https://github.com/${USERNAME}`;
	const statsEl = document.getElementById("githubStats");
	const reposEl = document.getElementById("githubRepos");
	if (!statsEl || !reposEl) return;

	// The portfolio repo + auto-generated profile repo are excluded. Everything
	// rendered here comes from PUBLIC GitHub data only — no private work leaks in.
	const EXCLUDED = new Set(["nauqh", "nauqh.github.io"]);
	const MONTHS = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const LEVEL_COLORS = [
		"#EDE9FE",
		"#C4B5FD",
		"#A78BFA",
		"#8B5CF6",
		"#6D28D9",
	];
	const LANG_COLORS = {
		Python: "#3572A5",
		TypeScript: "#3178c6",
		JavaScript: "#f1e05a",
		CSS: "#563d7c",
		HTML: "#e34c26",
		Java: "#b07219",
		"C++": "#f34b7d",
		C: "#555555",
		Shell: "#89e051",
		Dockerfile: "#384d54",
		"Jupyter Notebook": "#DA5B0B",
		R: "#198CE7",
		Go: "#00ADD8",
		Rust: "#dea584",
		Swift: "#F05138",
		Kotlin: "#A97BFF",
		Vue: "#41b883",
		Svelte: "#ff3e00",
	};

	statsEl.innerHTML = '<p class="github__loading">Pulling GitHub data…</p>';

	function escapeHtml(str) {
		return String(str).replace(
			/[&<>"']/g,
			(c) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
				})[c],
		);
	}
	function langColor(lang) {
		return LANG_COLORS[lang] || "#8B5CF6";
	}
	function parseDate(s) {
		const [y, m, d] = s.split("-").map(Number);
		return new Date(y, m - 1, d);
	}
	function dayCol(d) {
		return (d.getDay() + 6) % 7;
	} // Mon = 0 … Sun = 6
	function addDays(d, n) {
		const c = new Date(d);
		c.setDate(c.getDate() + n);
		return c;
	}
	function formatDate(iso) {
		if (!iso) return "";
		const diff = Date.now() - new Date(iso).getTime();
		const days = Math.floor(diff / 86400000);
		if (days < 1) return "today";
		if (days < 30) return `${days}d ago`;
		if (days < 365) return `${Math.floor(days / 30)}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}

	function buildHeatmap(contributions) {
		const first = parseDate(contributions[0].date);
		const firstMonday = addDays(first, -dayCol(first));
		const weeks = [];
		let week = new Array(7).fill(null);
		contributions.forEach((c, i) => {
			const d = parseDate(c.date);
			const r = dayCol(d);
			week[r] = c.level;
			if (r === 6 || i === contributions.length - 1) {
				weeks.push(week.slice());
				week = new Array(7).fill(null);
			}
		});
		const weekCount = weeks.length;

		const months = [];
		let prev = -1;
		weeks.forEach((_, wi) => {
			const m = addDays(firstMonday, wi * 7).getMonth();
			if (m !== prev) {
				months.push({ wi, m });
				prev = m;
			}
		});
		months.forEach((mo, i) => {
			const end = i + 1 < months.length ? months[i + 1].wi : weekCount;
			mo.span = Math.max(1, end - mo.wi);
		});

		let html = "";
		months.forEach((mo) => {
			html += `<span class="gh-heat__month" style="grid-column:${2 + mo.wi} / span ${mo.span};grid-row:1">${MONTHS[mo.m]}</span>`;
		});
		[
			["Mon", 2],
			["Wed", 4],
			["Fri", 6],
		].forEach(([label, row]) => {
			html += `<span class="gh-heat__day" style="grid-column:1;grid-row:${row}">${label}</span>`;
		});
		weeks.forEach((wk, wi) => {
			wk.forEach((lvl, row) => {
				if (lvl === null) return;
				html += `<span class="gh-cell gh-cell--lvl${lvl}" style="grid-column:${2 + wi};grid-row:${2 + row};background:${LEVEL_COLORS[lvl]}"></span>`;
			});
		});

		return { html, weekCount };
	}

	function computeStats(contributions) {
		let total = 0,
			active = 0,
			longest = 0,
			run = 0;
		for (const c of contributions) {
			if (c.count > 0) {
				active++;
				total += c.count;
				run++;
				if (run > longest) longest = run;
			} else run = 0;
		}
		let current = 0;
		for (let i = contributions.length - 1; i >= 0; i--) {
			if (contributions[i].count > 0) current++;
			else break;
		}
		return { total, active, longest, current };
	}

	function renderStats(contributions) {
		const { html: heatHTML, weekCount } = buildHeatmap(contributions);
		const s = computeStats(contributions);

		statsEl.innerHTML = `
			<div class="gh-card">
				<div class="gh-card__head">
					<div class="gh-card__head-left">
						<span class="gh-card__eyebrow">github</span>
						<a class="gh-card__link" href="${GITHUB_URL}" target="_blank" rel="noopener">github.com/${USERNAME} <i class="bx bx-link-external"></i></a>
					</div>
					<div class="gh-card__total">
						<span class="gh-card__total-num">${s.total.toLocaleString()}</span>
						<span class="gh-card__total-label">contributions · last year</span>
					</div>
				</div>
				<div class="gh-card__grid-wrap">
					<div class="gh-heat" style="grid-template-columns:30px repeat(${weekCount},12px);grid-template-rows:20px repeat(7,12px)">${heatHTML}</div>
				</div>
				<div class="gh-card__foot">
					<div class="gh-legend">
						<span class="gh-legend-label">less</span>
						${LEVEL_COLORS.map((c) => `<span class="gh-legend-cell" style="background:${c}"></span>`).join("")}
						<span class="gh-legend-label">more</span>
					</div>
					<div class="gh-kpis">
						<div class="gh-kpi"><span class="gh-kpi-num">${s.current}</span><span class="gh-kpi-label">current streak</span></div>
						<div class="gh-kpi"><span class="gh-kpi-num">${s.longest}</span><span class="gh-kpi-label">longest streak</span></div>
						<div class="gh-kpi"><span class="gh-kpi-num">${s.active.toLocaleString()}</span><span class="gh-kpi-label">active days</span></div>
					</div>
				</div>
			</div>`;
	}

	function renderRepos(repos) {
		reposEl.innerHTML = repos
			.map(
				(r) => `
			<a class="github__repo" href="${r.html_url}" target="_blank" rel="noopener">
				<div class="github__repo-head">
					<span class="github__repo-name">${escapeHtml(r.name)}</span>
					<i class="bx bx-right-arrow-alt github__repo-arrow"></i>
				</div>
				<p class="github__repo-desc">${r.description ? escapeHtml(r.description) : ""}</p>
				<div class="github__repo-meta">
					${r.language ? `<span><span class="github__repo-langdot" style="--dot:${langColor(r.language)}"></span>${escapeHtml(r.language)}</span>` : ""}
					<span><i class="bx bxs-star"></i> ${r.stargazers_count || 0}</span>
					<span><i class="bx bx-git-repo-forked"></i> ${r.forks_count || 0}</span>
					<span><i class="bx bx-time-five"></i> ${formatDate(r.pushed_at)}</span>
				</div>
			</a>`,
			)
			.join("");
	}

	async function load() {
		try {
			const [contribRes, reposRes] = await Promise.all([
				fetch(
					`https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`,
				),
				fetch(
					`https://api.github.com/users/${USERNAME}/repos?sort=pushed&per_page=100&type=public`,
				),
			]);
			if (!contribRes.ok || !reposRes.ok)
				throw new Error("GitHub API error");
			const contrib = await contribRes.json();
			const repos = (await reposRes.json()).filter(
				(r) => r && !EXCLUDED.has(r.name),
			);
			if (!contrib.contributions || !contrib.contributions.length)
				throw new Error("no contributions");

			renderStats(contrib.contributions);
			renderRepos(
				[...repos]
					.sort(
						(a, b) => new Date(b.pushed_at) - new Date(a.pushed_at),
					)
					.slice(0, 4),
			);
		} catch (err) {
			statsEl.innerHTML = `<p class="github__error">Couldn't load GitHub data right now — <a href="${GITHUB_URL}" target="_blank" rel="noopener">view my profile</a>.</p>`;
			reposEl.innerHTML = "";
		}
	}

	load();
});
