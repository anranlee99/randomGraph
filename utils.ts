import * as Matter from 'matter-js';

// Store the autorun interval ID globally for proper toggling
let autoRunIntervalId: number | null = null;
let isAutoRunning = false;

/**
 * Color scheme for components - using HSL for better distribution
 * @param componentId The ID of the component to color
 * @param totalComponents Total number of components in the graph
 * @param components The array of components (arrays of node indices)
 * @param giantComponentSize Size of the largest component
 * @returns A CSS color string in HSL format
 */
/**
 * Color scheme for components
 * @param componentId The ID of the component to color
 * @param totalComponents Total number of components in the graph
 * @param components The array of components (arrays of node indices)
 * @param giantComponentSize Size of the largest component
 * @returns A CSS color string for the component
 */
export function getComponentColor(
    componentId: number, 
    totalComponents: number,
    components: number[][],
    giantComponentSize: number
): string {
    // If this is the giant component (largest component), make it stand out
    if (components[componentId] && 
        components[componentId].length === giantComponentSize && 
        giantComponentSize > 3) {
        return `#ff5500`; // Fixed color for giant component
    } else if (components[componentId] && components[componentId].length > 1) {
        return `#76f09b`; // Fixed color for small components
    }
    
    return `#0077ff`; // Color for isolated nodes
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
    notification.textContent = 'Giant Component Formed!';
    
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
        nodes: Matter.Body[],
        edgeCount: number,
        maxEdges: number,
        edgeProbability: number,
        components: number[][],
        giantComponentSize: number,
        giantComponentThreshold: boolean,
        cycleCount: number,
        onProbabilityChange: (prob: number) => void,
        onStepClick: () => void,
        onAutoClick: () => void,
        onHighlightCycles: () => void
    }
): void {
    const {
        nodes,
        edgeCount,
        maxEdges,
        edgeProbability,
        components,
        giantComponentSize,
        giantComponentThreshold,
        onProbabilityChange,
        onStepClick,
        onAutoClick
    } = params;
    
    // Calculate theoretical threshold for giant component in Erdős-Rényi model: p = 1/n
    const n = nodes.length;
    const thresholdP = 1 / n;
    const currentP = edgeCount / maxEdges;
    
    // Update stats display
    statsPanel.innerHTML = `
        <h3 style="margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px;">Random Graph Stats</h3>
        <div style="margin-bottom: 15px;">
            <div><strong>Nodes:</strong> ${n}</div>
            <div><strong>Edges:</strong> ${edgeCount} / ${maxEdges}</div>
            <div><strong>Edge Probability (p):</strong> ${currentP.toFixed(4)}</div>
            <div><strong>Threshold (1/n):</strong> ${thresholdP.toFixed(4)}</div>
        </div>
        <div style="margin-bottom: 15px;">
            <div><strong>Components:</strong> ${components.length}</div>
            <div><strong>Largest Component:</strong> ${giantComponentSize} nodes</div>
            <div><strong>Giant Component:</strong> ${giantComponentThreshold ? 'YES ✓' : 'NO ✗'}</div>

        </div>
        <div style="margin-bottom: 10px; border-top: 1px solid #555; padding-top: 10px;">
            <label for="probability-slider" style="display:block; margin-bottom: 5px;">Edge Probability: ${edgeProbability.toFixed(2)}</label>
            <input type="range" id="probability-slider" min="0.01" max="1" step="0.01" value="${edgeProbability}" style="width: 100%">
        </div>
        <button id="step-btn" style="margin-right: 5px; padding: 5px 10px; background: #0077ff; border: none; color: white; border-radius: 3px; cursor: pointer;">Step</button>
        <button id="auto-btn" style="padding: 5px 10px; background: #0077ff; border: none; color: white; border-radius: 3px; cursor: pointer;">${isAutoRunning ? 'Stop' : 'Auto'}</button>
    `;

    // Add event listeners for the controls
    const slider = document.getElementById('probability-slider') as HTMLInputElement;
    const stepBtn = document.getElementById('step-btn') as HTMLButtonElement;
    const autoBtn = document.getElementById('auto-btn') as HTMLButtonElement;
    const highlightCyclesBtn = document.getElementById('highlight-cycles-btn') as HTMLButtonElement;

    if (slider) {
        slider.addEventListener('input', (e) => {
            const newProbability = parseFloat((e.target as HTMLInputElement).value);
            onProbabilityChange(newProbability);
        });
    }

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

}