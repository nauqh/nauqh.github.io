// Decade and colors
// Color palette: https://coolors.co/palette/33a8c7-52e3e1-a0e426-fdf148-ffab00-f77976-f050ae-d883ff-9336fd
const decadeColors = {
	"1920s": "#33a8c7",
	"1930s": "#52e3e1",
	"1940s": "#a0e426",
	"1950s": "#2ca02c",
	"1960s": "#ffab00",
	"1970s": "#f77976",
	"1980s": "#f050ae",
	"1990s": "#d883ff",
	"2000s": "#9336fd",
	"2010s": "#6a1b9a",
	"2020s": "#1a237e",
};

// Audio features to display in the charts (radar and line charts)
// Color palette: https://coolors.co/palette/50514f-f25f5c-ffe066-247ba0-70c1b3
// Color palette: https://coolors.co/palette/d88c9a-f2d0a9-f1e3d3-99c1b9-8e7dbe
const featureColors = {
	acousticness: "#70c1b3",
	valence: "#247ba0",
	liveness: "#ffe066",
	instrumentalness: "#f25f5c",
	speechiness: "#50514f",
	energy: "#8e7dbe",
	danceability: "#d88c9a",
};

// Selected decades, default to all decades
const decades = Object.keys(decadeColors);
let selectedDecades = [...decades];

const features = Object.keys(featureColors);

// Margins for chart canvas
const chartMargin = {
	top: 100, // Space for title
	right: 80, // Space for legend or secondary axis labels
	bottom: 80, // Space for x-axis labels
	left: 80, // Space for y-axis labels
};

// Helper function to update all charts
function updateAllCharts() {
	createGenreChart(selectedDecades);
	createRadarChart(selectedDecades);
	createLoudnessChart(selectedDecades);
	createTempoChart(selectedDecades);
	createAudioLineChart(selectedDecades);
	createTracksGenresChart(selectedDecades);
}

// Load and process genre data
let genreData = [];
let audioData = [];
let annotations = {};
let tracksByDecadeData = [];

// Load CSV files and JSON file, render charts after all are loaded
Promise.all([
	d3.csv("data/genre_counts.csv", d3.autoType),
	d3.csv("data/decade_audio.csv", d3.autoType),
	d3.json("data/decade_overview.json"),
	d3.csv("data/tracks_by_decade.csv", d3.autoType),
]).then(([genreCsvData, audioCsvData, annotationsData, tracksCsvData]) => {
	genreData = genreCsvData;
	audioData = audioCsvData;
	annotations = annotationsData;
	tracksByDecadeData = tracksCsvData;

	// Render charts
	updateAllCharts();

	// Add resize handler to rerender charts when changing screen size
	// Ref: https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event
	window.addEventListener("resize", updateAllCharts);
});

