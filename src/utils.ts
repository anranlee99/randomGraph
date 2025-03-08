import * as Matter from 'matter-js';
import { Graph } from './graph';

// Store the autorun interval ID globally for proper toggling
let autoRunIntervalId: number | null = null;
let isAutoRunning = false;

/**
 * Color scheme for components
 * @param componentId The ID of the component to color
 * @param graph The Graph instance to get component information from
 * @returns A CSS color string for the component
 */
export function getComponentColor(
    componentId: number,
    graph: Graph
): string {
    const analysis = graph.componentAnalysis;

    if (componentId < 0 || componentId >= analysis.length) {
        return '#0077ff'; // Default blue for unknown components
    }

    const component = analysis[componentId];

    // If this is the giant component, make it stand out
    if (component.vertices === graph.giantComponentSize && component.vertices > 3) {
        return '#ff5500'; // Orange for giant component
    } else if (component.isIsolated) {
        return '#0077ff'; // Blue for isolated nodes
    } else if (component.isTree) {
        return '#76f09b'; // Green for trees
    } else if (component.isUnicyclic) {
        return '#f5b862'; // Yellow/orange for unicyclic
    } else {
        return '#ff5500'; // Orange/red for multicyclic
    }
}

/**
 * Toggle fullscreen mode for the demo element
 * @param demoElement The DOM element to toggle fullscreen for
 */
export function toggleFullscreen(demoElement: HTMLElement): void {
    const fullscreenElement =
        document.fullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).webkitFullscreenElement;

    if (!fullscreenElement) {
        if (demoElement.requestFullscreen) {
            demoElement.requestFullscreen();
        } else if ((demoElement as any).mozRequestFullScreen) {
            (demoElement as any).mozRequestFullScreen();
        } else if ((demoElement as any).webkitRequestFullscreen) {
            //@ts-ignore
            (demoElement as any).webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
        document.body.classList.add('matter-is-fullscreen');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        }
        document.body.classList.remove('matter-is-fullscreen');
    }
}

/**
 * Create a stats panel to display graph metrics
 * @param demoElement The DOM element to append the stats panel to
 * @returns The created stats panel element
 */
