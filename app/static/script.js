document.addEventListener('DOMContentLoaded', () => {
  const getResultsBtn = document.getElementById('get-results-btn');
  const resultsDiv = document.getElementById('results');
  const printAllReportBtn = document.getElementById('print-all-report-btn');
  const SVG_NS = "http://www.w3.org/2000/svg";

  const QUADRANT_COLORS = {
    "Concentrate Here": "#d32f2f",
    "Keep Up the Good Work": "#4caf50", 
    "Good Work": "#4caf50", // Alias for Keep Up the Good Work
    "Low Priority": "#ff9800",
    "Possible Overkill": "#2196f3",
    "Default": "#757575"
  };


  // Helper function to display error messages
  function displayErrorMessage(message, container) {
    container.innerHTML = ''; 
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
  }

  // Helper function to render key-value pairs
  function renderKeyValuePairs(items, itemClassName, keyDisplayNameTransform = key => key.replace(/_/g, ' ')) {
    const fragment = document.createDocumentFragment();
    if (items && typeof items === 'object' && Object.keys(items).length > 0) {
      for (const [key, value] of Object.entries(items)) {
        const div = document.createElement('div');
        div.classList.add(itemClassName);
        div.innerHTML = `<strong>${keyDisplayNameTransform(key)}:</strong> ${value}`;
        fragment.appendChild(div);
      }
    }
    return fragment;
  }

  // Helper function to render images
  function renderImages(imagesData, container) { // Added container
    if (imagesData && typeof imagesData === 'object' && Object.keys(imagesData).length > 0) {
      for (const [key, imagePath] of Object.entries(imagesData)) {
        const imgTitle = document.createElement('h4'); // Add a title for the image
        imgTitle.className = 'sub-chart-title'; // Reuse style
        imgTitle.textContent = key.replace(/_/g, ' ');
        imgTitle.style.textAlign = 'center'; // Center image title
        container.appendChild(imgTitle);

        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = key.replace(/_/g, ' ');
        container.appendChild(img);
      }
    }
  }

  // Renders IPA table into a container AND returns parsed data
  function renderIpaTable(ipaString, container) {
    // container.innerHTML = ''; // Clearing is done by the caller now
    if (!ipaString) return null;
    try {
      const parsedIpa = JSON.parse(ipaString).map(item => ({
        ...item, 
        Quadrant: item.Quadrant === "Good Work" ? "Keep Up the Good Work" : item.Quadrant 
      }));
      if (!Array.isArray(parsedIpa) || parsedIpa.length === 0 ||
          typeof parsedIpa[0] !== 'object' || parsedIpa[0] === null ||
          Object.keys(parsedIpa[0]).length === 0) {
        console.warn('IPA data is not in the expected format.'); return null;
      }
      const tableTitle = document.createElement('h3');
      tableTitle.textContent = 'Importance-Performance Analysis Table';
      tableTitle.className = 'chart-title'; // Main title for this section
      container.appendChild(tableTitle);
      const table = document.createElement('table');
      table.classList.add('ipa-table');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      const headers = Object.keys(parsedIpa[0]);
      const headerRow = document.createElement('tr');
      headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText.replace(/_/g, ' '); headerRow.appendChild(th);
      });
      thead.appendChild(headerRow); table.appendChild(thead);
      parsedIpa.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const row = document.createElement('tr');
          headers.forEach(headerKey => {
            const td = document.createElement('td');
            const value = item[headerKey];
            td.textContent = (value !== undefined && value !== null) ? String(value) : '';
            row.appendChild(td);
          });
          if (item.Quadrant === "Concentrate Here") { row.classList.add('highlight-row'); }
          tbody.appendChild(row);
        }
      });
      table.appendChild(tbody); container.appendChild(table);
      return parsedIpa; 
    } catch (e) {
      console.error('Error parsing or rendering IPA table:', e);
      displayErrorMessage('Error displaying IPA table.', container); return null;
    }
  }

  // Renders IPA Scatter Plot
  function renderIpaScatterPlot(ipaData, means, container) {
    if (!ipaData || ipaData.length === 0) return;
    const plotTitle = document.createElement('h4'); // Changed to h4 for sub-title
    plotTitle.textContent = 'IPA Scatter Plot (Importance vs. Performance)';
    plotTitle.className = 'sub-chart-title'; container.appendChild(plotTitle); 
    const svg = document.createElementNS(SVG_NS, "svg");
    const containerWidth = container.offsetWidth > 0 ? container.offsetWidth : 600; 
    const svgWidth = Math.min(500, containerWidth - 20); 
    const svgHeight = svgWidth * 0.8; 
    const margin = { top: 30, right: 20, bottom: 40, left: 40 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute("class", "scatter-plot-svg"); svg.style.fontFamily = 'Roboto, Arial, sans-serif';
    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${margin.left},${margin.top})`); svg.appendChild(g);
    const perfScale = val => Math.max(0, Math.min(width, (val - 1) / 4 * width)); 
    const impScale = val => Math.max(0, Math.min(height, height - (val - 1) / 4 * height)); 
    const xAxis = document.createElementNS(SVG_NS, "line");
    xAxis.setAttribute("x1", "0"); xAxis.setAttribute("y1", String(height));
    xAxis.setAttribute("x2", String(width)); xAxis.setAttribute("y2", String(height));
    xAxis.setAttribute("stroke", "#333"); g.appendChild(xAxis);
    const xAxisLabel = document.createElementNS(SVG_NS, "text");
    xAxisLabel.textContent = "Performance";
    xAxisLabel.setAttribute("x", String(width / 2)); xAxisLabel.setAttribute("y", String(height + margin.bottom - 10));
    xAxisLabel.setAttribute("text-anchor", "middle"); xAxisLabel.setAttribute("class", "axis-label"); g.appendChild(xAxisLabel);
    const yAxis = document.createElementNS(SVG_NS, "line");
    yAxis.setAttribute("x1", "0"); yAxis.setAttribute("y1", "0");
    yAxis.setAttribute("x2", "0"); yAxis.setAttribute("y2", String(height));
    yAxis.setAttribute("stroke", "#333"); g.appendChild(yAxis);
    const yAxisLabel = document.createElementNS(SVG_NS, "text");
    yAxisLabel.textContent = "Importance";
    yAxisLabel.setAttribute("transform", `translate(${-margin.left + 15}, ${height/2}) rotate(-90)`);
    yAxisLabel.setAttribute("text-anchor", "middle"); yAxisLabel.setAttribute("class", "axis-label"); g.appendChild(yAxisLabel);
    for (let i = 1; i <= 5; i++) {
        const xTick = document.createElementNS(SVG_NS, "line");
        xTick.setAttribute("x1", String(perfScale(i))); xTick.setAttribute("y1", String(height));
        xTick.setAttribute("x2", String(perfScale(i))); xTick.setAttribute("y2", String(height + 5));
        xTick.setAttribute("stroke", "#333"); g.appendChild(xTick);
        const xTickLabel = document.createElementNS(SVG_NS, "text");
        xTickLabel.textContent = String(i);
        xTickLabel.setAttribute("x", String(perfScale(i))); xTickLabel.setAttribute("y", String(height + 15)); 
        xTickLabel.setAttribute("text-anchor", "middle"); xTickLabel.style.fontSize = "10px"; g.appendChild(xTickLabel);
        const yTick = document.createElementNS(SVG_NS, "line");
        yTick.setAttribute("x1", "-5"); yTick.setAttribute("y1", String(impScale(i)));
        yTick.setAttribute("x2", "0"); yTick.setAttribute("y2", String(impScale(i)));
        yTick.setAttribute("stroke", "#333"); g.appendChild(yTick);
        const yTickLabel = document.createElementNS(SVG_NS, "text");
        yTickLabel.textContent = String(i);
        yTickLabel.setAttribute("x", "-12");  
        yTickLabel.setAttribute("y", String(impScale(i) + 3)); 
        yTickLabel.setAttribute("text-anchor", "middle"); yTickLabel.style.fontSize = "10px"; g.appendChild(yTickLabel);
    }
    const meanPerfX = perfScale(means.mean_performance);
    const meanImpY = impScale(means.mean_importance);
    const perfLine = document.createElementNS(SVG_NS, "line");
    perfLine.setAttribute("x1", String(meanPerfX)); perfLine.setAttribute("y1", "0");
    perfLine.setAttribute("x2", String(meanPerfX)); perfLine.setAttribute("y2", String(height));
    perfLine.setAttribute("stroke", "#aaa"); perfLine.setAttribute("stroke-dasharray", "4 2"); g.appendChild(perfLine);
    const impLine = document.createElementNS(SVG_NS, "line");
    impLine.setAttribute("x1", "0"); impLine.setAttribute("y1", String(meanImpY));
    impLine.setAttribute("x2", String(width)); impLine.setAttribute("y2", String(meanImpY));
    impLine.setAttribute("stroke", "#aaa"); impLine.setAttribute("stroke-dasharray", "4 2"); g.appendChild(impLine);
    const qLabels = [
        { text: "Concentrate Here", x: meanPerfX * 0.4, y: meanImpY * 0.4, color: QUADRANT_COLORS["Concentrate Here"]},
        { text: "Good Work", x: meanPerfX + (width - meanPerfX) * 0.6, y: meanImpY * 0.4, color: QUADRANT_COLORS["Keep Up the Good Work"]},
        { text: "Low Priority", x: meanPerfX * 0.4, y: meanImpY + (height - meanImpY) * 0.6, color: QUADRANT_COLORS["Low Priority"]},
        { text: "Overkill", x: meanPerfX + (width - meanPerfX) * 0.6, y: meanImpY + (height - meanImpY) * 0.6, color: QUADRANT_COLORS["Possible Overkill"]}
    ];
    qLabels.forEach(ql => {
        const qText = document.createElementNS(SVG_NS, "text");
        qText.textContent = ql.text;
        qText.setAttribute("x", String(ql.x)); qText.setAttribute("y", String(ql.y));
        qText.setAttribute("text-anchor", "middle"); qText.setAttribute("class", "quadrant-label");
        qText.style.fill = ql.color; qText.style.opacity = "0.8"; g.appendChild(qText);
    });
    ipaData.forEach(item => {
      const cx = perfScale(item.Performance); const cy = impScale(item.Importance);
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", String(cx)); circle.setAttribute("cy", String(cy)); circle.setAttribute("r", "5"); 
      circle.setAttribute("fill", QUADRANT_COLORS[item.Quadrant] || QUADRANT_COLORS["Default"]); 
      circle.setAttribute("opacity", "0.8");
      const titleElement = document.createElementNS(SVG_NS, "title"); 
      titleElement.textContent = `${item.Attribute}\nImp: ${item.Importance}, Perf: ${item.Performance}\n${item.Quadrant}`;
      circle.appendChild(titleElement); g.appendChild(circle);
    });
    container.appendChild(svg);
  }

  // Renders IPA Bar Charts for individual attributes
  function renderIpaBarCharts(ipaData, container) {
    if (!ipaData || ipaData.length === 0) return;
    const barChartTitle = document.createElement('h4'); // Changed to h4
    barChartTitle.textContent = 'Attribute Importance & Performance Scores';
    barChartTitle.className = 'sub-chart-title'; container.appendChild(barChartTitle); 
    const barChartContainer = document.createElement('div');
    barChartContainer.className = 'bar-chart-svg-container';
    const barHeight = 18; const valueScale = val => Math.max(0, (val / 5) * 180); 
    const labelWidth = 180; const barMaxWidth = 180; const spacing = 4; 
    const itemHeight = (barHeight + spacing) * 2 + 18; 
    ipaData.forEach(item => {
        const itemDiv = document.createElement('div'); itemDiv.className = 'bar-chart-item';
        const svg = document.createElementNS(SVG_NS, "svg");
        const svgWidth = labelWidth + barMaxWidth + 60; const svgHeight = itemHeight;
        svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`); svg.style.fontFamily = 'Roboto, Arial, sans-serif';
        const attrText = document.createElementNS(SVG_NS, "text");
        attrText.textContent = item.Attribute.length > 25 ? item.Attribute.substring(0,22) + "..." : item.Attribute; 
        attrText.setAttribute("x", "0"); attrText.setAttribute("y", "12"); 
        attrText.style.fontWeight = "500"; attrText.style.fontSize = "11px"; svg.appendChild(attrText);
        const impBar = document.createElementNS(SVG_NS, "rect");
        impBar.setAttribute("x", String(labelWidth)); impBar.setAttribute("y", String(18 + spacing));
        impBar.setAttribute("width", String(valueScale(item.Importance))); impBar.setAttribute("height", String(barHeight));
        impBar.setAttribute("fill", "#2196f3"); svg.appendChild(impBar);
        const impText = document.createElementNS(SVG_NS, "text");
        impText.textContent = `I: ${typeof item.Importance === 'number' ? item.Importance.toFixed(2) : 'N/A'}`;
        impText.setAttribute("x", String(labelWidth + valueScale(item.Importance) + 5));
        impText.setAttribute("y", String(18 + spacing + barHeight / 2 + 4)); impText.style.fontSize = "10px"; svg.appendChild(impText);
        const perfBar = document.createElementNS(SVG_NS, "rect");
        perfBar.setAttribute("x", String(labelWidth)); perfBar.setAttribute("y", String(18 + spacing + barHeight + spacing));
        perfBar.setAttribute("width", String(valueScale(item.Performance))); perfBar.setAttribute("height", String(barHeight));
        perfBar.setAttribute("fill", "#ff9800"); svg.appendChild(perfBar);
        const perfText = document.createElementNS(SVG_NS, "text");
        perfText.textContent = `P: ${typeof item.Performance === 'number' ? item.Performance.toFixed(2) : 'N/A'}`;
        perfText.setAttribute("x", String(labelWidth + valueScale(item.Performance) + 5));
        perfText.setAttribute("y", String(18 + spacing + barHeight + spacing + barHeight/2 + 4)); perfText.style.fontSize = "10px"; svg.appendChild(perfText);
        itemDiv.appendChild(svg); barChartContainer.appendChild(itemDiv);
    });
    container.appendChild(barChartContainer);
  }

  // Calculates quadrant statistics
  function calculateQuadrantStats(ipaData) {
    const stats = {
        "Concentrate Here": { count: 0, totalImportance: 0, totalPerformance: 0 },
        "Keep Up the Good Work": { count: 0, totalImportance: 0, totalPerformance: 0 },
        "Low Priority": { count: 0, totalImportance: 0, totalPerformance: 0 },
        "Possible Overkill": { count: 0, totalImportance: 0, totalPerformance: 0 },
    };
    let totalAttributes = 0;
    ipaData.forEach(item => {
        const quadrantName = item.Quadrant === "Good Work" ? "Keep Up the Good Work" : item.Quadrant;
        if (stats[quadrantName]) {
            stats[quadrantName].count++;
            stats[quadrantName].totalImportance += (typeof item.Importance === 'number' ? item.Importance : 0);
            stats[quadrantName].totalPerformance += (typeof item.Performance === 'number' ? item.Performance : 0);
            totalAttributes++;
        }
    });
    for (const q in stats) {
        stats[q].avgImportance = stats[q].count > 0 ? (stats[q].totalImportance / stats[q].count) : 0;
        stats[q].avgPerformance = stats[q].count > 0 ? (stats[q].totalPerformance / stats[q].count) : 0;
        stats[q].percentage = totalAttributes > 0 ? (stats[q].count / totalAttributes) * 100 : 0;
    }
    stats.totalAttributes = totalAttributes;
    return stats;
  }

  // Renders Quadrant Distribution Pie Chart
  function renderQuadrantDistributionPieChart(quadrantStats, container) {
    const title = document.createElement('h4'); // Changed to h4
    title.textContent = 'Attribute Distribution by Quadrant';
    title.className = 'sub-chart-title';
    container.appendChild(title);

    const svg = document.createElementNS(SVG_NS, "svg");
    const svgSize = Math.min(300, container.offsetWidth > 0 ? container.offsetWidth - 20 : 280);
    const radius = svgSize / 2 * 0.8; 
    const centerX = svgSize / 2;
    const centerY = svgSize / 2;
    svg.setAttribute("viewBox", `0 0 ${svgSize} ${svgSize}`);
    svg.setAttribute("class", "pie-chart-svg");

    let startAngle = -90; 
    const quadrants = ["Concentrate Here", "Keep Up the Good Work", "Low Priority", "Possible Overkill"];
    
    const legendContainer = document.createElement('div');
    legendContainer.className = 'chart-legend';

    quadrants.forEach(qName => {
        if (!quadrantStats[qName] || quadrantStats[qName].count === 0) return;

        const percentage = quadrantStats[qName].percentage;
        const sliceAngle = (percentage / 100) * 360;
        const endAngle = startAngle + sliceAngle;

        const x1 = centerX + radius * Math.cos(startAngle * Math.PI / 180);
        const y1 = centerY + radius * Math.sin(startAngle * Math.PI / 180);
        const x2 = centerX + radius * Math.cos(endAngle * Math.PI / 180);
        const y2 = centerY + radius * Math.sin(endAngle * Math.PI / 180);

        const largeArcFlag = sliceAngle > 180 ? 1 : 0;
        const pathData = `M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
        
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", QUADRANT_COLORS[qName] || QUADRANT_COLORS["Default"]);
        
        const titleElement = document.createElementNS(SVG_NS, "title");
        titleElement.textContent = `${qName}: ${quadrantStats[qName].count} attributes (${percentage.toFixed(1)}%)`;
        path.appendChild(titleElement);
        svg.appendChild(path);
        
        const midAngleRad = (startAngle + sliceAngle / 2) * Math.PI / 180;
        if (percentage > 3) { 
            const labelRadius = radius * 0.7; 
            const labelX = centerX + labelRadius * Math.cos(midAngleRad);
            const labelY = centerY + labelRadius * Math.sin(midAngleRad);
            const textLabel = document.createElementNS(SVG_NS, "text");
            textLabel.setAttribute("x", String(labelX));
            textLabel.setAttribute("y", String(labelY + 4)); 
            textLabel.setAttribute("text-anchor", "middle");
            textLabel.style.fontSize = "10px";
            textLabel.style.fill = "#fff"; 
            textLabel.textContent = `${percentage.toFixed(0)}%`;
            svg.appendChild(textLabel);
        }
        startAngle = endAngle;

        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color-box';
        colorBox.style.backgroundColor = QUADRANT_COLORS[qName] || QUADRANT_COLORS["Default"];
        legendItem.appendChild(colorBox);
        legendItem.appendChild(document.createTextNode(`${qName} (${quadrantStats[qName].count})`));
        legendContainer.appendChild(legendItem);
    });
    container.appendChild(svg);
    container.appendChild(legendContainer);
  }

  // Renders Average Scores per Quadrant Bar Chart
  function renderQuadrantPerformanceBarChart(quadrantStats, container) {
    const title = document.createElement('h4'); // Changed to h4
    title.textContent = 'Average Scores by Quadrant';
    title.className = 'sub-chart-title';
    container.appendChild(title);

    const svg = document.createElementNS(SVG_NS, "svg");
    const svgWidth = Math.min(600, container.offsetWidth > 0 ? container.offsetWidth - 20 : 580);
    const svgHeight = 330; 
    const margin = { top: 20, right: 20, bottom: 85, left: 40 }; 
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute("class", "quadrant-bar-chart-svg");

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("transform", `translate(${margin.left},${margin.top})`);
    svg.appendChild(g);

    const quadrants = Object.keys(quadrantStats).filter(q => q !== "totalAttributes");
    const barGroupWidth = width / quadrants.length;
    const barPadding = 0.3; 
    const barWidth = (barGroupWidth * (1 - barPadding)) / 2; 

    const yScale = val => height - (val / 5 * height); 

    for (let i = 0; i <= 5; i++) {
        const y = yScale(i);
        const gridLine = document.createElementNS(SVG_NS, "line");
        gridLine.setAttribute("x1", "0"); gridLine.setAttribute("y1", String(y));
        gridLine.setAttribute("x2", String(width)); gridLine.setAttribute("y2", String(y));
        gridLine.setAttribute("stroke", "#e0e0e0");
        gridLine.setAttribute("stroke-dasharray", i===0 ? "none" : "2 2"); 
        g.appendChild(gridLine);
        const yLabel = document.createElementNS(SVG_NS, "text");
        yLabel.textContent = String(i);
        yLabel.setAttribute("x", "-8"); yLabel.setAttribute("y", String(y + 4));
        yLabel.setAttribute("text-anchor", "end"); yLabel.style.fontSize = "10px";
        g.appendChild(yLabel);
    }
    const yAxisTitle = document.createElementNS(SVG_NS, "text");
    yAxisTitle.textContent = "Avg. Score";
    yAxisTitle.setAttribute("transform", `translate(${-margin.left + 12}, ${height/2}) rotate(-90)`);
    yAxisTitle.setAttribute("text-anchor", "middle"); yAxisTitle.setAttribute("class", "axis-label");
    g.appendChild(yAxisTitle);

    quadrants.forEach((qName, index) => {
        if (!quadrantStats[qName] || quadrantStats[qName].count === 0) return;
        const groupX = index * barGroupWidth + (barGroupWidth * barPadding / 2);

        const impBar = document.createElementNS(SVG_NS, "rect");
        impBar.setAttribute("x", String(groupX));
        impBar.setAttribute("y", String(yScale(quadrantStats[qName].avgImportance)));
        impBar.setAttribute("width", String(barWidth));
        impBar.setAttribute("height", String(height - yScale(quadrantStats[qName].avgImportance)));
        impBar.setAttribute("fill", "#2196f3"); 
        const impTitle = document.createElementNS(SVG_NS, "title");
        impTitle.textContent = `${qName} - Avg. Importance: ${quadrantStats[qName].avgImportance.toFixed(2)}`;
        impBar.appendChild(impTitle);
        g.appendChild(impBar);

        const perfBar = document.createElementNS(SVG_NS, "rect");
        perfBar.setAttribute("x", String(groupX + barWidth));
        perfBar.setAttribute("y", String(yScale(quadrantStats[qName].avgPerformance)));
        perfBar.setAttribute("width", String(barWidth));
        perfBar.setAttribute("height", String(height - yScale(quadrantStats[qName].avgPerformance)));
        perfBar.setAttribute("fill", "#ff9800"); 
        const perfTitle = document.createElementNS(SVG_NS, "title");
        perfTitle.textContent = `${qName} - Avg. Performance: ${quadrantStats[qName].avgPerformance.toFixed(2)}`;
        perfBar.appendChild(perfTitle);
        g.appendChild(perfBar);

        const xLabel = document.createElementNS(SVG_NS, "text");
        xLabel.setAttribute("x", String(groupX + barWidth)); 
        xLabel.setAttribute("y", String(height + 15)); 
        xLabel.setAttribute("text-anchor", "middle");
        xLabel.style.fontSize = "8.5px"; 

        const lines = qName.split(' ');
        lines.forEach((line, i) => {
            const tspan = document.createElementNS(SVG_NS, "tspan");
            tspan.setAttribute("x", String(groupX + barWidth)); 
            tspan.setAttribute("dy", i === 0 ? 0 : "1.2em"); 
            tspan.textContent = line;
            xLabel.appendChild(tspan);
        });
        g.appendChild(xLabel);
    });
    
    const legend = document.createElementNS(SVG_NS, "g");
    legend.setAttribute("transform", `translate(${width - 150}, ${-15})`); 
    const impLegendRect = document.createElementNS(SVG_NS, "rect");
    impLegendRect.setAttribute("x", "0"); impLegendRect.setAttribute("y", "0");
    impLegendRect.setAttribute("width", "10"); impLegendRect.setAttribute("height", "10");
    impLegendRect.setAttribute("fill", "#2196f3");
    legend.appendChild(impLegendRect);
    const impLegendText = document.createElementNS(SVG_NS, "text");
    impLegendText.textContent = "Avg. Importance";
    impLegendText.setAttribute("x", "15"); impLegendText.setAttribute("y", "9");
    impLegendText.style.fontSize = "10px";
    legend.appendChild(impLegendText);

    const perfLegendRect = document.createElementNS(SVG_NS, "rect");
    perfLegendRect.setAttribute("x", "100"); perfLegendRect.setAttribute("y", "0");
    perfLegendRect.setAttribute("width", "10"); perfLegendRect.setAttribute("height", "10");
    perfLegendRect.setAttribute("fill", "#ff9800");
    legend.appendChild(perfLegendRect);
    const perfLegendText = document.createElementNS(SVG_NS, "text");
    perfLegendText.textContent = "Avg. Performance";
    perfLegendText.setAttribute("x", "115"); perfLegendText.setAttribute("y", "9");
    perfLegendText.style.fontSize = "10px";
    legend.appendChild(perfLegendText);
    g.appendChild(legend);

    container.appendChild(svg);
  }


  // Renders AI-Powered CRM Report Section
  function renderAiCrmReportSection(container) {
    const aiReportContainer = document.createElement('div');
    aiReportContainer.className = 'ai-crm-report-container';
    const aiReportTitle = document.createElement('h3');
    aiReportTitle.className = 'chart-title'; // Reuse for main section title
    aiReportTitle.textContent = 'AI-Powered CRM Report';
    aiReportTitle.style.color = '#2e7d32'; 
    aiReportContainer.appendChild(aiReportTitle);
    const fetchAiButton = document.createElement('button');
    fetchAiButton.id = 'fetch-ai-report-btn';
    fetchAiButton.textContent = 'Fetch AI Report';
    fetchAiButton.className = 'ai-report-button action-button'; 
    fetchAiButton.style.width = 'auto'; 
    fetchAiButton.style.margin = '0 auto 20px auto'; 
    aiReportContainer.appendChild(fetchAiButton);
    const aiReportContentDiv = document.createElement('div');
    aiReportContentDiv.id = 'ai-report-content';
    aiReportContentDiv.innerHTML = '<p>Click "Fetch AI Report" to generate insights.</p>'; 
    aiReportContainer.appendChild(aiReportContentDiv);
    const aiReportFeedback = document.createElement('p');
    aiReportFeedback.id = 'ai-report-feedback';
    aiReportContainer.appendChild(aiReportFeedback);

    fetchAiButton.addEventListener('click', () => {
        fetchAiButton.disabled = true;
        fetchAiButton.textContent = 'Fetching AI Insights...';
        aiReportFeedback.textContent = 'Simulating AI analysis... please wait.';
        aiReportContentDiv.innerHTML = '<p class="loading-message" style="color: #2e7d32;">Generating report...</p>';
        setTimeout(() => {
            aiReportContentDiv.innerHTML = `
                <div class="ai-crm-section"><h4>Key Customer Insights (AI Generated)</h4><p>Based on the survey data and sentiment analysis (simulated):</p><ul><li>Customers who rated "Food and drink" highly also show strong loyalty indicators.</li><li>There's a notable correlation between dissatisfaction with "Inflight wifi service" and lower overall satisfaction scores for business travelers.</li><li>Positive comments frequently mention "Online boarding" and "Seat comfort" when overall satisfaction is high.</li></ul></div>
                <div class="ai-crm-section"><h4>Recommended Actions (AI Generated)</h4><ul><li><strong>For "Food and drink":</strong> Consider personalized offers or loyalty rewards for customers who positively reviewed this.</li><li><strong>For "Inflight wifi service":</strong> Prioritize improvements for business routes. Offer complimentary access to high-value segments.</li><li><strong>Marketing:</strong> Highlight ease of "Online boarding" and "Seat comfort" in upcoming campaigns.</li></ul></div>
                <div class="ai-crm-section"><h4>Predicted Churn Risk (AI Generated)</h4><p>Customers expressing low satisfaction with multiple "Concentrate Here" or "Low Priority" items (especially if Importance is high for them personally) show an elevated (simulated) churn risk of 15-20% in the next quarter. Proactive engagement is recommended.</p></div>
            `;
            fetchAiButton.disabled = false;
            fetchAiButton.textContent = 'Re-fetch AI Report';
            aiReportFeedback.textContent = 'AI Report generated successfully (simulated).';
            setTimeout(() => { aiReportFeedback.textContent = ''; }, 3000);
        }, 2500); 
    });
    container.appendChild(aiReportContainer);
  }


  getResultsBtn.addEventListener('click', function() {
    getResultsBtn.disabled = true;
    getResultsBtn.textContent = 'Loading...';
    resultsDiv.innerHTML = ''; // Clear previous results
    
    const loadingMsgDiv = document.createElement('div');
    loadingMsgDiv.classList.add('loading-message');
    loadingMsgDiv.textContent = "Fetching results, please wait...";
    resultsDiv.appendChild(loadingMsgDiv);

    fetch('/get-results')
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            let detail = "";
            if (text) { try { const jsonError = JSON.parse(text); detail = jsonError.error || text; } catch (e) { detail = text; } }
            throw new Error(`Server error: ${response.status}${detail ? ` - ${detail}` : ` - ${response.statusText}`}`);
          });
        }
        return response.json();
      })
      .then(data => {
        resultsDiv.innerHTML = ''; // Clear loading message
        
        // Create dedicated containers for each section
        const ipaTableContainer = document.createElement('div');
        ipaTableContainer.className = 'ipa-table-container';
        resultsDiv.appendChild(ipaTableContainer);

        const chartsContainer = document.createElement('div');
        chartsContainer.className = 'charts-container';
        resultsDiv.appendChild(chartsContainer);
        
        const generalResultsContainer = document.createElement('div');
        generalResultsContainer.className = 'general-results-container';
        resultsDiv.appendChild(generalResultsContainer);
        
        const aiCrmReportContainer = document.createElement('div'); 
        // aiCrmReportContainer will be appended by its render function if needed
        // resultsDiv.appendChild(aiCrmReportContainer); // No, let renderAiCrmReportSection append it


        const parsedIpaData = renderIpaTable(data.ipa, ipaTableContainer);

        if (parsedIpaData && parsedIpaData.length > 0) {
          const mainChartTitle = document.createElement('h3'); 
          mainChartTitle.className = 'chart-title';
          mainChartTitle.textContent = 'Survey Visualizations';
          chartsContainer.appendChild(mainChartTitle); 

          let meanImp = 3.5; let meanPerf = 3.5; 
          if (data.means && typeof data.means.mean_importance === 'number' && typeof data.means.mean_performance === 'number') {
              meanImp = data.means.mean_importance; meanPerf = data.means.mean_performance;
          } else { 
              const impVals = parsedIpaData.map(d => d.Importance).filter(v => typeof v === 'number');
              const perfVals = parsedIpaData.map(d => d.Performance).filter(v => typeof v === 'number');
              if (impVals.length > 0) meanImp = impVals.reduce((s, v) => s + v, 0) / impVals.length;
              if (perfVals.length > 0) meanPerf = perfVals.reduce((s, v) => s + v, 0) / perfVals.length;
          }
          
          const quadrantStats = calculateQuadrantStats(parsedIpaData);
          if (quadrantStats.totalAttributes > 0) {
            renderQuadrantDistributionPieChart(quadrantStats, chartsContainer);
            renderQuadrantPerformanceBarChart(quadrantStats, chartsContainer);
          }
          renderIpaScatterPlot(parsedIpaData, { mean_importance: meanImp, mean_performance: meanPerf }, chartsContainer);
          renderIpaBarCharts(parsedIpaData, chartsContainer); 
        }

        if (data.results) {
            const kvFragment = renderKeyValuePairs(data.results, 'result');
            if (kvFragment.hasChildNodes()) generalResultsContainer.appendChild(kvFragment);
        }
        if (data.images) { 
            renderImages(data.images, generalResultsContainer);
        }
        if (data.means) {
            const textualMeans = {...data.means};
            const meanFragment = renderKeyValuePairs(textualMeans, 'mean', key => `Mean ${key.replace(/_/g, ' ')}`);
            if (meanFragment.hasChildNodes()) generalResultsContainer.appendChild(meanFragment);
        }
        
        renderAiCrmReportSection(resultsDiv); // Render AI section directly into resultsDiv, it will create its own container

        printAllReportBtn.style.display = 'block'; 

        let contentRendered = false;
        if (ipaTableContainer.hasChildNodes()) contentRendered = true;
        if (chartsContainer.children.length > 1) contentRendered = true; 
        if (generalResultsContainer.hasChildNodes()) contentRendered = true;
        
        const aiContent = resultsDiv.querySelector('#ai-report-content');
        if (aiContent && aiContent.innerHTML !== '<p>Click "Fetch AI Report" to generate insights.</p>' && aiContent.children.length > 0) {
            contentRendered = true;
        }


        if (!contentRendered) { 
          displayErrorMessage("No data available to display or error in data format.", resultsDiv);
          printAllReportBtn.style.display = 'none'; 
        }
      })
      .catch(error => {
        resultsDiv.innerHTML = ''; 
        console.error('Fetch operation failed:', error);
        displayErrorMessage(`An error occurred: ${error.message}. Please check the console for more details and ensure the /get-results endpoint is working correctly.`, resultsDiv);
        printAllReportBtn.style.display = 'none'; 
      })
      .finally(() => {
        getResultsBtn.disabled = false;
        getResultsBtn.textContent = 'Get Results & Charts';
      });
  });

  printAllReportBtn.addEventListener('click', () => {
    window.print();
  });

});