function createTracksGenresChart(selectedDecades) {
	// Clear previous render
	d3.select("#tracks-bar-chart").remove();
	d3.select("#genres-bar-chart").remove();

	// Prepare data for selected decades
	const data = selectedDecades.map((decade) => ({
		decade,
		tracks: tracksByDecadeData.find((d) => d.decade === decade).count,
		genres: new Set(
			genreData.filter((d) => d.decade === decade).map((d) => d.genres)
		).size,
	}));

	// Get container dimensions
	const container = d3.select("#genre-line-bar-chart-container").node();
	const width = container.getBoundingClientRect().width;
	const height = 600;
	const margin = chartMargin;

	// Create x scale
	const x = d3
		.scaleBand()
		.domain(selectedDecades)
		.rangeRound([margin.left, width - margin.right])
		.paddingInner(0.1);

	// Create y scales
	const yTracks = d3
		.scaleLinear()
		.domain([0, d3.max(data, (d) => d.tracks)])
		.range([height - margin.bottom, margin.top]);

	const yGenres = d3
		.scaleLinear()
		.domain([0, d3.max(data, (d) => d.genres)])
		.range([height - margin.bottom, margin.top]);

	// ========== Tracks chart ==========
	const tracksSvg = d3
		.create("svg")
		.attr("id", "tracks-bar-chart")
		.attr("width", width)
		.attr("height", height)
		.style("display", "block");

	// Add bars for tracks
	tracksSvg
		.append("g")
		.selectAll("rect")
		.data(data)
		.join("rect")
		.attr("x", (d) => x(d.decade))
		.attr("y", (d) => yTracks(d.tracks))
		.attr("width", x.bandwidth())
		.attr("height", (d) => yTracks(0) - yTracks(d.tracks))
		.style("fill", "#33a8c7");

	// Add labels on bars
	tracksSvg
		.append("g")
		.selectAll("text")
		.data(data)
		.join("text")
		.attr("x", (d) => x(d.decade) + x.bandwidth() / 2)
		.attr("y", (d) => yTracks(d.tracks) - 20)
		.attr("text-anchor", "middle")
		.attr("fill", "#33a8c7")
		.text((d) => d.tracks.toLocaleString());

	// Add axes for tracks chart
	// X-axis
	tracksSvg
		.append("g")
		.attr("class", "axis axis-x")
		.attr("transform", `translate(0,${height - margin.bottom})`)
		.call(d3.axisBottom(x).tickSizeOuter(0)) // Remove the outer ticks
		.append("text")
		.attr("class", "axis-label")
		.attr("x", width / 2)
		.attr("y", margin.bottom - 20)
		.attr("fill", "currentColor")
		.text("Decade");

	// Y-axis
	tracksSvg
		.append("g")
		.attr("class", "axis axis-y")
		.attr("transform", `translate(${margin.left},0)`)
		.call(d3.axisLeft(yTracks).ticks(null, "s").tickSizeOuter(0));

	// Y-axis label
	tracksSvg
		.append("text")
		.attr("class", "axis-label")
		.attr("x", margin.left - 20)
		.attr("y", margin.top - 30)
		.text("Tracks");

	// Title
	tracksSvg
		.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", margin.top - 60)
		.text("Tracks by Decade");

	// ========== Create genres chart ==========
	const genresSvg = d3
		.create("svg")
		.attr("id", "genres-bar-chart")
		.attr("width", width)
		.attr("height", height)
		.style("display", "none");

	// Add bars for genres
	genresSvg
		.append("g")
		.selectAll("rect")
		.data(data)
		.join("rect")
		.attr("x", (d) => x(d.decade))
		.attr("width", x.bandwidth())
		.attr("y", (d) => yGenres(d.genres))
		.attr("height", (d) => yGenres(0) - yGenres(d.genres))
		.style("fill", "#43c6ac");

	// Add labels on bars
	genresSvg
		.append("g")
		.selectAll("text")
		.data(data)
		.join("text")
		.attr("x", (d) => x(d.decade) + x.bandwidth() / 2)
		.attr("y", (d) => yGenres(d.genres) - 20)
		.attr("text-anchor", "middle")
		.attr("fill", "#43c6ac")
		.text((d) => d.genres.toLocaleString());

	// Add axes for genres chart
	// X-axis
	genresSvg
		.append("g")
		.attr("class", "axis axis-x")
		.attr("transform", `translate(0,${height - margin.bottom})`)
		.call(d3.axisBottom(x).tickSizeOuter(0))
		.append("text")
		.attr("class", "axis-label")
		.attr("x", width / 2)
		.attr("y", margin.bottom - 20)
		.attr("fill", "currentColor")
		.text("Decade");

	// Y-axis
	genresSvg
		.append("g")
		.attr("class", "axis axis-y")
		.attr("transform", `translate(${margin.left},0)`)
		.call(d3.axisLeft(yGenres).ticks(null, "s").tickSizeOuter(0));

	// Y-axis label
	genresSvg
		.append("text")
		.attr("class", "axis-label")
		.attr("x", margin.left - 20)
		.attr("y", margin.top - 30)
		.text("Genres");

	// Title
	genresSvg
		.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", margin.top - 60)
		.text("Genres by Decade");

	// Add charts to container
	container.appendChild(tracksSvg.node());
	container.appendChild(genresSvg.node());

	// Set up toggle to switch between charts
	d3.select("#tracks-genres-toggle").on("change", function () {
		tracksSvg.style("display", this.checked ? "none" : "block");
		genresSvg.style("display", this.checked ? "block" : "none");
	});
}

