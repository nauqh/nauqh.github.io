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

// clip-path only hides the closed menu visually; inert also takes its links
// out of the tab order and the accessibility tree.
navOverlay.inert = true;

function openNav() {
	navOverlay.classList.add("active");
	navOverlay.inert = false;
	navBackdrop.classList.add("active");
	document.body.style.overflow = "hidden";
	lenis.stop();
}

function closeNav() {
	navOverlay.classList.remove("active");
	navOverlay.inert = true;
	navBackdrop.classList.remove("active");
	document.body.style.overflow = "";
	lenis.start();
}

navMenuBtn.addEventListener("click", openNav);
navClose.addEventListener("click", closeNav);

document.querySelectorAll("[data-close]").forEach((link) => {
	link.addEventListener("click", (e) => {
		closeNav();
		// The sticky footer always reads as pinned in view, so the native jump
		// to #contact barely moves. It's the last thing on the page: go to the end.
		if (link.hash === "#contact") {
			e.preventDefault();
			lenis.scrollTo(lenis.limit);
		}
	});
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
		document.querySelector(".building__card"),
		document.querySelector(".contact__container"),
		document.querySelector(".archive__table"),
		document.querySelector(".error__card"),
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
	if (scrollProgress) {
		lenis.on("scroll", ({ progress }) => {
			scrollProgress.style.width = progress * 100 + "%";
		});
	}

	/*=============== PROJECT DRAWER ===============*/
	const projectDrawer = document.getElementById("project-drawer");
	const drawerBackdrop = document.getElementById("drawerBackdrop");
	const drawerClose = document.getElementById("drawerClose");
	const drawerTag = document.getElementById("drawerTag");
	const drawerTitle = document.getElementById("drawerTitle");
	const drawerYear = document.getElementById("drawerYear");
	const drawerImg = document.getElementById("drawerImg");
	const drawerThumbs = document.getElementById("drawerThumbs");
	if (!projectDrawer) return;
	// Autoplay: one full progress ring per image, then advance to the next.
	const AUTOPLAY_MS = 4000; // keep in sync with .drawer-ring-fill duration
	let galleryTimer = null;

	function stopGalleryAuto() {
		if (galleryTimer) {
			clearTimeout(galleryTimer);
			galleryTimer = null;
		}
	}

	function restartRing(btn) {
		btn.style.animation = "none";
		void btn.offsetWidth;
		btn.style.animation = "";
	}
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
	const cardImg = card.querySelector(".project-card__img img");
	// Multi-image gallery: a card can carry data-images="a.png,b.png" and the
	// drawer shows a main shot plus clickable thumbnails. Without it, the
	// single card thumbnail is used as before.
	const images = (card.dataset.images || "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	if (images.length > 0) {
		drawerImg.src = images[0];
		drawerImg.alt = cardImg?.alt || drawerTitle.textContent;
		drawerImg.onerror = () => {
			// Gallery files may not exist yet - fall back to the card shot.
			if (cardImg?.src) drawerImg.src = cardImg.src;
			drawerThumbs.hidden = true;
		};
		drawerThumbs.hidden = false;
		drawerThumbs.innerHTML = images
			.map(
				(src, i) =>
					`<button type="button" class="project-drawer__thumb${i === 0 ? " active" : ""}" data-src="${src}" aria-label="view image ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`,
			)
			.join("");
		const thumbs = drawerThumbs.querySelectorAll(".project-drawer__thumb");
		const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		const activate = (btn) => {
			// restart the subtle fade-in on every switch
			drawerImg.classList.remove("is-switching");
			void drawerImg.offsetWidth;
			drawerImg.src = btn.dataset.src;
			drawerImg.classList.add("is-switching");
			thumbs.forEach((b) => b.classList.toggle("active", b === btn));
			restartRing(btn);
		};

		function startAuto() {
			stopGalleryAuto();
			if (reduceMotion || thumbs.length < 2) return;
			galleryTimer = setTimeout(() => {
				const cur = Array.from(thumbs).findIndex((b) =>
					b.classList.contains("active"),
				);
				activate(thumbs[(cur + 1) % thumbs.length]);
				startAuto();
			}, AUTOPLAY_MS);
		}

		thumbs.forEach((btn) => {
			const thumbImg = btn.querySelector("img");
			if (thumbImg) {
				thumbImg.onerror = () => btn.remove();
			}
			btn.addEventListener("click", () => {
				activate(btn);
				startAuto();
			});
		});
		startAuto();
	} else {
		drawerImg.src = cardImg?.src || "";
		drawerImg.alt = cardImg?.alt || "";
		drawerImg.onerror = null;
		drawerThumbs.hidden = true;
		drawerThumbs.innerHTML = "";
		stopGalleryAuto();
	}
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
		document.body.style.overflow = "hidden";
	}

	function closeDrawer() {
		projectDrawer.classList.remove("active");
		projectDrawer.setAttribute("aria-hidden", "true");
		lenis.start();
		document.body.style.overflow = "";
		stopGalleryAuto();
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
		// fraction of the screen - it would never be reached on mobile.)
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
	// rendered here comes from PUBLIC GitHub data only - no private work leaks in.
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

	const CACHE_KEY = "gh-panel-cache-v1";
	const CACHE_TTL = 60 * 60 * 1000; // 1h - avoids re-hitting the GitHub API on every page load

	function readCache() {
		try {
			const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
			if (!parsed || !parsed.contributions || !parsed.repos) return null;
			return parsed;
		} catch {
			return null;
		}
	}

	function writeCache(contributions, repos) {
		try {
			localStorage.setItem(
				CACHE_KEY,
				JSON.stringify({ contributions, repos, savedAt: Date.now() }),
			);
		} catch {
			// storage unavailable/full - caching is a nice-to-have, skip silently
		}
	}

	function renderFrom(contributions, repos) {
		renderStats(contributions);
		renderRepos(
			[...repos]
				.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
				.slice(0, 4),
		);
	}

	async function load() {
		const cached = readCache();
		if (cached && Date.now() - cached.savedAt < CACHE_TTL) {
			renderFrom(cached.contributions, cached.repos);
			return;
		}

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

			writeCache(contrib.contributions, repos);
			renderFrom(contrib.contributions, repos);
		} catch (err) {
			if (cached) {
				renderFrom(cached.contributions, cached.repos);
				return;
			}
			statsEl.innerHTML = `<p class="github__error">Couldn't load GitHub data right now - <a href="${GITHUB_URL}" target="_blank" rel="noopener">view my profile</a>.</p>`;
			reposEl.innerHTML = "";
		}
	}

	load();
});
