/*=============== LENIS SMOOTH SCROLL ===============*/
const lenis = new Lenis({
	duration: 1.2,
	easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
	smoothWheel: true,
});

function raf(time) {
	lenis.raf(time);
	requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

/*=============== NAV OVERLAY ===============*/
const navOverlay  = document.getElementById("navOverlay");
const navBackdrop = document.getElementById("navBackdrop");
const navMenuBtn  = document.getElementById("navMenuBtn");
const navClose    = document.getElementById("navClose");

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

document.querySelectorAll("[data-close]").forEach(link => {
	link.addEventListener("click", closeNav);
});

navBackdrop.addEventListener("click", closeNav);

document.addEventListener("keydown", e => {
	if (e.key === "Escape") closeNav();
});

/*=============== HIDE/SHOW HEADER ON SCROLL ===============*/
let lastScroll = 0;
lenis.on("scroll", ({ scroll }) => {
	const header = document.getElementById("header");
	if (scroll <= 50) {
		header.classList.remove("header--hidden");
	} else if (scroll > lastScroll) {
		header.classList.add("header--hidden");
	} else {
		header.classList.remove("header--hidden");
	}
	lastScroll = scroll;
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

/*=============== TERMINAL TECH STACK ===============*/
document.addEventListener("DOMContentLoaded", function () {
	const DISCIPLINES = {
		languages: {
			cmd: "ls ~/languages",
			categories: [
				{
					label: null,
					items: [
						{ name: "Python",     icon: "assets/img/icons/python.svg" },
						{ name: "TypeScript", icon: "assets/img/icons/typescript.svg" },
						{ name: "Java",       icon: "assets/img/icons/java.svg" },
						{ name: "HTML",       icon: "assets/img/icons/html.svg" },
						{ name: "CSS",        icon: "assets/img/icons/css.svg" },
					],
				},
			],
		},
		software: {
			cmd: "ls ~/software",
			categories: [
				{
					label: "Frontend",
					items: [
						{ name: "React",       icon: "assets/img/icons/react.svg" },
						{ name: "Next.js",     icon: "assets/img/icons/nextjs.png" },
						{ name: "Tailwind",    icon: "assets/img/icons/tailwind.svg" },
						{ name: "Shadcn UI",   icon: "assets/img/icons/shadcn.png" },
						{ name: "Supabase",    icon: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/supabase-icon.png" },
					],
				},
				{
					label: "Backend",
					items: [
						{ name: "FastAPI",    icon: "assets/img/icons/fastapi.svg" },
						{ name: "Nest.js",    icon: "assets/img/icons/nestjs.png" },
						{ name: "PostgreSQL", icon: "assets/img/icons/postgresql.svg" },
						{ name: "Drizzle",    icon: "assets/img/icons/drizzle.png" },
					],
				},
				{
					label: "DevOps",
					items: [
						{ name: "Docker",     icon: "assets/img/icons/docker.png" },
						{ name: "Kubernetes", icon: "assets/img/icons/kubernetes.png" },
						{ name: "AWS",        icon: "assets/img/icons/aws.webp" },
					],
				},
			],
		},
		data: {
			cmd: "ls ~/data",
			categories: [
				{
					label: "Engineering",
					items: [
						{ name: "PySpark",        icon: "assets/img/icons/spark.png" },
						{ name: "Airflow",        icon: "assets/img/icons/airflow.png" },
						{ name: "GitHub Actions", icon: "assets/img/icons/actions.svg" },
					],
				},
				{
					label: "Analytics",
					items: [
						{ name: "SQL",      icon: "assets/img/icons/sql.svg" },
						{ name: "Pandas",   icon: "assets/img/icons/pandas.svg" },
						{ name: "NumPy",    icon: "assets/img/icons/numpy.png" },
						{ name: "Power BI", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/New_Power_BI_Logo.svg/1200px-New_Power_BI_Logo.svg.png" },
					],
				},
			],
		},
		ai: {
			cmd: "ls ~/ai",
			categories: [
				{
					label: null,
					items: [
						{ name: "OpenAI",    icon: "assets/img/icons/openai.png" },
						{ name: "Anthropic", icon: "assets/img/icons/anthropic.png" },
						{ name: "n8n",       icon: "https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/n8n-color.png" },
						{ name: "Langchain", icon: "assets/img/icons/langchain.png" },
						{ name: "PyTorch",   icon: "assets/img/icons/pytorch.png" },
					],
				},
			],
		},
	};

	const tabs      = document.querySelectorAll(".terminal__tab");
	const cmdEl     = document.getElementById("termCmd");
	const cursorEl  = document.getElementById("termCursor");
	const contentEl = document.getElementById("termContent");

	if (!tabs.length || !cmdEl) return;

	let typingTimer = null;

	function renderContent(discipline) {
		const data = DISCIPLINES[discipline];
		contentEl.innerHTML = data.categories
			.map((cat) => {
				const label = cat.label
					? `<div class="term-category__label">${cat.label}/</div>`
					: "";
				const items = cat.items
					.map(
						(item) =>
							`<span class="term-item"><img src="${item.icon}" alt="${item.name}">${item.name}</span>`,
					)
					.join("");
				return `<div class="term-category">${label}<div class="term-category__grid">${items}</div></div>`;
			})
			.join("");
	}

	function typeCommand(text, onDone) {
		clearTimeout(typingTimer);
		cmdEl.textContent = "";
		contentEl.classList.remove("visible");
		cursorEl.classList.add("typing");

		let i = 0;
		function tick() {
			if (i < text.length) {
				cmdEl.textContent += text[i++];
				typingTimer = setTimeout(tick, 38);
			} else {
				cursorEl.classList.remove("typing");
				onDone();
			}
		}
		tick();
	}

	function activate(discipline) {
		const data = DISCIPLINES[discipline];
		typeCommand(data.cmd, () => {
			renderContent(discipline);
			requestAnimationFrame(() => contentEl.classList.add("visible"));
		});
	}

	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			tabs.forEach((t) => t.classList.remove("active"));
			tab.classList.add("active");
			activate(tab.dataset.discipline);
		});
	});

	activate("software");
});

/*=============== TOUCH FLIP DISABLED: hover-only ===============*/

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

/*=============== SECTION TITLE EMPHASIS ===============*/
const titleObserver = new IntersectionObserver(
	(entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				entry.target.classList.add("is-visible");
				titleObserver.unobserve(entry.target);
			}
		});
	},
	{ threshold: 0.3 }
);

document.querySelectorAll(".section__title").forEach((title) => {
	titleObserver.observe(title);
});

/*=============== SCROLL PROGRESS BAR ===============*/
const scrollProgress = document.getElementById("scroll-progress");
window.addEventListener("scroll", () => {
	const scrollTop = document.documentElement.scrollTop;
	const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
	scrollProgress.style.width = (scrollTop / scrollHeight * 100) + "%";
});
});