function createGenreChart(selectedDecades) {
	// Ref: https://observablehq.com/@d3/grouped-bar-chart/2
	// Clear previous render
	d3.select("#genre-bar-chart").remove();
	d3.select("#genre-bar-chart-annotation").remove();
	d3.select("#genre-bar-chart-toggle").remove();

	// Filter data for selected decades and group by decade
	const data = genreData.filter((d) => selectedDecades.includes(d.decade));

	// Group by decade and get top 15 genres for each
	const groupedData = d3.group(data, (d) => d.decade);
	for (const [decade, values] of groupedData) {
		groupedData.set(decade, values.slice(0, 15));
	}

	// Get container dimensions
	const container = d3.select("#genre-bar-chart-container").node();
	const margin = chartMargin;
	const width = container.getBoundingClientRect().width;
	const height = width / 2;

	// Prepare scales
	// fx encodes the decade
	const fx = d3
		.scaleBand()
		.domain(selectedDecades)
		.rangeRound([margin.left, width - margin.right]);

	// y encodes the count
	const maxCount = d3.max(
		Array.from(groupedData.values()).flat(),
		(d) => d.count
	);

	const y = d3
		.scaleLinear()
		.domain([0, maxCount])
		.range([height - margin.bottom, margin.top]);

	// Get tooltip
	const tooltip = d3.select(".tooltip");

	// Create SVG
	const svg = d3
		.create("svg")
		.attr("id", "genre-bar-chart")
		.attr("width", width)
		.attr("height", height);

	// Create annotation box
	const annotationBox = d3
		.select("#genre-bar-chart-container")
		.append("div")
		.attr("id", "genre-bar-chart-annotation")
		.style("position", "absolute")
		.style("left", `${margin.left + 50}px`)
		.style("top", `${margin.top - 70}px`);

	// Create annotation paragraphs for all decades
	const defaultDecade = selectedDecades[0];
	annotationBox
		.selectAll(".decade-annotation")
		.data(decades)
		.join("p")
		.attr("class", "decade-annotation")
		.attr("data-decade", (d) => d)
		.style("display", (d) => (d === defaultDecade ? "block" : "none"))
		.html(
			(d) => `
		<b style="display:block; font-size:2rem; color:${decadeColors[d]};">${d}
		</b><span style="font-size:1rem">${annotations[d]}</span>`
		);

	// Create toggle button for annotations
	const toggleContainer = d3
		.select("#genre-bar-chart-container")
		.append("div")
		.attr("id", "genre-bar-chart-toggle")
		.style("right", `${margin.right}px`)
		.style("top", `${margin.top - 50}px`);

	toggleContainer
		.append("input")
		.attr("type", "checkbox")
		.attr("id", "annotation-toggle-checkbox")
		.attr("checked", true)
		.on("change", function () {
			const isChecked = this.checked;
			annotationBox.style("display", isChecked ? "block" : "none");
		});

	toggleContainer
		.append("label")
		.attr("for", "annotation-toggle-checkbox")
		.text("Show decade overview");

	// Append a group for each decade, and a rect for each genre
	svg.append("g")
		.selectAll()
		.data(groupedData)
		.join("g")
		.attr("transform", ([decade]) => `translate(${fx(decade)},0)`)
		.each(function ([decade, decadeData]) {
			// Create x scale for this specific decade's genres
			const decadeGenres = decadeData.map((d) => d.genres);
			const x = d3
				.scaleBand()
				.domain(decadeGenres)
				.rangeRound([0, fx.bandwidth()]);

			// Append bars for this decade
			d3.select(this)
				.selectAll("rect")
				.data(decadeData)
				.join("rect")
				.attr("x", (d) => x(d.genres))
				.attr("y", (d) => y(d.count))
				.attr("width", x.bandwidth())
				.attr("height", (d) => y(0) - y(d.count))
				.attr("fill", decadeColors[decade])
				.attr("stroke", "#fff")
				.on("mouseover", function (event, d) {
					// Highlight bar by decreasing the opacity
					d3.select(this).style("opacity", 0.8);

					// Show tooltip
					tooltip.transition().style("opacity", 0.9);
					tooltip
						// Format number with commas
						// Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString
						.html(
							`${
								d.genres
							}<br/>Tracks: ${d.count.toLocaleString()}`
						)
						.style("left", `${event.pageX + 10}px`)
						.style("top", `${event.pageY - 28}px`);

					// Show this decade's annotation
					annotationBox
						.selectAll(".decade-annotation")
						.style("display", (d) =>
							d === decade ? "block" : "none"
						);
				})
				.on("mouseout", function (event, d) {
					// Restore bar opacity
					d3.select(this).style("opacity", 1);

					// Hide tooltip
					tooltip.transition().style("opacity", 0);

					// Keep the annotation showing the last hovered decade
				});
		});

	// X-axis
	const xAxis = svg
		.append("g")
		.attr("class", "axis axis-x")
		.attr("transform", `translate(0,${height - margin.bottom})`)
		.call(d3.axisBottom(fx).tickSizeOuter(0));

	// Add hover handlers to axis ticks to trigger annotations
	xAxis
		.selectAll(".tick")
		.style("cursor", "pointer")
		.on("mouseover", function (event, d) {
			// Show this decade's annotation
			annotationBox
				.selectAll(".decade-annotation")
				.style("display", (decade) =>
					decade === d ? "block" : "none"
				);
		});

	// X-axis label
	xAxis
		.append("text")
		.attr("class", "axis-label")
		.attr("x", width / 2)
		.attr("y", margin.bottom - 20)
		.attr("fill", "currentColor")
		.text("Decade");

	// Y-axis
	svg.append("g")
		.attr("class", "axis axis-y")
		.attr("transform", `translate(${margin.left},0)`)
		.call(d3.axisLeft(y).ticks(null, "s").tickSizeOuter(0));

	// Y-axis label
	svg.append("text")
		.attr("class", "axis-label")
		.attr("x", margin.left - 20)
		.attr("y", margin.top - 30) // Top of the axis
		.attr("fill", "currentColor")
		.text("Tracks");

	// Add title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", 20)
		.text("Top Genres by Decade");

	// Append to genre-bar-chart-container
	d3.select("#genre-bar-chart-container").node().appendChild(svg.node());
}

