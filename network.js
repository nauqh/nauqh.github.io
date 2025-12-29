let decadeArtists = null;
let nodes = null;
let edges = null;
let simulation;

// Playlist IDs for each decade
const decadePlaylists = {
	"1920s": "4ZgpGrQr1MXOCMr90bwd3h",
	"1930s": "4HHjdM6zQSnEs29HHeYO03",
	"1940s": "5xhz85DZgljkhw6hQV05gt",
	"1950s": "00OCAGNhdjGijo6wJS7pEV",
	"1960s": "4cxMyVhbnYE5A7HwWgMmuf",
	"1970s": "47PjKz4Lufp2jcmws0Mlk1",
	"1980s": "7wLsirp3vJxZxqJXKBqtUQ",
	"1990s": "37i9dQZF1DXbTxeAdrVG2l",
	"2000s": "37i9dQZF1DX4o1oenSJRJd",
	"2010s": "37i9dQZF1DX5Ejj0EkURtP",
	"2020s": "37i9dQZF1DX2M1RktxUUHG",
};

const decades = Object.keys(decadePlaylists);

// Helper function to build tooltip from node data
function node2Tooltip(d) {
	return (
		`<strong>${d.name}</strong><br/>` +
		`Followers: ${d.followers.toLocaleString()}<br/>` +
		`Popularity: ${d.popularity}<br/>` +
		`Number of collaborators: ${d.degree}`
	);
}

// Helper function to update network playlist iframe
function updateNetworkPlaylist(decade) {
	const playlistId = decadePlaylists[decade];

	const iframe = d3.select("#network-playlist-container iframe");

	// Update the iframe source by playlist ID
	iframe.attr(
		"src",
		`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`
	);
}

// Helper function to get selected decade from slider
function getSelectedDecade() {
	const slider = document.getElementById("decade-slider");
	return decades[parseInt(slider.value)];
}

Promise.all([
	d3.json("data/decade_artists.json"),
	d3.csv(
		"https://drive.google.com/uc?export=download&id=11ClfBChoTTQBCY9ZklcRWe0LhvjfZqmR",
		d3.autoType
	),
	d3.csv(
		"https://drive.google.com/uc?export=download&id=1Z5CO5gbOemvegBBBamU358K6ULQR5Wyc",
		d3.autoType
	),
]).then(([decadeArtistsData, nodesData, edgesData]) => {
	decadeArtists = decadeArtistsData;
	nodes = nodesData;
	edges = edgesData;

	// Set the default decade to 1950s
	createNetworkChart("1950s");
	updateNetworkPlaylist("1950s");
	createDecadeSlider();

	window.addEventListener("resize", () => {
		createNetworkChart(getSelectedDecade());
	});
});

function createDecadeSlider() {
	const slider = document.getElementById("decade-slider");
	const valueDisplay = document.getElementById("decade-value");

	slider.addEventListener("input", () => {
		const selectedDecade = getSelectedDecade();
		valueDisplay.textContent = selectedDecade;
		createNetworkChart(selectedDecade);
		updateNetworkPlaylist(selectedDecade);
	});
}