export function createStatsPanel(demoElement: HTMLElement): HTMLElement {
    // Remove existing stats panel if it exists
    const existingPanel = document.getElementById('stats-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    const statsPanel = document.createElement('div');
    statsPanel.id = 'stats-panel';
    statsPanel.style.position = 'fixed';
    statsPanel.style.top = '60px';
    statsPanel.style.right = '20px';
    statsPanel.style.backgroundColor = 'rgba(20, 21, 31, 0.8)';
    statsPanel.style.padding = '15px';
    statsPanel.style.borderRadius = '5px';
    statsPanel.style.color = 'white';
    statsPanel.style.fontFamily = 'Arial, sans-serif';
    statsPanel.style.fontSize = '14px';
    statsPanel.style.zIndex = '100';
    statsPanel.style.width = '250px';
    statsPanel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';

    demoElement.appendChild(statsPanel);
    return statsPanel;
}

/**
 * Shows a notification when a giant component is formed
 * @param demoElement The DOM element to append the notification to
 */
export function showGiantComponentNotification(demoElement: HTMLElement): void {
    // Remove existing notification if it exists
    const existingNotification = document.getElementById('giant-component-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'giant-component-notification';
    notification.className = 'giant-component-notification';
    notification.textContent = 'Giant Component Threshold Reached!';

    demoElement.appendChild(notification);

    // Remove the notification after animation completes
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

/**
 * Stop any existing autorun
 */
export function stopAutoRun(): void {
    if (autoRunIntervalId !== null) {
        clearInterval(autoRunIntervalId);
        autoRunIntervalId = null;
        isAutoRunning = false;
    }
}

/**
 * Show cycle details in a modal when a cycle is highlighted
 * @param demoElement The DOM element to append the modal to
 * @param cycle The cycle to display details for
 */
export function showCycleDetails(demoElement: HTMLElement, cycle: number[]): void {
    // Remove existing modal if it exists
    const existingModal = document.getElementById('cycle-details-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'cycle-details-modal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.backgroundColor = 'rgba(20, 21, 31, 0.9)';
    modal.style.padding = '20px';
    modal.style.borderRadius = '5px';
    modal.style.color = 'white';
    modal.style.zIndex = '200';
    modal.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';

    const title = document.createElement('h3');
    title.textContent = 'Cycle Details';
    title.style.marginTop = '0';
    title.style.borderBottom = '1px solid #555';
    title.style.paddingBottom = '10px';

    const cycleNodes = document.createElement('p');
    cycleNodes.textContent = `Nodes: ${cycle.join(' → ')} → ${cycle[0]}`;

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '5px 10px';
    closeButton.style.backgroundColor = '#0077ff';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.borderRadius = '3px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginTop = '10px';

    closeButton.addEventListener('click', () => {
        modal.remove();
    });

    modal.appendChild(title);
    modal.appendChild(cycleNodes);
    modal.appendChild(closeButton);

    demoElement.appendChild(modal);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 5000);
}

/**
 * Updates the stats panel with current graph metrics
 * @param statsPanel The stats panel element to update
 * @param params Object containing graph metrics
 */
export function updateStatsPanel(
    statsPanel: HTMLElement,
    params: {
        graph: Graph,
        nodes: Matter.Body[],
        onStepClick: () => void,
        onAutoClick: () => void,
        onHighlightCycles?: () => void
    }
): void {
    const {
        graph,
        nodes,
        onStepClick,
        onAutoClick,
        onHighlightCycles
    } = params;

    // Get all the analysis from the graph
    const componentAnalysis = graph.componentAnalysis;
    const typeCounts = graph.componentTypeCounts;
    const totalCycles = graph.totalCycleCount;
    const giantComponentSize = graph.giantComponentSize;
    const edgeCount = graph.edgeCount;
    const maxEdges = graph.maxEdgeCount;
    const currentP = graph.edgeProbability;
    const thresholdP = graph.criticalThreshold;
    const expectedGiantSize = graph.expectedGiantComponentSize;
    const entropy = graph.componentSizeEntropy;
    const giantComponentThresholdReached = graph.isAboveGiantComponentThreshold;

    // Sort component analysis by size (descending) - should already be sorted by Graph class
    const sortedAnalysis = componentAnalysis;

    // Update stats display
    statsPanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px;">Random Graph Statistics</h3>
        <div style="margin-bottom: 15px;">
            <div><strong>Nodes:</strong> ${nodes.length}</div>
            <div><strong>Edges:</strong> ${edgeCount} / ${maxEdges}</div>
            <div><strong>Edge Probability (p):</strong> ${currentP.toFixed(4)}</div>
            <div><strong>Critical Threshold (1/n):</strong> ${thresholdP.toFixed(4)}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <div><strong>Components:</strong> ${componentAnalysis.length}</div>
            <div><strong>Largest Component:</strong> ${giantComponentSize} nodes (${(giantComponentSize / nodes.length * 100).toFixed(1)}%)</div>
            <div><strong>Giant Component Threshold:</strong> ${giantComponentThresholdReached ? 'Reached ✓' : 'Not Reached ✗'}</div>
            ${expectedGiantSize > 0 ? `<div><strong>Expected Giant Size:</strong> ~${expectedGiantSize} nodes (${(expectedGiantSize / nodes.length * 100).toFixed(1)}%)</div>` : ''}
            <div><strong>Component Size Entropy:</strong> ${entropy.toFixed(3)}</div>
            <div><strong>Total Cycles:</strong> ${totalCycles}</div>
        </div>
        <div style="margin-bottom: 15px; border-top: 1px solid #555; padding-top: 10px;">
            <h4 style="margin: 0 0 10px 0;">Component Types</h4>
            <div><strong>Isolated Nodes:</strong> ${typeCounts.isolated}</div>
            <div><strong>Trees:</strong> ${typeCounts.tree}</div>
            <div><strong>Unicyclic:</strong> ${typeCounts.unicyclic}</div>
            <div><strong>Multi-cyclic:</strong> ${typeCounts.multicyclic}</div>
        </div>
        <div style="margin-bottom: 15px; border-top: 1px solid #555; padding-top: 10px;">
            <h4 style="margin: 0 0 10px 0;">Largest Components</h4>
            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid #555;">
                        <th style="text-align: left; padding: 3px;">Rank</th>
                        <th style="text-align: center; padding: 3px;">Vertices</th>
                        <th style="text-align: center; padding: 3px;">Edges</th>
                        <th style="text-align: center; padding: 3px;">Cycles</th>
                        <th style="text-align: center; padding: 3px;">Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedAnalysis.slice(0, 5).map((analysis, idx) => {
        let componentType = 'Isolated';
        if (analysis.isTree) componentType = 'Tree';
        else if (analysis.isUnicyclic) componentType = 'Unicyclic';
        else if (analysis.isMulticyclic) componentType = 'Multi-cyclic';

        const isGiant = idx === 0 && analysis.vertices > 3;
        const rowStyle = isGiant ? 'background-color: rgba(255, 85, 0, 0.2);' : '';

        return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); ${rowStyle}">
                                <td style="padding: 3px;">#${idx + 1}</td>
                                <td style="text-align: center; padding: 3px;">${analysis.vertices}</td>
                                <td style="text-align: center; padding: 3px;">${analysis.edges}</td>
                                <td style="text-align: center; padding: 3px;">${analysis.cycles}</td>
                                <td style="text-align: center; padding: 3px;">${componentType}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-bottom: 15px; border-top: 1px solid #555; padding-top: 10px;">
            <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <button id="step-btn" style="flex: 1; padding: 5px 10px; background: #0077ff; border: none; color: white; border-radius: 3px; cursor: pointer;">Add Edge</button>
                <button id="auto-btn" style="flex: 1; padding: 5px 10px; background: #0077ff; border: none; color: white; border-radius: 3px; cursor: pointer;">${isAutoRunning ? 'Stop' : 'Auto'}</button>
            </div>
            ${onHighlightCycles ? `<button id="highlight-cycles-btn" style="width: 100%; padding: 5px 10px; background: #76f09b; border: none; color: white; border-radius: 3px; cursor: pointer;">Highlight Random Cycle</button>` : ''}
        </div>
    `;

    // Add event listeners for the controls
    const stepBtn = document.getElementById('step-btn') as HTMLButtonElement;
    const autoBtn = document.getElementById('auto-btn') as HTMLButtonElement;
    const highlightCyclesBtn = document.getElementById('highlight-cycles-btn') as HTMLButtonElement;

    if (stepBtn) {
        stepBtn.addEventListener('click', onStepClick);
    }

    if (autoBtn) {
        autoBtn.addEventListener('click', () => {
            if (isAutoRunning) {
                // Stop autorun
                stopAutoRun();
                autoBtn.textContent = 'Auto';
            } else {
                // Start autorun
                stopAutoRun(); // First stop any existing autorun to be safe
                autoRunIntervalId = window.setInterval(() => {
                    onStepClick();
                }, 200);
                autoBtn.textContent = 'Stop';
                isAutoRunning = true;
            }
        });
    }

    if (highlightCyclesBtn && onHighlightCycles) {
        highlightCyclesBtn.addEventListener('click', onHighlightCycles);
    }
}