function createRadarChart(selectedDecades) {
	// Tutorial: https://yangdanny97.github.io/blog/2019/03/01/D3-Spider-Chart

	// Clear previous render
	d3.select("#audio-radar-chart").remove();

	// Filter data for selected decades that exist in audioData
	const filteredAudioData = audioData.filter((d) =>
		selectedDecades.includes(d.decade)
	);

	// Get container dimensions
	const container = d3.select("#audio-radar-chart-container").node();
	const margin = chartMargin;
	const width = container.getBoundingClientRect().width;
	const height = width;
	const radius = (width - margin.left - margin.right) / 2;

	// Create SVG
	const svg = d3
		.create("svg")
		.attr("id", "audio-radar-chart")
		.attr("width", width)
		.attr("height", height);

	const g = svg.append("g");

	// Scale and tick marks (tutorial style)
	const radialScale = d3.scaleLinear().domain([0, 1]).range([0, radius]);
	const ticks = [0.2, 0.4, 0.6, 0.8, 1];

	g.selectAll("circle")
		.data(ticks)
		.join("circle")
		.attr("cx", width / 2)
		.attr("cy", height / 2)
		.attr("r", (d) => radialScale(d))
		.attr("fill", "none")
		.attr("stroke", "#ccc");

	g.selectAll(".ticklabel")
		.data(ticks)
		.join("text")
		.attr("class", "ticklabel")
		.attr("x", width / 2 + 5)
		.attr("y", (d) => height / 2 - radialScale(d))
		.text((d) => d.toString())
		.attr("font-size", "0.9rem");

	// Convert polar coordinates to SVG coordinates
	// Ref: https://yangdanny97.github.io/blog/2019/03/01/D3-Spider-Chart#plotting-the-axes
	const angleToCoordinate = (angle, value) => {
		const x = Math.cos(angle) * radialScale(value);
		const y = Math.sin(angle) * radialScale(value);
		return {
			x: width / 2 + x,
			y: height / 2 - y,
		};
	};

	const featureData = features.map((feature, index) => {
		const angle = Math.PI / 2 + (2 * Math.PI * index) / features.length;
		return {
			name: feature,
			angle,
			line_coord: angleToCoordinate(angle, 1), // From center to edge
			label_coord: angleToCoordinate(angle, 1.15), // From center to edge + 15%
		};
	});

	// Draw axes
	g.selectAll("line")
		.data(featureData)
		.join("line")
		.attr("x1", width / 2)
		.attr("y1", height / 2)
		.attr("x2", (d) => d.line_coord.x)
		.attr("y2", (d) => d.line_coord.y)
		.attr("stroke", "#ccc")
		.attr("stroke-width", 1)
		.attr("stroke-opacity", 0.5);

	g.selectAll(".axislabel")
		.data(featureData)
		.join("text")
		.attr("class", "axislabel")
		.attr("x", (d) => d.label_coord.x)
		.attr("y", (d) => d.label_coord.y)
		.attr("text-anchor", "middle")
		.style("font-size", "0.9rem")
		.text((d) => d.name);

	// Helper to build path coordinates
	const radarLine = d3
		.line()
		.x((d) => d.x)
		.y((d) => d.y)
		// Since we normalise the aggrated values, the path may not be connected continuously, since then we use curveLinearClosed to fix it
		// Ref: https://observablehq.com/@trocin/spider-chart-playml-modified
		.curve(d3.curveLinearClosed);

	const getPathCoordinates = (dataPoint) => {
		const coordinates = [];
		for (let i = 0; i < features.length; i++) {
			const angle = Math.PI / 2 + (2 * Math.PI * i) / features.length;
			const featureName = features[i];
			coordinates.push(angleToCoordinate(angle, dataPoint[featureName]));
		}
		return coordinates;
	};

	// Show one radar at a time, default to first decade
	const defaultDecade = selectedDecades[0];

	// Draw radar for each decade
	filteredAudioData.forEach((decadeData) => {
		const coordinates = getPathCoordinates(decadeData);

		const radarGroup = g
			.append("g")
			.attr("class", `radar-group radar-${decadeData.decade}`)
			.style(
				"display",
				decadeData.decade === defaultDecade ? "block" : "none"
			);

		radarGroup
			.append("path")
			.datum(coordinates)
			.attr("d", radarLine)
			.attr("stroke-width", 3)
			.attr("fill", decadeColors[decadeData.decade])
			.attr("opacity", 0.5);
	});

	// Add title (preserve styling)
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", 20)
		.text(defaultDecade);

	// Append to audio-radar-chart-container
	d3.select("#audio-radar-chart-container").node().appendChild(svg.node());
}