function createNetworkChart(selectedDecade) {
	// Ref: PE3 submission code
	// Ref: https://observablehq.com/@d3/disjoint-force-directed-graph/2

	// Clear previous render
	d3.select("#artist-network-chart").remove();

	if (simulation) {
		simulation.stop();
	}

	const selectedArtistIds = new Set(decadeArtists[selectedDecade]);

	const filteredNodes = nodes.filter((node) =>
		selectedArtistIds.has(node.spotify_id)
	);

	const nodeIdMap = new Map();
	filteredNodes.forEach((node, i) => {
		nodeIdMap.set(node.spotify_id, i);
	});

	const filteredEdges = edges
		.filter((edge) => nodeIdMap.has(edge.id_0) && nodeIdMap.has(edge.id_1))
		.map((edge) => ({
			source: nodeIdMap.get(edge.id_0),
			target: nodeIdMap.get(edge.id_1),
		}));

	// Calculate node degrees
	const nodeDegrees = new Map();
	filteredNodes.forEach((_, i) => nodeDegrees.set(i, 0));
	filteredEdges.forEach((edge) => {
		nodeDegrees.set(edge.source, nodeDegrees.get(edge.source) + 1);
		nodeDegrees.set(edge.target, nodeDegrees.get(edge.target) + 1);
	});
	filteredNodes.forEach((node, i) => {
		node.degree = nodeDegrees.get(i);
	});

	// Get container dimensions
	const container = d3.select("#artist-network-chart-container").node();
	const wdith = container.getBoundingClientRect().width;
	const height = wdith * 0.75;

	const tooltip = d3.select(".tooltip");

	const svg = d3
		.create("svg")
		.attr("id", "artist-network-chart")
		.attr("width", wdith)
		.attr("height", height);

	const zoomGroup = svg.append("g");

	const zoom = d3
		.zoom()
		.scaleExtent([0.5, 5]) // Set zoom max 5x and min 0.5x
		.on("zoom", (event) => {
			zoomGroup.attr("transform", event.transform);
		});
	svg.call(zoom);

	const defaultRadius = 4;

	// Scale the node size by the number of followers
	const followersScale = d3
		.scaleSqrt()
		.domain([0, d3.max(filteredNodes, (d) => d.followers)])
		.range([defaultRadius * 0.5, defaultRadius * 3]);

	// Create the simulation
	simulation = d3
		.forceSimulation(filteredNodes)
		.force(
			"link",
			d3
				.forceLink(filteredEdges)
				.id((d, i) => i)
				.distance(100)
		)
		.force("charge", d3.forceManyBody().strength(-250))
		// Ref: https://observablehq.com/@d3/disjoint-force-directed-graph/2
		.force("x", d3.forceX(wdith / 2))
		.force("y", d3.forceY(height / 2));

	// Create the links
	const link = zoomGroup
		.append("g")
		.attr("class", "links")
		.selectAll("line")
		.data(filteredEdges)
		.join("line")
		.attr("class", "link");

	// Create the nodes
	const node = zoomGroup
		.append("g")
		.attr("class", "nodes")
		.selectAll("circle")
		.data(filteredNodes)
		.join("circle")
		.attr("class", "node")
		.attr("r", (d) => followersScale(d.followers))
		.attr("fill", "#33a8c7")
		.call(drag(simulation));

	// Create the labels
	const labels = zoomGroup
		.append("g")
		.attr("class", "labels")
		.selectAll("text")
		.data(filteredNodes)
		.join("text")
		.attr("class", "label")
		.attr("text-anchor", "middle")
		.attr("dy", (d) => -followersScale(d.followers) - 5)
		.style("font-size", "10px")
		.text((d) => d.name);

	// Tooltip handlers
	node.on("mouseover", (event, d) => {
		tooltip.transition().style("opacity", 0.9);
		tooltip
			.html(node2Tooltip(d))
			.style("left", `${event.pageX + 10}px`)
			.style("top", `${event.pageY - 28}px`);
	}).on("mouseout", () => {
		tooltip.transition().style("opacity", 0);
	});

	// Highlighting handlers
	// Ref: PE3 submission code
	node.on("mouseover.highlight", (event, d) => {
		// Dim all nodes and edges
		node.style("opacity", 0.1);
		link.style("opacity", 0.1);

		// Highlight current node
		d3.select(event.currentTarget).style("opacity", 1);

		// Highlight connected edges and neighbor nodes
		link.filter((l) => l.source === d || l.target === d)
			.style("opacity", 1)
			.style("stroke", "#000")
			.style("stroke-width", 2)
			.each((l) => {
				const neighbor = l.source === d ? l.target : l.source;
				node.filter((n) => n === neighbor).style("opacity", 1);
			});
	}).on("mouseout.highlight", () => {
		// Remove all highlight styling (set to null to remove inline styles)
		node.style("opacity", null);
		link.style("opacity", null)
			.style("stroke", null)
			.style("stroke-width", null);
	});

	simulation.on("tick", () => {
		link.attr("x1", (d) => d.source.x)
			.attr("y1", (d) => d.source.y)
			.attr("x2", (d) => d.target.x)
			.attr("y2", (d) => d.target.y);

		node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

		labels.attr("x", (d) => d.x).attr("y", (d) => d.y);
	});

	d3.select("#artist-network-chart-container").node().appendChild(svg.node());
}

// Ref: PE3 submission code
function drag(simulation) {
	return d3
		.drag()
		.on("start", (event, d) => {
			d.fx = d.x;
			d.fy = d.y;
		})
		.on("drag", (event, d) => {
			d.fx = event.x;
			d.fy = event.y;
			simulation.alpha(0.1).restart();
		})
		.on("end", (event, d) => {
			d.fx = d.x;
			d.fy = d.y;
			simulation.alpha(0);
		});
}
