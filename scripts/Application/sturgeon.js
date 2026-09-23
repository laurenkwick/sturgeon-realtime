// Setup dimensions (Match the PNG aspect ratio)
//const width = 1280;
//const height = 810;
const width = 1920;
const height = 1080;

// Define the geogrpahic bounds of the PNG (decimal degrees)
const imageBounds = [
    //[-77.5994421, 37.6184908], // [Long, Lat] of top-left
    //[-76.5776466, 37.1045584] // [Long, Lat] of bottom-right
    [-77.6258622, 37.6274012],
    [-76.3298167,  37.0480142]
];

// Initialize the SVG and Projection
const svg = d3.select("#map-container")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", "auto");

const projection = d3.geoMercator()
    .fitExtent([[0, 0], [width, height]], {
        type: "MultiPoint",
        coordinates: imageBounds
    });

// Create a scale for circle size
const radiusScale = d3.scaleSqrt().range([1,50]);

// Initialize tooltip
var tooltip = d3.select("#tooltip");

// Load the CSV

var hubConverter = function(d) {
    return {
        Hub_ID: d.Hub_ID,
        Sturgeon_Count: parseFloat(d.Sturgeon_Count),
        Hub_Latitude: parseFloat(d.Hub_Latitude),
        Hub_Longitude: parseFloat(d.Hub_Longitude)
    };
};

var detailConverter = function(d) {
    return {
        Sturgeon_ID: d.Sturgeon_ID,
        Sturgeon_Name: d.Sturgeon_Name,
        Sex: d.Sex,
        Fork_Length: d.Fork_Length,
        Total_Length: d.Total_Length,
        Date_Tagged: d.Date_Tagged,
        Location_Tagged: d.Location_Tagged,
        Season: d.Season
    }
};

var movementConverter = function(d) {
    return {
        Sturgeon_ID: d.Sturgeon_ID,
        Date_Time_Rounded: d.Date_Time_Rounded,
        Hub_ID: d.Hub_ID,
        Arrival_Time: d.Arrival_Time,
        Distinct_Hubs: d.Distinct_Hubs,
        Tie_Breaker: d.Tie_Breaker
    }
}