function createLoudnessChart(selectedDecades) {
	// Clear previous render
	d3.select("#audio-loudness-chart").remove();

	// Calculate average loudness per decade
	// Ref: https://d3js.org/d3-array/group#rollup
	const loudnessByDecade = d3.rollup(
		audioData,
		(v) => d3.mean(v, (d) => d.loudness),
		(d) => d.decade
	);

	// Filter data for selected decades
	const loudnessData = selectedDecades.map((decade) => ({
		decade,
		avgLoudness: loudnessByDecade.get(decade),
	}));

	// Get container dimensions
	const container = d3.select("#audio-loudness-chart-container").node();
	const margin = chartMargin;
	const width = container.getBoundingClientRect().width;
	const height = width / 1.5;

	// Create scales
	const x = d3
		.scaleLinear()
		.domain(d3.extent(loudnessData, (d) => d.avgLoudness))
		.range([margin.left, width - margin.right - 10]); // -10px since some bars are too small that they are not visible

	const y = d3
		.scaleBand()
		.domain(loudnessData.map((d) => d.decade))
		.range([margin.top, height - margin.bottom]);

	// Create SVG
	const svg = d3
		.create("svg")
		.attr("id", "audio-loudness-chart")
		.attr("width", width)
		.attr("height", height);

	// Draw reversed bars
	svg.selectAll(".bar")
		.data(loudnessData)
		.join("rect")
		.attr("class", "bar")
		.attr("x", (d) => x(d.avgLoudness))
		.attr("y", (d) => y(d.decade))
		.attr("width", (d) => width - margin.right - x(d.avgLoudness))
		.attr("height", y.bandwidth())
		.attr("fill", (d) => decadeColors[d.decade])
		.attr("stroke", "#fff")
		.on("mouseover", function (event, d) {
			// Highlight bar by decreasing the opacity
			d3.select(this).style("opacity", 0.8);

			// Highlight corresponding decade in radar chart
			highlightDecadeInRadar(d.decade);
		})
		.on("mouseout", function (event, d) {
			// Restore bar opacity
			d3.select(this).style("opacity", 1);
		});

	// Add decade labels on the left
	svg.selectAll(".decade-label")
		.data(loudnessData)
		.join("text")
		.attr("class", "decade-label")
		.attr("x", margin.left - 10)
		.attr("y", (d) => y(d.decade) + y.bandwidth() / 2)
		.attr("text-anchor", "end")
		.style("font-size", "0.875rem")
		.text((d) => d.decade);

	// Add loudness values on the right
	svg.selectAll(".value-label")
		.data(loudnessData)
		.join("text")
		.attr("class", "value-label")
		.attr("x", width - margin.right + 10)
		.attr("y", (d) => y(d.decade) + y.bandwidth() / 2)
		.attr("text-anchor", "start")
		.text((d) => d.avgLoudness.toFixed(2)); // Ref: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed

	// Add x-axis label
	// Make the axis label a title of the graph
	svg.append("text")
		.attr("x", width / 2)
		.attr("y", margin.top - 20)
		.attr("text-anchor", "middle")
		.style("font-weight", "700")
		.text("Loudness (dB)");

	// Append to container
	d3.select("#audio-loudness-chart-container").node().appendChild(svg.node());
}

