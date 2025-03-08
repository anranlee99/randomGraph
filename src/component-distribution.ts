import { Graph } from './graph';
/**
 * Creates and displays a visualization of component size distribution
 * @param demoElement The DOM element to append the chart to
 * @param graph The Graph instance to visualize
 */
export function createComponentDistributionChart(
    demoElement: HTMLElement,
    graph: Graph
): HTMLElement {
    // Remove existing chart if it exists
    const existingChart = document.getElementById('component-distribution-chart');
    if (existingChart) {
        existingChart.remove();
    }

    // Create the chart container
    const chartContainer = document.createElement('div');
    chartContainer.id = 'component-distribution-chart';
    chartContainer.style.position = 'fixed';
    chartContainer.style.bottom = '80px';
    chartContainer.style.left = '20px';
    chartContainer.style.backgroundColor = 'rgba(20, 21, 31, 0.8)';
    chartContainer.style.padding = '15px';
    chartContainer.style.borderRadius = '5px';
    chartContainer.style.color = 'white';
    chartContainer.style.fontFamily = 'Arial, sans-serif';
    chartContainer.style.fontSize = '14px';
    chartContainer.style.zIndex = '100';
    chartContainer.style.width = '300px';
    chartContainer.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';

    // Add a title
    const title = document.createElement('h3');
    title.textContent = 'Component Size Distribution';
    title.style.margin = '0 0 15px 0';
    title.style.borderBottom = '1px solid #555';
    title.style.paddingBottom = '10px';
    chartContainer.appendChild(title);

    // Get component size distribution from the graph
    const sizeCounts = graph.getComponentSizeDistribution();
    const totalNodes = graph.nodeCount;

    // Get all unique sizes and sort them
    const sizes = Object.keys(sizeCounts).map(Number).sort((a, b) => a - b);

    // Create the chart
    const chart = document.createElement('div');
    chart.style.display = 'flex';
    chart.style.flexDirection = 'column';
    chart.style.gap = '5px';
    chart.style.marginBottom = '15px';

    // Determine the maximum count for scaling
    const maxCount = Math.max(...Object.values(sizeCounts));

    // Add bars for each size
    sizes.forEach(size => {
        const count = sizeCounts[size];
        const percentage = (size * count / totalNodes) * 100;

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';

        // Label
        const label = document.createElement('div');
        label.style.width = '60px';
        label.textContent = `Size ${size}:`;
        row.appendChild(label);

        // Bar container
        const barContainer = document.createElement('div');
        barContainer.style.flex = '1';
        barContainer.style.height = '20px';
        barContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        barContainer.style.borderRadius = '3px';
        barContainer.style.overflow = 'hidden';

        // Determine the color based on component type
        let barColor = '#0077ff'; // Default blue for isolated nodes
        if (size > 3) {
            barColor = '#ff5500'; // Orange for giant component
        } else if (size > 1) {
            barColor = '#76f09b'; // Green for small components
        }

        // Bar
        const bar = document.createElement('div');
        bar.style.height = '100%';
        bar.style.width = `${(count / maxCount) * 100}%`;
        bar.style.backgroundColor = barColor;
        bar.style.transition = 'width 0.3s ease-out';
        barContainer.appendChild(bar);
        row.appendChild(barContainer);

        // Count and percentage
        const countDisplay = document.createElement('div');
        countDisplay.style.width = '90px';
        countDisplay.style.textAlign = 'right';
        countDisplay.textContent = `${count} (${percentage.toFixed(1)}%)`;
        row.appendChild(countDisplay);

        chart.appendChild(row);
    });

    chartContainer.appendChild(chart);

    // Add theoretical line if applicable
    const expectedGiantSize = graph.expectedGiantComponentSize;
    if (expectedGiantSize > 0) {
        const theoreticalSection = document.createElement('div');
        theoreticalSection.style.marginTop = '10px';
        theoreticalSection.style.borderTop = '1px solid #555';
        theoreticalSection.style.paddingTop = '10px';

        const theoreticalTitle = document.createElement('div');
        theoreticalTitle.textContent = 'Theoretical Giant Component';
        theoreticalTitle.style.marginBottom = '5px';
        theoreticalTitle.style.fontWeight = 'bold';
        theoreticalSection.appendChild(theoreticalTitle);

        const theoreticalSize = document.createElement('div');
        theoreticalSize.textContent = `Expected Size: ${expectedGiantSize} nodes`;
        theoreticalSection.appendChild(theoreticalSize);

        const theoreticalPercentage = document.createElement('div');
        const percentage = (expectedGiantSize / totalNodes) * 100;
        theoreticalPercentage.textContent = `Expected Percentage: ${percentage.toFixed(1)}%`;
        theoreticalSection.appendChild(theoreticalPercentage);

        chartContainer.appendChild(theoreticalSection);
    }

    // Add a component type distribution section
    const typeCounts = graph.componentTypeCounts;

    const typeSection = document.createElement('div');
    typeSection.style.marginTop = '10px';
    typeSection.style.borderTop = '1px solid #555';
    typeSection.style.paddingTop = '10px';

    const typeTitle = document.createElement('div');
    typeTitle.textContent = 'Component Types';
    typeTitle.style.marginBottom = '5px';
    typeTitle.style.fontWeight = 'bold';
    typeSection.appendChild(typeTitle);

    // Create a small bar chart for component types
    const typeChart = document.createElement('div');
    typeChart.style.display = 'flex';
    typeChart.style.flexDirection = 'column';
    typeChart.style.gap = '5px';

    // Helper function to create type bars
    const createTypeBar = (label: string, count: number, color: string) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';

        // Label
        const typeLabel = document.createElement('div');
        typeLabel.style.width = '90px';
        typeLabel.textContent = `${label}:`;
        row.appendChild(typeLabel);

        // Bar container
        const barContainer = document.createElement('div');
        barContainer.style.flex = '1';
        barContainer.style.height = '16px';
        barContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        barContainer.style.borderRadius = '3px';
        barContainer.style.overflow = 'hidden';

        // Bar (width based on count proportional to total components)
        const totalComponents = graph.componentAnalysis.length;
        const bar = document.createElement('div');
        bar.style.height = '100%';
        bar.style.width = totalComponents > 0 ? `${(count / totalComponents) * 100}%` : '0%';
        bar.style.backgroundColor = color;
        barContainer.appendChild(bar);
        row.appendChild(barContainer);

        // Count
        const countDisplay = document.createElement('div');
        countDisplay.style.width = '40px';
        countDisplay.style.textAlign = 'right';
        countDisplay.textContent = `${count}`;
        row.appendChild(countDisplay);

        return row;
    };

    // Add bars for each type
    typeChart.appendChild(createTypeBar('Isolated', typeCounts.isolated, '#0077ff'));
    typeChart.appendChild(createTypeBar('Trees', typeCounts.tree, '#76f09b'));
    typeChart.appendChild(createTypeBar('Unicyclic', typeCounts.unicyclic, '#f5b862'));
    typeChart.appendChild(createTypeBar('Multi-cyclic', typeCounts.multicyclic, '#ff5500'));

    typeSection.appendChild(typeChart);
    chartContainer.appendChild(typeSection);

    demoElement.appendChild(chartContainer);
    return chartContainer;
}