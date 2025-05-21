document.addEventListener('DOMContentLoaded', () => {
  // DOM element references
  const getResultsBtn = document.getElementById('get-results-btn'); // Button to trigger fetching and displaying results
  const resultsDiv = document.getElementById('results'); // Container to display all results and charts
  const printAllReportBtn = document.getElementById('print-all-report-btn'); // Button to trigger printing the report
  const SVG_NS = "http://www.w3.org/2000/svg"; // SVG namespace for creating SVG elements

  // Color mapping for IPA quadrants
  const QUADRANT_COLORS = {
    "Concentrate Here": "#d32f2f", // Red for high importance, low performance
    "Keep Up the Good Work": "#4caf50", // Green for high importance, high performance
    "Good Work": "#4caf50", // Alias for "Keep Up the Good Work"
    "Low Priority": "#ff9800", // Orange for low importance, low performance
    "Possible Overkill": "#2196f3", // Blue for low importance, high performance
    "Default": "#757575" // Grey for any undefined quadrant
  };

  let prompt_payload = null; // Variable to store the data payload for the AI API call

  /**
   * Helper function to display an error message within a specified container.
   * @param {string} message - The error message to display.
   * @param {HTMLElement} container - The DOM element where the error message will be appended.
   */
  function displayErrorMessage(message, container) {
    container.innerHTML = ''; // Clear any existing content in the container
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message'); // Apply general error message styling
    // Inline styles for the error message appearance
    errorDiv.style.padding = '12px 15px';
    errorDiv.style.backgroundColor = '#ffebee'; // Light red background
    errorDiv.style.color = '#c62828'; // Dark red text
    errorDiv.style.border = '1px solid #ef9a9a'; // Light red border
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.marginTop = '15px';
    errorDiv.style.lineHeight = '1.5';
    errorDiv.textContent = message; // Set the error message text
    container.appendChild(errorDiv); // Add the error message to the container
  }

  /**
   * Helper function to render an object's key-value pairs as a list of styled divs.
   * @param {object} items - The object containing key-value pairs to render.
   * @param {string} itemClassName - The CSS class name to apply to each item's div.
   * @param {function} [keyDisplayNameTransform=key => key.replace(/_/g, ' ')] - Optional function to transform keys for display (e.g., replace underscores with spaces).
   * @returns {DocumentFragment} A document fragment containing the rendered key-value pairs.
   */
  function renderKeyValuePairs(items, itemClassName, keyDisplayNameTransform = key => key.replace(/_/g, ' ')) {
    const fragment = document.createDocumentFragment(); // Use a fragment for efficient DOM manipulation
    if (items && typeof items === 'object' && Object.keys(items).length > 0) {
      for (const [key, value] of Object.entries(items)) {
        const div = document.createElement('div');
        div.classList.add(itemClassName); // Apply specified class
        // Format the key-value pair with inline styles for better readability
        div.innerHTML = `<strong style="color: #2c3e50;">${keyDisplayNameTransform(key)}:</strong> <span style="color: #34495e;">${value}</span>`;
        div.style.padding = '5px 0';
        div.style.fontSize = '0.95em';
        fragment.appendChild(div);
      }
    }
    return fragment;
  }

  /**
   * Helper function to render images from a data object into a specified container.
   * @param {object} imagesData - An object where keys are image titles and values are image paths/URLs.
   * @param {HTMLElement} container - The DOM element where the images will be appended.
   */
  function renderImages(imagesData, container) {
    if (imagesData && typeof imagesData === 'object' && Object.keys(imagesData).length > 0) {
      for (const [key, imagePath] of Object.entries(imagesData)) {
        // Create and style a title for the image
        const imgTitle = document.createElement('h4');
        imgTitle.className = 'sub-chart-title';
        imgTitle.textContent = key.replace(/_/g, ' '); // Format title
        imgTitle.style.textAlign = 'center';
        imgTitle.style.color = '#34495e';
        imgTitle.style.marginBottom = '10px';
        container.appendChild(imgTitle);

        // Create and style the image element
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = key.replace(/_/g, ' '); // Set alt text for accessibility
        img.style.maxWidth = '100%'; // Ensure image is responsive
        img.style.height = 'auto';
        img.style.borderRadius = '6px';
        img.style.boxShadow = '0 3px 6px rgba(0,0,0,0.12)'; // Add a subtle shadow
        img.style.marginTop = '5px';
        img.style.marginBottom = '15px';
        container.appendChild(img);
      }
    }
  }

  /**
   * Renders an Importance-Performance Analysis (IPA) table from a JSON string into a container.
   * Also parses the IPA data and returns it.
   * @param {string} ipaString - A JSON string representing the IPA data.
   * @param {HTMLElement} container - The DOM element where the table will be rendered.
   * @returns {Array|null} The parsed IPA data as an array of objects, or null if parsing/rendering fails or data is invalid.
   */
  function renderIpaTable(ipaString, container) {
    if (!ipaString) return null; // Exit if no IPA string is provided

    try {
      // Parse the JSON string and normalize "Good Work" to "Keep Up the Good Work"
      const parsedIpa = JSON.parse(ipaString).map(item => ({
        ...item,
        Quadrant: item.Quadrant === "Good Work" ? "Keep Up the Good Work" : item.Quadrant
      }));

      // Validate the structure of the parsed IPA data
      if (!Array.isArray(parsedIpa) || parsedIpa.length === 0 ||
        typeof parsedIpa[0] !== 'object' || parsedIpa[0] === null ||
        Object.keys(parsedIpa[0]).length === 0) {
        console.warn('IPA data is not in the expected format.'); return null;
      }

      // Create and append the table title
      const tableTitle = document.createElement('h3');
      tableTitle.textContent = 'Importance-Performance Analysis Table';
      tableTitle.className = 'chart-title';
      container.appendChild(tableTitle);

      // Create the table structure
      const table = document.createElement('table');
      table.classList.add('ipa-table');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');

      // Create table headers from the keys of the first IPA item
      const headers = Object.keys(parsedIpa[0]);
      const headerRow = document.createElement('tr');
      headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText.replace(/_/g, ' '); // Format header text
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Populate table rows with IPA data
      parsedIpa.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const row = document.createElement('tr');
          headers.forEach(headerKey => {
            const td = document.createElement('td');
            const value = item[headerKey];
            td.textContent = (value !== undefined && value !== null) ? String(value) : ''; // Handle null/undefined values
            row.appendChild(td);
          });
          // Highlight rows that fall into the "Concentrate Here" quadrant
          if (item.Quadrant === "Concentrate Here") { row.classList.add('highlight-row'); }
          tbody.appendChild(row);
        }
      });
      table.appendChild(tbody);
      container.appendChild(table); // Add the complete table to the container
      return parsedIpa; // Return the parsed data for further use

    } catch (e) {
      console.error('Error parsing or rendering IPA table:', e);
      displayErrorMessage('Error displaying IPA table. Check console for details.', container);
      return null; // Return null on error
    }
  }

  /**
   * Renders an IPA Scatter Plot (Importance vs. Performance) using SVG.
   * @param {Array} ipaData - An array of IPA data objects. Each object should have 'Importance', 'Performance', 'Attribute', and 'Quadrant' properties.
   * @param {object} means - An object containing `mean_importance` and `mean_performance` values.
   * @param {HTMLElement} container - The DOM element where the scatter plot will be rendered.
   */
  function renderIpaScatterPlot(ipaData, means, container) {
    if (!ipaData || ipaData.length === 0) return; // Exit if no data

    // Create and append the plot title
    const plotTitle = document.createElement('h4');
    plotTitle.textContent = 'IPA Scatter Plot (Importance vs. Performance)';
    plotTitle.className = 'sub-chart-title';
    container.appendChild(plotTitle);

    // SVG setup
    const svg = document.createElementNS(SVG_NS, "svg");
    const containerWidth = container.offsetWidth > 0 ? container.offsetWidth : 600; // Get container width or default
    const svgWidth = Math.min(500, containerWidth - 20); // Responsive SVG width
    const svgHeight = svgWidth * 0.8; // Maintain aspect ratio
    const margin = { top: 30, right: 20, bottom: 40, left: 40 };
    const width = svgWidth - margin.left - margin.right; // Chart area width
    const height = svgHeight - margin.top - margin.bottom; // Chart area height

    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`); // For responsive scaling
    svg.setAttribute("class", "scatter-plot-svg");
    svg.style.fontFamily = 'Roboto, Arial, sans-serif';

    // Create a group element for chart elements, applying margins
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    // Scales for mapping performance and importance values to pixel coordinates
    // Assumes performance/importance scores are on a 1-5 scale
    const perfScale = val => Math.max(0, Math.min(width, (val - 1) / 4 * width)); // X-axis
    const impScale = val => Math.max(0, Math.min(height, height - (val - 1) / 4 * height)); // Y-axis (inverted)

    // Draw X-axis line
    const xAxis = document.createElementNS(SVG_NS, "line");
    xAxis.setAttribute("x1", "0"); xAxis.setAttribute("y1", String(height));
    xAxis.setAttribute("x2", String(width)); xAxis.setAttribute("y2", String(height));
    xAxis.setAttribute("stroke", "#333");
    g.appendChild(xAxis);

    // Add X-axis label
    const xAxisLabel = document.createElementNS(SVG_NS, "text");
    xAxisLabel.textContent = "Performance";
    xAxisLabel.setAttribute("x", String(width / 2));
    xAxisLabel.setAttribute("y", String(height + margin.bottom - 10));
    xAxisLabel.setAttribute("text-anchor", "middle");
    xAxisLabel.setAttribute("class", "axis-label");
    g.appendChild(xAxisLabel);

    // Draw Y-axis line
    const yAxis = document.createElementNS(SVG_NS, "line");
    yAxis.setAttribute("x1", "0"); yAxis.setAttribute("y1", "0");
    yAxis.setAttribute("x2", "0"); yAxis.setAttribute("y2", String(height));
    yAxis.setAttribute("stroke", "#333");
    g.appendChild(yAxis);

    // Add Y-axis label
    const yAxisLabel = document.createElementNS(SVG_NS, "text");
    yAxisLabel.textContent = "Importance";
    yAxisLabel.setAttribute("transform", `translate(${-margin.left + 15}, ${height/2}) rotate(-90)`); // Rotate for vertical display
    yAxisLabel.setAttribute("text-anchor", "middle");
    yAxisLabel.setAttribute("class", "axis-label");
    g.appendChild(yAxisLabel);

    // Draw axis ticks and labels (for a 1-5 scale)
    for (let i = 1; i <= 5; i++) {
      // X-axis ticks
      const xTick = document.createElementNS(SVG_NS, "line");
      xTick.setAttribute("x1", String(perfScale(i))); xTick.setAttribute("y1", String(height));
      xTick.setAttribute("x2", String(perfScale(i))); xTick.setAttribute("y2", String(height + 5));
      xTick.setAttribute("stroke", "#333");
      g.appendChild(xTick);
      const xTickLabel = document.createElementNS(SVG_NS, "text");
      xTickLabel.textContent = String(i);
      xTickLabel.setAttribute("x", String(perfScale(i))); xTickLabel.setAttribute("y", String(height + 15));
      xTickLabel.setAttribute("text-anchor", "middle"); xTickLabel.style.fontSize = "10px";
      g.appendChild(xTickLabel);

      // Y-axis ticks
      const yTick = document.createElementNS(SVG_NS, "line");
      yTick.setAttribute("x1", "-5"); yTick.setAttribute("y1", String(impScale(i)));
      yTick.setAttribute("x2", "0"); yTick.setAttribute("y2", String(impScale(i)));
      yTick.setAttribute("stroke", "#333");
      g.appendChild(yTick);
      const yTickLabel = document.createElementNS(SVG_NS, "text");
      yTickLabel.textContent = String(i);
      yTickLabel.setAttribute("x", "-12");
      yTickLabel.setAttribute("y", String(impScale(i) + 3)); // Adjust vertical alignment
      yTickLabel.setAttribute("text-anchor", "middle"); yTickLabel.style.fontSize = "10px";
      g.appendChild(yTickLabel);
    }

    // Calculate and draw mean lines for performance and importance
    const meanPerfX = perfScale(means.mean_performance);
    const meanImpY = impScale(means.mean_importance);

    // Mean performance line (vertical)
    const perfLine = document.createElementNS(SVG_NS, "line");
    perfLine.setAttribute("x1", String(meanPerfX)); perfLine.setAttribute("y1", "0");
    perfLine.setAttribute("x2", String(meanPerfX)); perfLine.setAttribute("y2", String(height));
    perfLine.setAttribute("stroke", "#aaa"); perfLine.setAttribute("stroke-dasharray", "4 2"); // Dashed line
    g.appendChild(perfLine);

    // Mean importance line (horizontal)
    const impLine = document.createElementNS(SVG_NS, "line");
    impLine.setAttribute("x1", "0"); impLine.setAttribute("y1", String(meanImpY));
    impLine.setAttribute("x2", String(width)); impLine.setAttribute("y2", String(meanImpY));
    impLine.setAttribute("stroke", "#aaa"); impLine.setAttribute("stroke-dasharray", "4 2"); // Dashed line
    g.appendChild(impLine);

    // Define quadrant labels and their positions
    const qLabels = [
      { text: "Concentrate Here", x: meanPerfX * 0.4, y: meanImpY * 0.4, color: QUADRANT_COLORS["Concentrate Here"] },
      { text: "Good Work", x: meanPerfX + (width - meanPerfX) * 0.6, y: meanImpY * 0.4, color: QUADRANT_COLORS["Keep Up the Good Work"] },
      { text: "Low Priority", x: meanPerfX * 0.4, y: meanImpY + (height - meanImpY) * 0.6, color: QUADRANT_COLORS["Low Priority"] },
      { text: "Overkill", x: meanPerfX + (width - meanPerfX) * 0.6, y: meanImpY + (height - meanImpY) * 0.6, color: QUADRANT_COLORS["Possible Overkill"] }
    ];

    // Add quadrant labels to the plot
    qLabels.forEach(ql => {
      const qText = document.createElementNS(SVG_NS, "text");
      qText.textContent = ql.text;
      qText.setAttribute("x", String(ql.x)); qText.setAttribute("y", String(ql.y));
      qText.setAttribute("text-anchor", "middle"); qText.setAttribute("class", "quadrant-label");
      qText.style.fill = ql.color; qText.style.opacity = "0.8"; qText.style.fontWeight = "bold";
      g.appendChild(qText);
    });

    // Plot each IPA data point as a circle
    ipaData.forEach(item => {
      const cx = perfScale(item.Performance); // X-coordinate from performance score
      const cy = impScale(item.Importance); // Y-coordinate from importance score
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", "5"); // Circle radius
      circle.setAttribute("fill", QUADRANT_COLORS[item.Quadrant] || QUADRANT_COLORS["Default"]); // Color by quadrant
      circle.setAttribute("opacity", "0.8");

      // Add a tooltip (SVG title element) to each circle showing details on hover
      const titleElement = document.createElementNS(SVG_NS, "title");
      titleElement.textContent = `${item.Attribute}\nImp: ${item.Importance}, Perf: ${item.Performance}\n${item.Quadrant}`;
      circle.appendChild(titleElement);
      g.appendChild(circle);
    });

    container.appendChild(svg); // Add the complete SVG to the container
  }


  /**
   * Renders individual bar charts for each attribute's Importance and Performance scores.
   * @param {Array} ipaData - An array of IPA data objects.
   * @param {HTMLElement} container - The DOM element where the bar charts will be rendered.
   */
  function renderIpaBarCharts(ipaData, container) {
    if (!ipaData || ipaData.length === 0) return; // Exit if no data

    // Create and append the main title for this section
    const barChartTitle = document.createElement('h4');
    barChartTitle.textContent = 'Attribute Importance & Performance Scores';
    barChartTitle.className = 'sub-chart-title';
    container.appendChild(barChartTitle);

    // Create a container for all individual bar chart SVGs
    const barChartContainer = document.createElement('div');
    barChartContainer.className = 'bar-chart-svg-container'; // For styling layout of multiple SVGs

    // Define dimensions and scaling for the bars
    const barHeight = 18; // Height of each individual bar (Importance or Performance)
    const valueScale = val => Math.max(0, (val / 5) * 180); // Scale score (1-5) to bar width (max 180px)
    const labelWidth = 180; // Width allocated for the attribute label text
    const barMaxWidth = 180; // Maximum width for a bar
    const spacing = 4; // Spacing between elements
    const itemHeight = (barHeight + spacing) * 2 + 18; // Total height for one attribute's chart (label + 2 bars + spacing)

    // Create a small SVG bar chart for each attribute
    ipaData.forEach(item => {
      const itemDiv = document.createElement('div'); // Wrapper for each attribute's SVG
      itemDiv.className = 'bar-chart-item';

      const svg = document.createElementNS(SVG_NS, "svg");
      const svgWidth = labelWidth + barMaxWidth + 60; // Total SVG width (label + bar + value text)
      const svgHeight = itemHeight;
      svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`); // For responsiveness
      svg.style.fontFamily = 'Roboto, Arial, sans-serif';

      // Attribute label text
      const attrText = document.createElementNS(SVG_NS, "text");
      // Truncate long attribute names for display
      attrText.textContent = item.Attribute.length > 25 ? item.Attribute.substring(0, 22) + "..." : item.Attribute;
      attrText.setAttribute("x", "0");
      attrText.setAttribute("y", "12"); // Position at the top
      attrText.style.fontWeight = "500";
      attrText.style.fontSize = "11px";
      svg.appendChild(attrText);

      // Importance bar
      const impBar = document.createElementNS(SVG_NS, "rect");
      impBar.setAttribute("x", String(labelWidth)); // Start after the label area
      impBar.setAttribute("y", String(18 + spacing)); // Position below the attribute text
      impBar.setAttribute("width", String(valueScale(item.Importance)));
      impBar.setAttribute("height", String(barHeight));
      impBar.setAttribute("fill", "#2196f3"); // Blue for Importance
      svg.appendChild(impBar);

      // Importance score text
      const impText = document.createElementNS(SVG_NS, "text");
      impText.textContent = `I: ${typeof item.Importance === 'number' ? item.Importance.toFixed(2) : 'N/A'}`;
      impText.setAttribute("x", String(labelWidth + valueScale(item.Importance) + 5)); // Position after the bar
      impText.setAttribute("y", String(18 + spacing + barHeight / 2 + 4)); // Vertically centered with the bar
      impText.style.fontSize = "10px";
      svg.appendChild(impText);

      // Performance bar
      const perfBar = document.createElementNS(SVG_NS, "rect");
      perfBar.setAttribute("x", String(labelWidth)); // Start after the label area
      perfBar.setAttribute("y", String(18 + spacing + barHeight + spacing)); // Position below the Importance bar
      perfBar.setAttribute("width", String(valueScale(item.Performance)));
      perfBar.setAttribute("height", String(barHeight));
      perfBar.setAttribute("fill", "#ff9800"); // Orange for Performance
      svg.appendChild(perfBar);

      // Performance score text
      const perfText = document.createElementNS(SVG_NS, "text");
      perfText.textContent = `P: ${typeof item.Performance === 'number' ? item.Performance.toFixed(2) : 'N/A'}`;
      perfText.setAttribute("x", String(labelWidth + valueScale(item.Performance) + 5)); // Position after the bar
      perfText.setAttribute("y", String(18 + spacing + barHeight + spacing + barHeight / 2 + 4)); // Vertically centered
      perfText.style.fontSize = "10px";
      svg.appendChild(perfText);

      itemDiv.appendChild(svg); // Add the SVG for this attribute to its wrapper
      barChartContainer.appendChild(itemDiv); // Add the wrapper to the main container
    });
    container.appendChild(barChartContainer); // Add the container of all bar charts to the page
  }

  /**
   * Calculates statistics for each IPA quadrant based on the provided data.
   * Stats include count of attributes, total/average importance, and total/average performance per quadrant.
   * @param {Array} ipaData - An array of IPA data objects.
   * @returns {object} An object containing statistics for each quadrant and total attributes.
   */
  function calculateQuadrantStats(ipaData) {
    // Initialize statistics object for each quadrant
    const stats = {
      "Concentrate Here": { count: 0, totalImportance: 0, totalPerformance: 0 },
      "Keep Up the Good Work": { count: 0, totalImportance: 0, totalPerformance: 0 },
      "Low Priority": { count: 0, totalImportance: 0, totalPerformance: 0 },
      "Possible Overkill": { count: 0, totalImportance: 0, totalPerformance: 0 },
    };
    let totalAttributes = 0; // Counter for the total number of attributes processed

    // Iterate over IPA data to aggregate stats
    ipaData.forEach(item => {
      // Normalize "Good Work" to "Keep Up the Good Work" for consistent stat tracking
      const quadrantName = item.Quadrant === "Good Work" ? "Keep Up the Good Work" : item.Quadrant;
      if (stats[quadrantName]) { // Check if the quadrant name is valid
        stats[quadrantName].count++;
        stats[quadrantName].totalImportance += (typeof item.Importance === 'number' ? item.Importance : 0); // Add to total, ensuring it's a number
        stats[quadrantName].totalPerformance += (typeof item.Performance === 'number' ? item.Performance : 0);
        totalAttributes++;
      }
    });

    // Calculate averages and percentages for each quadrant
    for (const q in stats) {
      stats[q].avgImportance = stats[q].count > 0 ? (stats[q].totalImportance / stats[q].count).toFixed(2) : "0.00"; // Calculate average, handle division by zero
      stats[q].avgPerformance = stats[q].count > 0 ? (stats[q].totalPerformance / stats[q].count).toFixed(2) : "0.00";
      stats[q].percentage = totalAttributes > 0 ? (stats[q].count / totalAttributes) * 100 : 0; // Calculate percentage of attributes in this quadrant
    }
    stats.totalAttributes = totalAttributes; // Store the total number of attributes
    return stats;
  }

  /**
   * Renders a Pie Chart showing the distribution of attributes across IPA quadrants.
   * @param {object} quadrantStats - Statistics object generated by `calculateQuadrantStats`.
   * @param {HTMLElement} container - The DOM element where the pie chart will be rendered.
   */
  function renderQuadrantDistributionPieChart(quadrantStats, container) {
    // Create and append the chart title
    const title = document.createElement('h4');
    title.textContent = 'Attribute Distribution by Quadrant';
    title.className = 'sub-chart-title';
    container.appendChild(title);

    // SVG setup for the pie chart
    const svg = document.createElementNS(SVG_NS, "svg");
    const svgSize = Math.min(300, container.offsetWidth > 0 ? container.offsetWidth - 20 : 280); // Responsive size
    const radius = svgSize / 2 * 0.8; // Radius of the pie, with some padding
    const centerX = svgSize / 2;
    const centerY = svgSize / 2;
    svg.setAttribute("viewBox", `0 0 ${svgSize} ${svgSize}`);
    svg.setAttribute("class", "pie-chart-svg");

    let startAngle = -90; // Start at the top of the circle for the first slice
    const quadrants = ["Concentrate Here", "Keep Up the Good Work", "Low Priority", "Possible Overkill"]; // Define order for slices

    // Create a container for the chart legend
    const legendContainer = document.createElement('div');
    legendContainer.className = 'chart-legend'; // Class for styling the legend

    quadrants.forEach(qName => {
      // Skip quadrants with no attributes
      if (!quadrantStats[qName] || quadrantStats[qName].count === 0) return;

      const percentage = quadrantStats[qName].percentage;
      const sliceAngle = (percentage / 100) * 360; // Angle of the pie slice
      const endAngle = startAngle + sliceAngle;

      // Calculate coordinates for the arc of the pie slice
      const x1 = centerX + radius * Math.cos(startAngle * Math.PI / 180);
      const y1 = centerY + radius * Math.sin(startAngle * Math.PI / 180);
      const x2 = centerX + radius * Math.cos(endAngle * Math.PI / 180);
      const y2 = centerY + radius * Math.sin(endAngle * Math.PI / 180);

      const largeArcFlag = sliceAngle > 180 ? 1 : 0; // Determine if the arc should be > 180 degrees

      // SVG path data for the pie slice
      const pathData = `M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;

      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", pathData);
      path.setAttribute("fill", QUADRANT_COLORS[qName] || QUADRANT_COLORS["Default"]); // Color by quadrant

      // Add a tooltip to the slice
      const titleElement = document.createElementNS(SVG_NS, "title");
      titleElement.textContent = `${qName}: ${quadrantStats[qName].count} attributes (${percentage.toFixed(1)}%)`;
      path.appendChild(titleElement);
      svg.appendChild(path);

      // Add percentage label inside the slice if it's large enough
      const midAngleRad = (startAngle + sliceAngle / 2) * Math.PI / 180; // Mid-angle for label placement
      if (percentage > 5) { // Only show label for slices representing > 5%
        const labelRadius = radius * 0.65; // Position label inside the slice
        const labelX = centerX + labelRadius * Math.cos(midAngleRad);
        const labelY = centerY + labelRadius * Math.sin(midAngleRad);
        const textLabel = document.createElementNS(SVG_NS, "text");
        textLabel.setAttribute("x", String(labelX));
        textLabel.setAttribute("y", String(labelY + 4)); // Adjust vertical alignment
        textLabel.setAttribute("text-anchor", "middle");
        textLabel.style.fontSize = "11px";
        textLabel.style.fill = "#ffffff"; // White text for contrast
        textLabel.style.fontWeight = "bold";
        textLabel.textContent = `${percentage.toFixed(0)}%`; // Display rounded percentage
        svg.appendChild(textLabel);
      }
      startAngle = endAngle; // Update start angle for the next slice

      // Create legend item for this quadrant
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      const colorBox = document.createElement('div');
      colorBox.className = 'legend-color-box';
      colorBox.style.backgroundColor = QUADRANT_COLORS[qName] || QUADRANT_COLORS["Default"];
      legendItem.appendChild(colorBox);
      legendItem.appendChild(document.createTextNode(` ${qName} (${quadrantStats[qName].count})`)); // Add text to legend item
      legendContainer.appendChild(legendItem);
    });
    container.appendChild(svg); // Add the pie chart SVG to the container
    container.appendChild(legendContainer); // Add the legend to the container
  }

  /**
   * Renders a Bar Chart showing average Importance and Performance scores for each IPA quadrant.
   * @param {object} quadrantStats - Statistics object generated by `calculateQuadrantStats`.
   * @param {HTMLElement} container - The DOM element where the bar chart will be rendered.
   */
  function renderQuadrantPerformanceBarChart(quadrantStats, container) {
    // Create and append the chart title
    const title = document.createElement('h4');
    title.textContent = 'Average Scores by Quadrant';
    title.className = 'sub-chart-title';
    container.appendChild(title);

    // SVG setup
    const svg = document.createElementNS(SVG_NS, "svg");
    const svgWidth = Math.min(600, container.offsetWidth > 0 ? container.offsetWidth - 20 : 580); // Responsive width
    const svgHeight = 330; // Fixed height
    const margin = { top: 30, right: 20, bottom: 85, left: 50 }; // Margins, bottom increased for x-axis labels
    const width = svgWidth - margin.left - margin.right; // Chart area width
    const height = svgHeight - margin.top - margin.bottom; // Chart area height

    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute("class", "quadrant-bar-chart-svg");

    // Group element for chart content with margins applied
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    // Get quadrant names, excluding 'totalAttributes'
    const quadrants = Object.keys(quadrantStats).filter(q => q !== "totalAttributes");
    const barGroupWidth = width / quadrants.length; // Width for each group of bars (Imp + Perf)
    const barPadding = 0.3; // Padding between bar groups
    const barWidth = (barGroupWidth * (1 - barPadding)) / 2; // Width of individual Importance/Performance bars

    // Y-axis scale (scores 0-5)
    const yScale = val => height - (val / 5 * height); // Inverted scale for SVG coordinates

    // Draw Y-axis with grid lines and labels
    for (let i = 0; i <= 5; i++) { // For scores 0 to 5
      const y = yScale(i);
      // Grid line
      const gridLine = document.createElementNS(SVG_NS, "line");
      gridLine.setAttribute("x1", "0"); gridLine.setAttribute("y1", String(y));
      gridLine.setAttribute("x2", String(width)); gridLine.setAttribute("y2", String(y));
      gridLine.setAttribute("stroke", "#e0e0e0"); // Light grey grid lines
      gridLine.setAttribute("stroke-dasharray", i === 0 ? "none" : "3 3"); // Solid line for 0, dashed for others
      g.appendChild(gridLine);
      // Y-axis label
      const yLabel = document.createElementNS(SVG_NS, "text");
      yLabel.textContent = String(i);
      yLabel.setAttribute("x", "-10"); // Position left of the axis
      yLabel.setAttribute("y", String(y + 4)); // Align with grid line
      yLabel.setAttribute("text-anchor", "end"); yLabel.style.fontSize = "10px";
      g.appendChild(yLabel);
    }
    // Y-axis title
    const yAxisTitle = document.createElementNS(SVG_NS, "text");
    yAxisTitle.textContent = "Average Score";
    yAxisTitle.setAttribute("transform", `translate(${-margin.left + 18}, ${height/2}) rotate(-90)`); // Rotate for vertical display
    yAxisTitle.setAttribute("text-anchor", "middle"); yAxisTitle.setAttribute("class", "axis-label");
    g.appendChild(yAxisTitle);

    // Draw bars for each quadrant
    quadrants.forEach((qName, index) => {
      if (!quadrantStats[qName] || quadrantStats[qName].count === 0) return; // Skip if no data for this quadrant

      const groupX = index * barGroupWidth + (barGroupWidth * barPadding / 2); // X-position for this group of bars

      // Importance Bar
      const impBar = document.createElementNS(SVG_NS, "rect");
      impBar.setAttribute("x", String(groupX));
      impBar.setAttribute("y", String(yScale(parseFloat(quadrantStats[qName].avgImportance))));
      impBar.setAttribute("width", String(barWidth));
      impBar.setAttribute("height", String(height - yScale(parseFloat(quadrantStats[qName].avgImportance))));
      impBar.setAttribute("fill", "#2196f3"); // Blue for Importance
      // Tooltip for importance bar
      const impTitleElement = document.createElementNS(SVG_NS, "title");
      impTitleElement.textContent = `${qName} - Avg. Importance: ${quadrantStats[qName].avgImportance}`;
      impBar.appendChild(impTitleElement);
      g.appendChild(impBar);

      // Performance Bar
      const perfBar = document.createElementNS(SVG_NS, "rect");
      perfBar.setAttribute("x", String(groupX + barWidth)); // Position next to the importance bar
      perfBar.setAttribute("y", String(yScale(parseFloat(quadrantStats[qName].avgPerformance))));
      perfBar.setAttribute("width", String(barWidth));
      perfBar.setAttribute("height", String(height - yScale(parseFloat(quadrantStats[qName].avgPerformance))));
      perfBar.setAttribute("fill", "#ff9800"); // Orange for Performance
      // Tooltip for performance bar
      const perfTitleElement = document.createElementNS(SVG_NS, "title");
      perfTitleElement.textContent = `${qName} - Avg. Performance: ${quadrantStats[qName].avgPerformance}`;
      perfBar.appendChild(perfTitleElement);
      g.appendChild(perfBar);

      // X-axis Labels (Quadrant Names) - allows for multi-line labels
      const xLabel = document.createElementNS(SVG_NS, "text");
      xLabel.setAttribute("x", String(groupX + barWidth)); // Centered under the bar group
      xLabel.setAttribute("y", String(height + 15)); // Position below bars
      xLabel.setAttribute("text-anchor", "middle");
      xLabel.style.fontSize = "9px";

      // Split long quadrant names for better display (e.g., "Keep Up the Good Work")
      const lines = qName.replace("Keep Up the Good Work", "Good Work").split(' ');
      lines.forEach((line, i) => {
        const tspan = document.createElementNS(SVG_NS, "tspan"); // Use tspan for multi-line text
        tspan.setAttribute("x", String(groupX + barWidth));
        tspan.setAttribute("dy", i === 0 ? 0 : "1.2em"); // Line spacing
        tspan.textContent = line;
        xLabel.appendChild(tspan);
      });
      g.appendChild(xLabel);
    });

    // Legend for the bar chart
    const legend = document.createElementNS(SVG_NS, "g");
    legend.setAttribute("transform", `translate(${width - 220}, ${-margin.top + 10})`); // Position at top-right

    // Importance legend item
    const impLegendRect = document.createElementNS(SVG_NS, "rect");
    impLegendRect.setAttribute("x", "0"); impLegendRect.setAttribute("y", "0");
    impLegendRect.setAttribute("width", "12"); impLegendRect.setAttribute("height", "12");
    impLegendRect.setAttribute("fill", "#2196f3"); // Blue
    legend.appendChild(impLegendRect);
    const impLegendText = document.createElementNS(SVG_NS, "text");
    impLegendText.textContent = "Avg. Importance";
    impLegendText.setAttribute("x", "18"); impLegendText.setAttribute("y", "10");
    impLegendText.style.fontSize = "10px";
    legend.appendChild(impLegendText);

    // Performance legend item
    const perfLegendRect = document.createElementNS(SVG_NS, "rect");
    perfLegendRect.setAttribute("x", "110"); // Spaced from the first legend item
    perfLegendRect.setAttribute("y", "0");
    perfLegendRect.setAttribute("width", "12"); perfLegendRect.setAttribute("height", "12");
    perfLegendRect.setAttribute("fill", "#ff9800"); // Orange
    legend.appendChild(perfLegendRect);
    const perfLegendText = document.createElementNS(SVG_NS, "text");
    perfLegendText.textContent = "Avg. Performance";
    perfLegendText.setAttribute("x", "128"); perfLegendText.setAttribute("y", "10");
    perfLegendText.style.fontSize = "10px";
    legend.appendChild(perfLegendText);
    g.appendChild(legend); // Add legend to the chart group

    container.appendChild(svg); // Add the complete SVG to the container
  }


  /**
   * Converts a Markdown-like text string to styled HTML.
   * Handles specific patterns like titles, section headers, bullet points, and horizontal rules.
   * @param {string} markdown - The Markdown-like string to convert.
   * @returns {string} The HTML representation of the Markdown content.
   */
  function markdownToHtml(markdown) {
    // Handle cases where markdown content is missing or invalid
    if (!markdown || typeof markdown !== 'string') {
      return '<p class="ai-report-error" style="color: #c0392b; padding: 10px; background-color: #fdecea; border-left: 4px solid #c0392b;">No content received or content is in an invalid format.</p>';
    }

    const lines = markdown.trim().split('\n'); // Split markdown into lines
    let htmlOutput = ''; // Initialize HTML output string

    lines.forEach(line => {
      const trimmedLine = line.trim();

      // Skip empty lines to avoid extra spacing unless explicitly desired
      if (trimmedLine === "") {
        return;
      }

      // ### **Main Title** -> h2.ai-report-main-title (Large, prominent title)
      if (trimmedLine.startsWith('### **') && trimmedLine.endsWith('**')) {
        htmlOutput += `<h2 class="ai-report-main-title" style="color: #2c3e50; margin-bottom: 1.2em; margin-top: 0.5em; font-size: 1.6em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em;">${trimmedLine.substring(6, trimmedLine.length - 2)}</h2>\n`;
      }
      // **Section Title** (e.g., **I. Executive Summary**) -> h3.ai-report-section-title (Roman numeral sections)
      else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && /^\*\*[IVXLCDM]+\.\s.*?\*\*$/.test(trimmedLine)) {
        htmlOutput += `<h3 class="ai-report-section-title" style="color: #2980b9; margin-top: 1.8em; margin-bottom: 1em; font-size: 1.3em; padding-bottom: 0.2em; border-bottom: 1px solid #aed6f1;">${trimmedLine.substring(2, trimmedLine.length - 2)}</h3>\n`;
      }
      // **Sub-Section Title or Emphasized Line** (e.g., **Key Findings:**) -> h4.ai-report-sub-section
      else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        htmlOutput += `<h4 class="ai-report-sub-section" style="color: #16a085; margin-top: 1.2em; margin-bottom: 0.6em; font-size: 1.1em;">${trimmedLine.substring(2, trimmedLine.length - 2)}</h4>\n`;
      }
      // --- (Horizontal Rule) -> hr.ai-report-divider (Styled separator)
      else if (trimmedLine === '---') {
        htmlOutput += '<hr class="ai-report-divider" style="margin: 2em 0; border: 0; height: 1px; background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(44, 62, 80, 0.35), rgba(0, 0, 0, 0));">\n';
      }
      // * Bullet alternative -> p.ai-report-bullet-alternative (Styled bullet points)
      else if (trimmedLine.startsWith('* ')) {
        let content = trimmedLine.substring(2);
        // Style bolded key phrases within bullet items (e.g., "**Key:** Value")
        content = content.replace(/\*\*(.*?):\*\*/g, '<strong style="color: #2c3e50; font-weight: 600;">$1:</strong>');
        // Style other general bolding within bullet items
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #27ae60;">$1</strong>');
        htmlOutput += `<p class="ai-report-bullet-alternative" style="margin-bottom: 0.8em; padding-left: 1.5em; position: relative; line-height: 1.6;">
                               <span style="position: absolute; left: 0; top: 0.1em; color: #3498db; font-size: 1.2em;">&bull;</span> ${content}
                             </p>\n`;
      }
      // Default to paragraph -> p.ai-report-paragraph (Regular text)
      else {
        let paragraphContent = trimmedLine;
        // Style bolded key phrases within paragraphs
        paragraphContent = paragraphContent.replace(/\*\*(.*?):\*\*/g, '<strong style="color: #2c3e50; font-weight: 600;">$1:</strong>');
        // Style other general bolding within paragraphs
        paragraphContent = paragraphContent.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #555;">$1</strong>');
        htmlOutput += `<p class="ai-report-paragraph" style="margin-bottom: 1em; line-height: 1.65; color: #4a4a4a;">${paragraphContent}</p>\n`;
      }
    });
    // Wrap the entire parsed content in a div for better overall styling and scoping
    return `<div class="ai-report-parsed-content" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">${htmlOutput}</div>`;
  }


  /**
   * Renders the AI-Powered CRM Insights section, including a button to fetch and display the AI report.
   * @param {HTMLElement} mainContainer - The main DOM element where this section will be appended.
   * @param {object} current_prompt_payload - The payload containing data (IPA, results, means) to be sent to the AI API.
   */
  function renderAiCrmReportSection(mainContainer, current_prompt_payload) {
    // Create the main container for the AI report section with styling
    const aiReportOuterContainer = document.createElement('div');
    aiReportOuterContainer.className = 'ai-crm-report-outer-container';
    aiReportOuterContainer.style.border = '1px solid #bdc3c7';
    aiReportOuterContainer.style.borderRadius = '10px';
    aiReportOuterContainer.style.padding = '25px 30px';
    aiReportOuterContainer.style.marginTop = '30px';
    aiReportOuterContainer.style.backgroundColor = '#f4f6f6';
    aiReportOuterContainer.style.boxShadow = '0 5px 15px rgba(0,0,0,0.08)';

    // Create and style the title for the AI report section
    const aiReportTitle = document.createElement('h2');
    aiReportTitle.className = 'chart-title ai-section-main-title';
    aiReportTitle.textContent = 'AI-Powered CRM Insights';
    aiReportTitle.style.color = '#2c3e50';
    aiReportTitle.style.textAlign = 'center';
    aiReportTitle.style.marginBottom = '25px';
    aiReportTitle.style.fontSize = '1.8em';
    aiReportTitle.style.fontWeight = '600';
    aiReportOuterContainer.appendChild(aiReportTitle);

    // Create and style the button to trigger AI insight generation
    const fetchAiButton = document.createElement('button');
    fetchAiButton.id = 'fetch-ai-report-btn';
    fetchAiButton.textContent = 'Generate AI Insights';
    fetchAiButton.className = 'action-button ai-report-button';
    // Styling for the button
    fetchAiButton.style.backgroundColor = '#27ae60'; // Green
    fetchAiButton.style.color = 'white';
    fetchAiButton.style.border = 'none';
    fetchAiButton.style.padding = '14px 28px';
    fetchAiButton.style.fontSize = '1.05em';
    fetchAiButton.style.borderRadius = '6px';
    fetchAiButton.style.cursor = 'pointer';
    fetchAiButton.style.display = 'block';
    fetchAiButton.style.margin = '0 auto 30px auto'; // Center the button
    fetchAiButton.style.transition = 'background-color 0.25s ease, transform 0.1s ease'; // Smooth transitions for hover/active states
    // Hover and active state styling for the button
    fetchAiButton.onmouseover = () => {
      fetchAiButton.style.backgroundColor = '#229954'; // Darker green on hover
      fetchAiButton.style.transform = 'translateY(-1px)'; // Slight lift effect
    };
    fetchAiButton.onmouseout = () => {
      fetchAiButton.style.backgroundColor = '#27ae60'; // Restore original color
      fetchAiButton.style.transform = 'translateY(0px)'; // Restore position
    };
    fetchAiButton.onmousedown = () => fetchAiButton.style.transform = 'translateY(0.5px)'; // Pressed effect
    fetchAiButton.onmouseup = () => fetchAiButton.style.transform = 'translateY(-1px)'; // Release effect
    aiReportOuterContainer.appendChild(fetchAiButton);

    // Create the div where the AI-generated report content will be displayed
    const aiReportContentDiv = document.createElement('div');
    aiReportContentDiv.id = 'ai-report-content';
    // Styling for the content area
    aiReportContentDiv.style.padding = '20px 25px';
    aiReportContentDiv.style.backgroundColor = '#ffffff'; // White background for content
    aiReportContentDiv.style.borderRadius = '8px';
    aiReportContentDiv.style.border = '1px solid #e0e0e0';
    aiReportContentDiv.style.minHeight = '120px'; // Ensure it has some height initially
    aiReportContentDiv.style.textAlign = 'left'; // Align text to the left for readability
    // Initial placeholder message
    aiReportContentDiv.innerHTML = '<p style="text-align:center; color:#555; padding:35px 15px; font-size:1.05em; line-height:1.6;">Click the button above to generate AI-driven insights based on the current survey data. The report will appear here.</p>';
    aiReportOuterContainer.appendChild(aiReportContentDiv);

    // Create a paragraph element for feedback messages (e.g., loading, success, error)
    const aiReportFeedback = document.createElement('p');
    aiReportFeedback.id = 'ai-report-feedback';
    aiReportFeedback.style.textAlign = 'center';
    aiReportFeedback.style.minHeight = '1.6em'; // Reserve space to prevent layout shifts
    aiReportFeedback.style.marginTop = '20px';
    aiReportFeedback.style.fontWeight = '500';
    aiReportFeedback.style.fontSize = '0.95em';
    aiReportOuterContainer.appendChild(aiReportFeedback);

    // Event listener for the "Generate AI Insights" button
    fetchAiButton.addEventListener('click', async () => {
      // Check if necessary data (prompt_payload) is available
      if (!current_prompt_payload || !current_prompt_payload.prompt) {
        aiReportFeedback.textContent = '⚠️ Error: Survey data not available. Please "Get Results & Charts" first.';
        aiReportFeedback.style.color = '#c0392b'; // Error color
        setTimeout(() => { aiReportFeedback.textContent = ''; aiReportFeedback.style.color = ''; }, 6000); // Clear message after 6 seconds
        return; // Stop execution
      }

      // Update button state to "loading"
      fetchAiButton.disabled = true;
      fetchAiButton.textContent = '🧠 Analyzing Data...';
      fetchAiButton.style.backgroundColor = '#7f8c8d'; // Neutral color during loading
      fetchAiButton.style.cursor = 'default';

      // Display loading message and spinner in the content area
      aiReportFeedback.textContent = '📡 Communicating with AI, please hold on...';
      aiReportFeedback.style.color = '#2980b9'; // Informative blue
      aiReportContentDiv.innerHTML = `<div class="loading-message" style="color: #3498db; text-align:center; padding: 50px 0; font-size: 1.15em;"><div>✨ Generating insightful report... This may take a moment.</div><div style="margin-top:15px; width: 55px; height: 55px; border: 6px solid #ecf0f1; border-top: 6px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin-left:auto; margin-right:auto;"></div></div> <style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>`;

      try {
        // Make the API call to the AI service
        const response = await fetch('http://127.0.0.1:8081/api/v1/crm', { // API endpoint
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(current_prompt_payload), // Send the prepared payload
        });

        // Check if the API response is not OK (e.g., 4xx or 5xx errors)
        if (!response.ok) {
          const errorText = await response.text(); // Try to get error details from response body
          throw new Error(`AI API Error: ${response.status} - ${errorText || response.statusText}`);
        }

        // Get the report content (expected in Markdown format)
        const reportMarkdown = await response.text();
        // Convert Markdown to HTML and display it
        aiReportContentDiv.innerHTML = markdownToHtml(reportMarkdown);

        // Update button and feedback on successful report generation
        fetchAiButton.disabled = false;
        fetchAiButton.textContent = 'Re-generate AI Insights'; // Allow re-generation
        fetchAiButton.style.backgroundColor = '#27ae60'; // Restore green color
        fetchAiButton.style.cursor = 'pointer';
        aiReportFeedback.textContent = '✅ AI Report generated successfully!';
        aiReportFeedback.style.color = '#27ae60'; // Success color
        setTimeout(() => { aiReportFeedback.textContent = ''; }, 5000); // Clear message after 5 seconds

      } catch (error) {
        // Handle errors during the API call or processing
        console.error('Error fetching AI report:', error);
        // Display a detailed error message in the content area
        aiReportContentDiv.innerHTML = `<div class="ai-report-error-content" style="color: #c0392b; background-color: #fdecea; padding: 20px; border: 1px solid #e74c3c; border-left: 5px solid #c0392b; border-radius: 6px; text-align:left; line-height:1.6;"><h4><span style="font-size:1.3em; margin-right: 5px;">⚠️</span> Failed to Generate AI Report</h4><p style="margin-top:10px; font-size:0.95em;">${error.message}</p><p style="font-size:0.9em; margin-top:12px; color: #7f8c8d;">Please ensure the AI server at http://127.0.0.1:8081/api/v1/crm is running and accessible. Check the browser console for more technical details.</p></div>`;
        // Update button and feedback to reflect the error state
        fetchAiButton.disabled = false;
        fetchAiButton.textContent = 'Try Re-generating AI Insights';
        fetchAiButton.style.backgroundColor = '#e74c3c'; // Error red color for button
        fetchAiButton.style.cursor = 'pointer';
        aiReportFeedback.textContent = '❌ Error generating AI report. See details in the report area.';
        aiReportFeedback.style.color = '#c0392b'; // Error color
      }
    });
    mainContainer.appendChild(aiReportOuterContainer); // Add the AI report section to the main page container
  }


  // Event listener for the "Get Results & Charts" button
  getResultsBtn.addEventListener('click', function() {
    // Update button state to "loading"
    getResultsBtn.disabled = true;
    getResultsBtn.textContent = 'Loading...';
    resultsDiv.innerHTML = ''; // Clear any previous results from the display area

    // Display a loading message
    const loadingMsgDiv = document.createElement('div');
    loadingMsgDiv.classList.add('loading-message');
    loadingMsgDiv.textContent = "Fetching results, please wait...";
    resultsDiv.appendChild(loadingMsgDiv);

    // Fetch data from the '/get-results' endpoint
    fetch('/get-results')
      .then(response => {
        // Check if the network response is OK
        if (!response.ok) {
          // Try to parse error details from the response body if available
          return response.text().then(text => {
            let detail = "";
            if (text) { try { const jsonError = JSON.parse(text); detail = jsonError.error || text; } catch (e) { detail = text; } }
            throw new Error(`Server error: ${response.status}${detail ? ` - ${detail}` : ` - ${response.statusText}`}`);
          });
        }
        return response.json(); // Parse the JSON response
      })
      .then(data => {
        const fetchedData = data; // Store the fetched data

        // Prepare the payload for the AI API call using the fetched data
        prompt_payload = {
          "prompt": {
            "ipa": fetchedData.ipa, // IPA data (likely JSON string)
            "results": fetchedData.results, // Other model performance metrics
            "means": fetchedData.means // Mean scores
          }
        };

        resultsDiv.innerHTML = ''; // Clear the loading message

        // Create containers for different sections of the results
        const ipaTableContainer = document.createElement('div');
        ipaTableContainer.className = 'ipa-table-container result-section-container'; // For IPA table
        resultsDiv.appendChild(ipaTableContainer);

        const chartsContainer = document.createElement('div');
        chartsContainer.className = 'charts-container result-section-container'; // For various charts
        resultsDiv.appendChild(chartsContainer);

        const generalResultsContainer = document.createElement('div');
        generalResultsContainer.className = 'general-results-container result-section-container'; // For other results like metrics, images
        resultsDiv.appendChild(generalResultsContainer);

        // Render the IPA table and get the parsed data
        const parsedIpaData = renderIpaTable(fetchedData.ipa, ipaTableContainer);

        // If IPA data is valid and parsed, render related charts
        if (parsedIpaData && parsedIpaData.length > 0) {
          const mainChartTitle = document.createElement('h2');
          mainChartTitle.className = 'chart-title';
          mainChartTitle.textContent = 'Survey Visualizations & Analysis';
          chartsContainer.appendChild(mainChartTitle);

          // Determine mean importance and performance. Use fetched means if available, otherwise calculate from parsed IPA data.
          let meanImp = 3.5; // Default mean importance
          let meanPerf = 3.5; // Default mean performance
          if (fetchedData.means && typeof fetchedData.means.mean_importance === 'number' && typeof fetchedData.means.mean_performance === 'number') {
            meanImp = fetchedData.means.mean_importance;
            meanPerf = fetchedData.means.mean_performance;
          } else {
            // Calculate means if not provided or invalid in fetchedData.means
            const impVals = parsedIpaData.map(d => d.Importance).filter(v => typeof v === 'number');
            const perfVals = parsedIpaData.map(d => d.Performance).filter(v => typeof v === 'number');
            if (impVals.length > 0) meanImp = impVals.reduce((s, v) => s + v, 0) / impVals.length;
            if (perfVals.length > 0) meanPerf = perfVals.reduce((s, v) => s + v, 0) / perfVals.length;
          }

          // Calculate and render quadrant-based charts
          const quadrantStats = calculateQuadrantStats(parsedIpaData);
          if (quadrantStats.totalAttributes > 0) {
            renderQuadrantDistributionPieChart(quadrantStats, chartsContainer);
            renderQuadrantPerformanceBarChart(quadrantStats, chartsContainer);
          }
          // Render the main IPA scatter plot
          renderIpaScatterPlot(parsedIpaData, { mean_importance: meanImp, mean_performance: meanPerf }, chartsContainer);
          // Render individual attribute bar charts
          renderIpaBarCharts(parsedIpaData, chartsContainer);
        }

        // Render other general results if available
        if (fetchedData.results) {
          const resultsTitle = document.createElement('h3');
          resultsTitle.className = 'chart-title';
          resultsTitle.textContent = 'Model Performance Metrics';
          generalResultsContainer.appendChild(resultsTitle);
          const kvFragment = renderKeyValuePairs(fetchedData.results, 'result-item');
          if (kvFragment.hasChildNodes()) generalResultsContainer.appendChild(kvFragment);
        }
        // Render additional images if provided
        if (fetchedData.images) {
          const imagesTitle = document.createElement('h3');
          imagesTitle.className = 'chart-title';
          imagesTitle.textContent = 'Additional Visualizations';
          generalResultsContainer.appendChild(imagesTitle);
          renderImages(fetchedData.images, generalResultsContainer);
        }
        // Render overall mean scores if available
        if (fetchedData.means) {
          const meansTitle = document.createElement('h3');
          meansTitle.className = 'chart-title';
          meansTitle.textContent = 'Overall Mean Scores';
          generalResultsContainer.appendChild(meansTitle);
          const textualMeans = { ...fetchedData.means }; // Clone means object
          // Render mean scores as key-value pairs
          const meanFragment = renderKeyValuePairs(textualMeans, 'mean-item', key => `Mean ${key.replace(/_/g, ' ')}`);
          if (meanFragment.hasChildNodes()) generalResultsContainer.appendChild(meanFragment);
        }

        // Render the AI CRM report section, passing the prepared payload
        renderAiCrmReportSection(resultsDiv, prompt_payload);

        // Make the "Print All Report" button visible
        printAllReportBtn.style.display = 'block';

        // Check if any content was actually rendered to avoid showing an empty page
        let contentRendered = false;
        if (ipaTableContainer.hasChildNodes()) contentRendered = true;
        if (chartsContainer.children.length > 1) contentRendered = true; // Check for more than just a title
        if (generalResultsContainer.hasChildNodes()) contentRendered = true;
        if (resultsDiv.querySelector('.ai-crm-report-outer-container')) { // Check if AI section was added
            contentRendered = true;
        }

        // If no content was rendered (e.g., due to empty or invalid data), display a message
        if (!contentRendered && !(parsedIpaData && parsedIpaData.length > 0)) {
          displayErrorMessage("No data available to display or error in data format.", resultsDiv);
          printAllReportBtn.style.display = 'none'; // Hide print button if there's nothing to print
        }
      })
      .catch(error => {
        // Handle errors from the fetch operation or subsequent processing
        resultsDiv.innerHTML = ''; // Clear results area
        console.error('Fetch operation failed:', error);
        // Display a user-friendly error message
        displayErrorMessage(`An error occurred: ${error.message}. Please check the console for more details and ensure the /get-results endpoint is working correctly.`, resultsDiv);
        printAllReportBtn.style.display = 'none'; // Hide print button on error
      })
      .finally(() => {
        // This block executes regardless of success or failure
        // Re-enable the "Get Results & Charts" button and restore its original text
        getResultsBtn.disabled = false;
        getResultsBtn.textContent = 'Get Results & Charts';
      });
  });

  // Event listener for the "Print All Report" button
  printAllReportBtn.addEventListener('click', () => {
    window.print(); // Trigger the browser's print dialog
  });

});