function createTempoChart(selectedDecades) {
	// Clear previous render
	d3.select("#audio-tempo-chart").remove();

	// Calculate average tempo per decade
	// Ref: https://d3js.org/d3-array/group#rollup
	const tempoByDecade = d3.rollup(
		audioData,
		(v) => d3.mean(v, (d) => d.tempo),
		(d) => d.decade
	);

	// Filter data for selected decades
	const data = selectedDecades.map((decade) => ({
		decade,
		avgTempo: tempoByDecade.get(decade),
	}));

	// Get container dimensions
	const container = d3.select("#audio-tempo-chart-container").node();
	const margin = chartMargin;
	const width = container.getBoundingClientRect().width;
	const height = 600;

	const x = d3
		.scaleBand()
		.domain(selectedDecades)
		.rangeRound([margin.left, width - margin.right])
		.paddingInner(0.1);

	const y = d3
		.scaleLinear()
		.domain([0, d3.max(data, (d) => d.avgTempo)])
		.range([height - margin.bottom, margin.top]);

	// Create SVG
	const svg = d3
		.create("svg")
		.attr("id", "audio-tempo-chart")
		.attr("width", width)
		.attr("height", height);

	// Add bars
	svg.append("g")
		.selectAll("rect")
		.data(data)
		.join("rect")
		.attr("x", (d) => x(d.decade))
		.attr("y", (d) => y(d.avgTempo))
		.attr("width", x.bandwidth())
		.attr("height", (d) => y(0) - y(d.avgTempo))
		.attr("fill", (d) => decadeColors[d.decade])
		.attr("stroke", "#fff")
		.on("mouseover", function (event, d) {
			// Highlight bar by decreasing the opacity
			d3.select(this).style("opacity", 0.8);

			// Highlight corresponding decade in radar chart
			highlightDecadeInRadar(d.decade);
		})
		.on("mouseout", function (event, d) {
			// Restore bar opacity
			d3.select(this).style("opacity", 1);
		});

	// Add labels
	svg.append("g")
		.selectAll("text")
		.data(data)
		.join("text")
		.attr("x", (d) => x(d.decade) + x.bandwidth() / 2)
		.attr("y", (d) => y(d.avgTempo) - 10)
		.attr("text-anchor", "middle")
		.attr("fill", "currentColor")
		.text((d) => d.avgTempo.toFixed(1));

	// X-axis
	svg.append("g")
		.attr("class", "axis axis-x")
		.attr("transform", `translate(0,${height - margin.bottom})`)
		.call(d3.axisBottom(x).tickSizeOuter(0))
		.append("text")
		.attr("class", "axis-label")
		.attr("x", width / 2)
		.attr("y", margin.bottom - 20)
		.attr("fill", "currentColor")
		.text("Decade");

	// Y-axis
	svg.append("g")
		.attr("class", "axis axis-y")
		.attr("transform", `translate(${margin.left},0)`)
		.call(d3.axisLeft(y).ticks(null, "s").tickSizeOuter(0));

	// Y-axis label
	svg.append("text")
		.attr("class", "axis-label")
		.attr("x", margin.left - 20)
		.attr("y", margin.top - 30)
		.attr("fill", "currentColor")
		.text("Value");

	// Title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", margin.top - 60)
		.text("Tempo (BPM)");

	// Append to container
	d3.select("#audio-tempo-chart-container").node().appendChild(svg.node());
}

// Helper function to show only a specific decade in the radar chart
function highlightDecadeInRadar(decade) {
	const svg = d3.select("#audio-radar-chart");

	const g = svg.select("g");

	// Hide all radar groups (decade data)
	g.selectAll(".radar-group").style("display", "none");

	// Show only the selected decade's radar group
	g.selectAll(`.radar-${decade}`).style("display", "block");

	// Update title
	svg.select("text.chart-title").text(decade);
}