d3.queue()
    .defer(d3.csv, "../../data/Hub_Summary.csv", hubConverter)
    .defer(d3.csv, "../../data/Sturgeon_Details.csv", detailConverter)
    .defer(d3.csv, "../../data/Sturgeon_Movement.csv", movementConverter)
    .await(function(error, hubData, detailData, movementData) {

        if (error) throw error;

        radiusScale.domain([0, d3.max(hubData, d => d.Sturgeon_Count)]);
        sexColorScale = d3.scaleOrdinal()
            .domain(["Male", "Female", "Unknown"])
            .range(["#88B5BD", "#b0413e", "#5F5F5F"]);

        sexStrokeColorScale = d3.scaleOrdinal()
            .domain(["Male", "Female", "Unknown"])
            .range(["#516a6e", "#58211f", "#1f1e1e"]);

        // Draw the basemap image first
        svg.append("image")
            .attr("xlink:href", "../../data/Newspaper_MinimalText_20260921_V06.png")
            .attr("width", width)
            .attr("height", height)
            .on("click", function() { 
                svg.selectAll(".hub")
                    .transition()
                    .duration(500)
                    .attr("r", d=> radiusScale(d.Sturgeon_Count))
                    //.attr("fill", "#BB9F06") 
                    .attr("stroke", "#BB9F06")
                    .attr("stroke-width", 2)
                    .style("opacity", 0.7)
                    .attr("pointer-events", "all");
                svg.selectAll(".sturgeon-detail").remove();
                svg.selectAll(".pings").remove();

                graphic.removeClass('in-singular').addClass('in-cumulative');
            });
        
        // Create Sturgeon List
        var sturgeonList = detailData.map((d) => [d.Sturgeon_ID, d.Sturgeon_Name]);
        
        console.log(sturgeonList);

        d3.select("#selectSturgeon")
            .selectAll('option')
            .data(sturgeonList)
            .enter()
            .append('option')
            .text(function (d) {return d[1]; })
            .attr("value", function (d) { return d[0]; });

        d3.select("#selectSturgeon").on("change", function(d) {
            var selectedOption = d3.select(this).property("value")
            var selectedSturgeonDetail = detailData.filter(obs => obs.Sturgeon_ID === selectedOption)[0];
            updateSidebar(selectedSturgeonDetail);
        });

        var graphic = $('#the-graphic');

        drawHubs();

        function singleAnimation(d) {
            
            graphic.removeClass('in-cumulative').addClass('in-singular');

            // Filter dataset based on selected sturgeon ID
            const timelapseData = movementData.filter(obs => obs.Sturgeon_ID === d.Sturgeon_ID);

            // Join filtered data to hub data, so that each observation is associated with the Hub's lat/long data
            const timelapseWithCoords = timelapseData.map(function(e) {
                const hub = hubData.find(h => h.Hub_ID === e.Hub_ID) || {};
                e.Date_Time_Rounded = new Date(e.Date_Time_Rounded); // update from string to DateTime 
                return { ...e, ...hub };
            }).sort((a, b) => new Date(a.Date) - new Date(b.date));

            // Prepare map for timelapse animation
            svg.selectAll(".pings").remove();
            svg.selectAll(".sturgeon-detail").remove(); // remove sturgeon-detail rings for a clean animation
            svg.selectAll(".hub").transition()
                .duration(100)
                .attr("r", 6)
                .style("fill", "#BB9F06") // remove old hubs 
                .attr("stroke", "#BB9F06")
                .attr("opacity", 0.7);

            // Styling Text Varialbe
            const textX = 670; // x position
            const textY = 180; // y position

            // Date Formatting for Time Series
            const monthList = ["Jan.","Feb.","Mar.","Apr.","May","Jun.","Jul.","Aug.","Sep.","Oct.","Nov.","Dec."];
            const singularDateline = $('.singular-mode .dateline-date');
            const firstTime = timelapseWithCoords[0].Date_Time_Rounded;
            const dayOfMonth = firstTime.getDate();
            const month = monthList[firstTime.getMonth()];
            const year = firstTime.getFullYear();
        
            const dateString = month + " " + dayOfMonth + ", " + year;
            singularDateline.text(dateString);

            // Styling Map Animation
            const pointerFillColor = "#b0413e";
            const pointerStrokeColor = "#b0413e";
            const pointerFillOpacity = .5
            const pointerStrokeWidth = 5
            
            // Initialize the traveler variables - setting starting style characteristics and first lat/long location. 
            // It's possible this is null in the beginning, if a ping was not recognized at the start of our time series.
            
            // Container for map pings
            const pingGroup = svg.append("g").attr("class", "pings");

            // Keep track of cumulative time to schedule pings independently
            let cumulativeDelay = 0;

            timelapseWithCoords.forEach((pos, index) => {

                const hasCoords = pos.Hub_Longitude !== null && pos.Hub_Latitude !== null;

                // Base timings for this step
                let expandDuration = 500;
                let fadeDuration = 1800; // Increase fade time so it stays visible while next pings spawn
                let stepInterval = 1300;  // How long to wait BEFORE starting the next ping

                if (pos.Distinct_Hubs > 1) {
                    // Dive timing of ping interval if multiple receivers visited in one day
                    stepInterval /= pos.Distinct_Hubs;
                }

                // Format time
                const printTime = pos.Date_Time_Rounded;
                const printDateString = `${monthList[printTime.getMonth()]} ${printTime.getDate()} ${printTime.getFullYear()}`;

                d3.timeout(() => {
                    singularDateline.text(printDateString);
                }, cumulativeDelay);

                if (hasCoords) {
                    const [x, y] = projection([pos.Hub_Longitude, pos.Hub_Latitude]);

                    // 1. APPEND A NEW CIRCLE FOR EACH PING
                    pingGroup.append("circle")
                        .attr("class", "ping")
                        .attr("cx", x)
                        .attr("cy", y)
                        .attr("r", 5)
                        .style("fill", pointerFillColor)
                        .style("fill-opacity", pointerFillOpacity)
                        .style("stroke", pointerStrokeColor)
                        .style("stroke-width", pointerStrokeWidth)
                        .style("opacity", 0)
                        
                        // Phase 1: Delay until its turn, then expand & reveal
                        .transition()
                        .delay(cumulativeDelay)
                        .duration(expandDuration)
                        .ease(d3.easeCircleOut)
                        .style("opacity", 1)
                        .attr("r", 35)

                        // Phase 2: Fade out slowly while next circles are already triggering
                        .transition()
                        .duration(fadeDuration)
                        .ease(d3.easeLinear)
                        .style("opacity", 0)
                        .attr("r", 45) // Optional: continue slightly expanding as it fades

                        // Clean up node after animation finishes to prevent DOM bloat
                        .remove();
                }

                cumulativeDelay += stepInterval;
            });

            // Bring up hub visual after animation is finished
            svg.selectAll(".hub")
                    .transition()
                    .delay(cumulativeDelay)
                    .duration(1000)
                    .attr("r", d=> radiusScale(d.Sturgeon_Count))
                    //.attr("fill", "#BB9F06") 
                    .attr("stroke", "#BB9F06")
                    .attr("stroke-width", 2)
                    .style("opacity", 0.7)
                    .attr("pointer-events", "all");

            // Display cumulative text: https://stackoverflow.com/questions/15448344/can-i-put-delay500-before-an-addclass
            setTimeout(function(){
                graphic.removeClass('in-singular').addClass('in-cumulative');
            }, cumulativeDelay);

        }

        // Function to update the sidebar when an individual sturgeon is selected
        function updateSidebar(detailID) {
            const cardContent = d3.select("#card-content");

            cardContent.html(`
                <div id="card-content">
                    <h2> Sturgeon Details</h2>
                    <p>
                        <strong>${detailID.Sturgeon_Name}</strong> is a <strong>${detailID.Sex}</strong> sturgeon that was captured and tagged on
                       <strong>${detailID.Date_Tagged}</strong> in the <strong>${detailID.Location_Tagged}</strong>.
                    </p>
                    <p>
                        <strong>${detailID.Sturgeon_Name}</strong> spawns in the <strong>${detailID.Season}</strong>.
                    </p>
                    <ul>
                        <li>Fork Length: ${detailID.Fork_Length} meters</li>
                        <li>Total Length: ${detailID.Total_Length} meters</li>
                    </ul>
                    <button id="play-button">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Play ${detailID.Sturgeon_Name}'s Timelapse
                    </button>
                </div>
            `);

            d3.select("#play-button").on("click", function() {
                singleAnimation(detailID);
            })
        };
        function handleHubClick(d, i, nodes) {
            d3.event.stopPropagation();

            const clickedHubName = d.Hub_ID;
            const hubX = projection([d.Hub_Longitude, d.Hub_Latitude])[0];
            const hubY = projection([d.Hub_Longitude, d.Hub_Latitude])[1];

            // Function for ring burst appearance
            const radiusCount = d.Sturgeon_Count;
            const ringIndexRadius = Math.floor(radiusCount/10);
            const radiusRadius = 40 + (ringIndexRadius * 25) + 20;
            //const angle = (posOnRing / 10) * (2 * Math.PI);
            //return hubX + radius * Math.cos(angle);

            d3.selectAll(".hub")
                .transition()
                .duration(500)
                .style("opacity", 0.7)
                .attr("r", 6);
            
            // Increase size and opacity for selected hub
            d3.select(nodes[i])
                .raise()
                .transition().duration(500)
                .style("stroke-width", 1)
                .style("opacity", 0.97)
                .attr("r", radiusRadius)
                .attr("pointer-events", "none");

            svg.selectAll(".sturgeon-detail").remove();


            // Filter details data
            const allObservations = movementData.filter(obs => obs.Hub_ID === clickedHubName);
            const uniqueMap = new Map(allObservations.map(obs => [obs.Sturgeon_ID, obs]));
            const matches = Array.from(uniqueMap.values());
            const tempDetails = detailData;
            let merged = tempDetails.filter(e => matches.some(f => f.Sturgeon_ID == e.Sturgeon_ID));
            merged = _.merge(merged, matches);


            const burstGroup = svg.append("g").attr("class", "burst-layer");


            // Clear and previous detail points
            burstGroup.selectAll(".sturgeon-detail").remove();


            // Create the burst
            const detailCircles = burstGroup.selectAll(".sturgeon-detail")
                .data(merged)
                .enter()
                .append("circle")
                .attr("class", "sturgeon-detail")
                .attr("cx", hubX) // Start at Hub
                .attr("cy", hubY)
                .attr("r", 0)
                .attr("fill", d => sexColorScale(d.Sex))
                .attr("stroke", d => sexStrokeColorScale(d.Sex))
                .style("stroke-width", 1)
                .style("fill-opacity", 0.90)
                .on("mouseover", function(d) {
                    tooltip.style("opacity", 1)
                        .html("<strong>" + d.Sturgeon_Name + "</strong><br/>Sex: " + d.Sex);
                    })
                .on("mousemove", function(d) {
                    tooltip.style("left", (d3.event.pageX + 15) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                    })
                .on("mouseout", function() {
                    tooltip.style("opacity", 0)
                    })
                .on("click", handleDetailClick)
                .transition()
                .duration(800)
                .delay((d, i) => i * 30)
                .attr("cx", function(d, i) {
                    // Function for ring burst appearance
                    const ringIndex = Math.floor(i/10);
                    const posOnRing = i % 10;
                    const radius = 40 + (ringIndex * 25);
                    const angle = (posOnRing / 10) * (2 * Math.PI);
                    return hubX + radius * Math.cos(angle);
                })
                .attr("cy", function(d, i) {
                    // Function for ring burst appearance
                    const ringIndex = Math.floor(i/10);
                    const posOnRing = i % 10;
                    const radius = 40 + (ringIndex * 25);
                    const angle = (posOnRing / 10) * (2 * Math.PI);
                    return hubY + radius * Math.sin(angle);
                })
                .attr("r", 10);



        }
        // Function to style circle when indivdual sturgeon is selected
        function handleDetailClick(d, i, nodes) {
            // 'd' is the detail data
            d3.event.stopPropagation();

            // Update Sidebar - calls function to add sturgeon details to sidebar
            updateSidebar(d);

            // Update fade all other sturgeon circles
            d3.selectAll(".sturgeon-detail")
                .transition().duration(500)
                .style("opacity", 0.6)
                .attr("r", 6);

            // Increase size and opacity for selected sturgeon.
            d3.select(nodes[i])
                .raise()
                .transition().duration(500)
                .style("opacity", 1)
                .attr("r", 15);
        };

        function drawHubs() {
            graphic.removeClass('in-singular').addClass('in-cumulative');

            // Date Formatting for Time Series
            const cumulativeDateline = $('.cumulative-mode .dateline-date');
            const dateRange = movementData.map(a => a.Date_Time_Rounded);
            const earliestDate = dateRange.reduce((acc, currentDate) => {
                return currentDate < acc ? curentDate : acc;
            }, dateRange[0]);
            const earliestDateFormat = new Date(earliestDate);
            const latestDate = dateRange.reduce((acc, currentDate) => {
                return currentDate > acc ? currentDate : acc;
            }, dateRange[0]);
            const latestDateFormat = new Date(latestDate);

            const monthList = ["Jan.","Feb.","Mar.","Apr.","May","Jun.","Jul.","Aug.","Sep.","Oct.","Nov.","Dec."];
            // const firstTime = movementData.Date_Time_Rounded;
            const startDayOfMonth = earliestDateFormat.getDate();
            const startMonth = monthList[earliestDateFormat.getMonth()];
            const startYear = earliestDateFormat.getFullYear();
            const endDayOfMonth = latestDateFormat.getDate();
            const endMonth = monthList[latestDateFormat.getMonth()];
            const endYear = latestDateFormat.getFullYear();
        
            const dateStringCumulative = startMonth + " " + startDayOfMonth + ", " + startYear + " to " + endMonth + " " + endDayOfMonth + ", " + endYear;
            cumulativeDateline.text(dateStringCumulative);

            var circles = svg.selectAll(".hub")
                .data(hubData)
                .enter()
                .append("circle")
                .attr("class", "hub")
                .attr("cx", function(d) {
                    // projection() retunrs [x,y]
                    return projection([d.Hub_Longitude, d.Hub_Latitude])[0];
                })
                .attr("cy", function(d) {
                    return projection([d.Hub_Longitude, d.Hub_Latitude])[1];
                })
                .attr("r", function(d) {
                    return radiusScale(d.Sturgeon_Count);
                })
                .attr("fill", "#BB9F06") 
                .attr("stroke", "#BB9F06")
                .attr("stroke-width", 2)
                .attr("opacity", 0.7)
                .on("mouseover", function(d) {
                    tooltip.style("opacity", 1)
                        .html("<strong>" + d.Hub_ID + "</strong><br/>Sturgeon Count: " + d.Sturgeon_Count);
                })
                .on("mousemove", function(d) {
                    tooltip.style("left", (d3.event.pageX + 15) + "px")
                        .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("opacity", 0);
                })
                .on("click", handleHubClick)
    };
});