function createAudioLineChart(selectedDecades) {
	// Ref: https://observablehq.com/@d3/multi-line-chart/2

	// Clear previous render
	d3.select("#audio-line-chart").remove();

	const filteredData = audioData.filter((d) =>
		selectedDecades.includes(d.decade)
	);

	// Get container dimensions
	const container = d3.select("#audio-line-chart-container").node();
	const width = container.getBoundingClientRect().width;
	const height = 600;
	const margin = chartMargin;

	// Create SVG
	const svg = d3
		.create("svg")
		.attr("id", "audio-line-chart")
		.attr("width", width)
		.attr("height", height);

	const xScale = d3
		.scaleBand()
		.domain(filteredData.map((d) => d.decade))
		.range([margin.left, width - margin.right]);

	const yScale = d3
		.scaleLinear()
		.domain([0, 1])
		.range([height - margin.bottom, margin.top]);

	const color = d3
		.scaleOrdinal()
		.domain(features)
		.range(features.map((feature) => featureColors[feature]));

	const line = d3
		.line()
		.x((d) => xScale(d.decade) + xScale.bandwidth() / 2)
		.y((d) => yScale(d.value))
		.curve(d3.curveMonotoneX);

	const points = [];
	const featureSeries = features.map((feature) => {
		const values = filteredData.map((d) => {
			const x = xScale(d.decade) + xScale.bandwidth() / 2;
			const y = yScale(d[feature]);
			points.push([x, y, feature, d.decade, d[feature]]);
			return {
				decade: d.decade,
				value: d[feature],
			};
		});
		return { feature, values };
	});

	// Draw the lines
	const path = svg
		.append("g")
		.attr("fill", "none")
		.attr("stroke-width", 3)
		.attr("stroke-linejoin", "round") // For smoothing the corner of the line
		.attr("stroke-linecap", "round") // For smoothing the end of the line
		.selectAll("path")
		.data(featureSeries)
		.join("path")
		.attr("class", (d) => `line-${d.feature}`)
		.attr("stroke", (d) => color(d.feature))
		.attr("d", (d) => line(d.values));

	// Add an invisible layer for the interactive tip
	const dot = svg.append("g").attr("display", "none");

	dot.append("circle").attr("r", 3);
	dot.append("text").attr("text-anchor", "middle").attr("y", -20);

	/* ========== Graph interaction ========== */
	svg.on("pointerenter", pointerentered)
		.on("pointermove", pointermoved)
		.on("pointerleave", pointerleft)
		.on("touchstart", (event) => event.preventDefault());

	// Helper function to toggle annotations on hovering a specific feature line
	function toggleAnnotations(activeFeature) {
		// Show the annotation of hovered feature and hide the rest
		Object.entries(annotations).forEach(([feature, annotation]) => {
			const show = feature === activeFeature;
			if (annotation.line)
				annotation.line.style("display", show ? null : "none");
			if (annotation.text)
				annotation.text.style("display", show ? null : "none");
		});
	}

	// Pointer event handlers
	// Ref: https://observablehq.com/@d3/multi-line-chart/2
	// When the pointer moves, find the closest point, update the interactive tip
	function pointermoved(event) {
		const [xm, ym] = d3.pointer(event, svg.node());
		const i = d3.leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym));
		const [x, y, feature, decade, value] = points[i];

		// Highlight the corresponding line
		path.style("stroke", (d) => (d.feature === feature ? null : "#ddd"))
			.filter((d) => d.feature === feature)
			.raise();

		dot.attr("transform", `translate(${x},${y})`)
			.select("text")
			.text(`${feature}: ${value.toFixed(3)}`);

		// Toggle annotations when hovering the line
		toggleAnnotations(feature);
	}

	function pointerentered() {
		path.style("stroke", "#ddd");
		dot.attr("display", null);
	}

	function pointerleft() {
		path.style("stroke", (d) => color(d.feature));
		dot.attr("display", "none");

		// Hide annotations when leaving
		toggleAnnotations(null);
	}

	/* ========== Axes ========== */
	// X-axis
	svg.append("g")
		.attr("class", "axis axis-x")
		.attr("transform", `translate(0,${height - margin.bottom})`)
		.call(d3.axisBottom(xScale).tickSizeOuter(0))
		.append("text")
		.attr("class", "axis-label")
		.attr("x", width / 2)
		.attr("y", margin.bottom - 20)
		.attr("fill", "currentColor")
		.text("Decade");

	// Y-axis
	svg.append("g")
		.attr("class", "axis axis-y")
		.attr("transform", `translate(${margin.left},0)`)
		.call(d3.axisLeft(yScale).ticks(5));

	// Y-axis label
	svg.append("text")
		.attr("class", "axis-label")
		.attr("x", margin.left - 20)
		.attr("y", margin.top - 30)
		.attr("fill", "currentColor")
		.text("Value");

	// Add title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", 30)
		.text("Audio Features Over Decades");

	/* ========== Legend ========== */
	// Ref: https://d3-graph-gallery.com/graph/custom_legend.html
	// Legend position: Top right corner
	const legendX = width - margin.right - 200;
	const legendY = margin.top - 50;

	// Add one item for each audio feature
	features.forEach((feature, i) => {
		// Add items add stack, next item will be 20px below the previous one
		const y = legendY + i * 20;
		// Add line
		// Ref: https://stackoverflow.com/questions/59167945/draw-line-between-two-points-in-javascript
		svg.append("line")
			.attr("x1", legendX)
			.attr("y1", y)
			.attr("x2", legendX + 20) // Draw line 20px
			.attr("y2", y)
			.attr("stroke", color(feature))
			.attr("stroke-width", 2);
		// Add text
		svg.append("text")
			.attr("x", legendX + 25) // Add text next to the drawn line
			.attr("y", y)
			.attr("alignment-baseline", "middle")
			.text(feature);
	});

	/* ========== Annotation ========== */
	const annotations = {};

	// Helper function to get exact point on path at a specific x coordinate
	// Ref: https://observablehq.com/@oluckyman/point-on-a-path-detection
	function getPointOnPath(pathElement, targetX) {
		const array = d3.range(pathElement.getTotalLength());
		const bisect = d3.bisector((d) => pathElement.getPointAtLength(d).x);
		const len = bisect.right(array, targetX);
		return pathElement.getPointAtLength(len);
	}

	// Add annotation for a feature at a specific decade
	function addAnnotation(featureName, decade, message) {
		const featureData = featureSeries.find(
			(d) => d.feature === featureName
		);
		const featurePath = path
			.filter((d) => d.feature === featureName)
			.node();
		const point = featureData.values.find((d) => d.decade === decade);
		const targetX = xScale(point.decade) + xScale.bandwidth() / 2;
		const { x, y } = getPointOnPath(featurePath, targetX);

		// Determine if annotation goes up or down based on position
		// Up if in lower half of chart, down if in upper half
		const lineLength = 40;
		const drawUp = y > (height - margin.bottom + margin.top) / 2;

		// Calculate annotation line end position to add text
		const lineEndY = drawUp ? y - lineLength : y + lineLength;

		// Annotation line, a line drawn up/down to the text
		const annotationLine = svg
			.append("line")
			.attr("x1", x)
			.attr("y1", y)
			.attr("x2", x)
			.attr("y2", lineEndY)
			.attr("stroke", color(featureName))
			.attr("stroke-width", 1.5)
			.style("display", "none"); // Only show when hovering

		// Annotation text
		const annotationText = svg
			.append("g")
			.attr("transform", `translate(${x}, ${lineEndY})`)
			.style("display", "none");

		// Create a div to store the text
		annotationText
			.append("foreignObject")
			.attr("x", -100)
			.attr("y", drawUp ? -40 : -10)
			.attr("width", 200)
			.attr("height", 200)
			.append("xhtml:div")
			.style("text-align", "center")
			.html(message);

		annotations[featureName] = {
			line: annotationLine,
			text: annotationText,
		};
	}

	// Add custom annotations, one for each feature
	addAnnotation(
		"danceability",
		"2010s",
		"Danceability increases as we enter a new decade"
	);
	addAnnotation(
		"energy",
		"2000s",
		"Rise of electronic music and music concerts changed the way artists perform"
	);
	addAnnotation(
		"acousticness",
		"1970s",
		"Invention of synthesizers changed the way artists create music"
	);
	addAnnotation(
		"valence",
		"2000s",
		"Despite all the changes, music always stays happy and joyful"
	);
	addAnnotation(
		"liveness",
		"1950s",
		"Music changed from live recordings to studio production"
	);
	addAnnotation("instrumentalness", "1950s", "Rise of  rock & roll");
	addAnnotation(
		"speechiness",
		"1990s",
		"Hip-hop and rap bring spoken word into mainstream music"
	);

	d3.select("#audio-line-chart-container").node().appendChild(svg.node());
}
