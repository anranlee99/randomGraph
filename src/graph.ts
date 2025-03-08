/**
 * Comprehensive Graph class using an adjacency list representation.
 * Provides all the graph-theoretic functionality needed for the random graph simulation.
 * For our purposes, the graph is undirected. Each time we attach a spring between
 * two nodes (by index), we add edges in both directions.
 */
export class Graph {
    adjList: number[][];
    private _componentAnalysis: ComponentAnalysis[] | null = null;
    private _components: number[][] | null = null;
    
    // Cache invalidation flag - set to true whenever the graph structure changes
    private _needsReanalysis = true;

    constructor(numNodes: number) {
        this.adjList = new Array(numNodes);
        for (let i = 0; i < numNodes; i++) {
            this.adjList[i] = [];
        }
    }

    /**
     * Add an edge between two nodes in the graph
     * @param u Source node index
     * @param v Target node index
     */
    addEdge(u: number, v: number) {
        this.adjList[u].push(v);
        this._needsReanalysis = true;
    }

    /**
     * Get the number of nodes in the graph
     */
    get nodeCount(): number {
        return this.adjList.length;
    }

    /**
     * Get the number of unique edges in the graph
     */
    get edgeCount(): number {
        const edgeSet = new Set<string>();
        
        for (let i = 0; i < this.adjList.length; i++) {
            for (const neighbor of this.adjList[i]) {
                // Create a canonical edge representation (smaller index first)
                const edge = i < neighbor ? `${i}-${neighbor}` : `${neighbor}-${i}`;
                edgeSet.add(edge);
            }
        }
        
        return edgeSet.size;
    }

    /**
     * Get the maximum possible number of edges in the graph
     */
    get maxEdgeCount(): number {
        const n = this.nodeCount;
        return (n * (n - 1)) / 2;
    }

    /**
     * Get the current edge probability p = current edges / possible edges
     */
    get edgeProbability(): number {
        return this.edgeCount / this.maxEdgeCount;
    }

    /**
     * Get the critical threshold probability for giant component emergence (1/n)
     */
    get criticalThreshold(): number {
        return 1 / this.nodeCount;
    }

    /**
     * Check if we're above the threshold for giant component formation
     */
    get isAboveGiantComponentThreshold(): boolean {
        return this.edgeProbability >= this.criticalThreshold;
    }

    /**
     * Calculate the expected size of the giant component based on theory
     */
    get expectedGiantComponentSize(): number {
        if (!this.isAboveGiantComponentThreshold) {
            return 0;
        }
        
        // Approximate solution to θ = 1 - e^(-c·θ) equation using numerical method
        // where c = p·(n-1)
        const c = this.edgeProbability * (this.nodeCount - 1);
        let theta = 0.5; // Initial guess
        
        // Simple fixed-point iteration
        for (let i = 0; i < 10; i++) {
            theta = 1 - Math.exp(-c * theta);
        }
        
        return Math.round(theta * this.nodeCount);
    }

    /**
     * Get the analyzed components (arrays of node indices)
     */
    get components(): number[][] {
        if (this._needsReanalysis || this._components === null) {
            this.analyzeComponents();
        }
        return this._components!;
    }

    /**
     * Get the detailed component analysis
     */
    get componentAnalysis(): ComponentAnalysis[] {
        if (this._needsReanalysis || this._componentAnalysis === null) {
            this.analyzeComponents();
        }
        return this._componentAnalysis!;
    }

    /**
     * Get the size of the largest component
     */
    get giantComponentSize(): number {
        const analysis = this.componentAnalysis;
        if (analysis.length === 0) {
            return 0;
        }
        return Math.max(...analysis.map(c => c.vertices));
    }

    /**
     * Count the total number of cycles across all components
     */
    get totalCycleCount(): number {
        return this.componentAnalysis.reduce((sum, c) => sum + c.cycles, 0);
    }

    /**
     * Get entropy of the component size distribution
     */
    get componentSizeEntropy(): number {
        return this.calculateEntropy(this.componentAnalysis.map(c => c.vertices));
    }

    /**
     * Count components of each type
     */
    get componentTypeCounts(): {
        isolated: number;
        tree: number;
        unicyclic: number;
        multicyclic: number;
    } {
        return {
            isolated: this.componentAnalysis.filter(c => c.isIsolated).length,
            tree: this.componentAnalysis.filter(c => c.isTree).length,
            unicyclic: this.componentAnalysis.filter(c => c.isUnicyclic).length,
            multicyclic: this.componentAnalysis.filter(c => c.isMulticyclic).length
        };
    }

    /**
     * Analyzes components to calculate vertices, edges, and cycles
     * This method analyzes the graph structure and caches the results
     */
    analyzeComponents(): ComponentAnalysis[] {
        const n = this.nodeCount;
        const visited = new Array(n).fill(false);
        const components: number[][] = [];

        // Find all connected components using DFS
        for (let i = 0; i < n; i++) {
            if (!visited[i]) {
                const component: number[] = [];
                this.dfs(i, visited, component);
                components.push(component);
            }
        }

        // Store the components
        this._components = components;
        
        // Analyze each component
        const analysisResults: ComponentAnalysis[] = [];
        
        for (let i = 0; i < components.length; i++) {
            const component = components[i];
            const vertices = component.length;
            
            // Count unique edges within this component
            const edges = this.countComponentEdges(component);
            
            // Calculate number of cycles using the formula: cycles = edges - vertices + 1
            // For a connected component, this formula from graph theory gives the cycle count
            const cycleCount = Math.max(0, edges - vertices + 1);
            
            analysisResults.push({
                componentId: i,
                component: component,
                vertices: vertices,
                edges: edges,
                cycles: cycleCount,
                isTree: cycleCount === 0 && vertices > 1,
                isIsolated: vertices === 1,
                isUnicyclic: cycleCount === 1,
                isMulticyclic: cycleCount > 1
            });
        }
        
        // Sort by component size (descending)
        analysisResults.sort((a, b) => b.vertices - a.vertices);
        
        // Cache the results
        this._componentAnalysis = analysisResults;
        this._needsReanalysis = false;
        
        return analysisResults;
    }
    
    /**
     * Find a unicyclic component and return a cycle within it
     * @returns A cycle as an array of node indices, or null if no unicyclic components exist
     */
    findCycleToHighlight(): number[] | null {
        // Make sure component analysis is up to date
        const analysis = this.componentAnalysis;
        
        // Find all unicyclic components
        const unicyclicComponents = analysis.filter(c => c.isUnicyclic);
        
        if (unicyclicComponents.length === 0) {
            return null;
        }
        
        // Choose a random unicyclic component
        const randomComponent = unicyclicComponents[Math.floor(Math.random() * unicyclicComponents.length)];
        
        // In a unicyclic component, we can find the cycle by:
        // 1. Start from any node
        // 2. Follow edges, marking visited nodes
        // 3. When we reach a visited node, we've found the cycle
        
        const componentNodes = randomComponent.component;
        const visited = new Set<number>();
        const parent = new Map<number, number>();
        let cycleStart = -1;
        let cycleEnd = -1;
        
        // Start DFS from the first node in the component
        const startNode = componentNodes[0];
        
        // DFS to find a cycle
        const dfsForCycle = (node: number, parentNode: number | null): boolean => {
            visited.add(node);
            
            for (const neighbor of this.adjList[node]) {
                // Skip the parent node we just came from
                if (parentNode !== null && neighbor === parentNode) {
                    continue;
                }
                
                if (visited.has(neighbor)) {
                    // Found a cycle
                    cycleStart = neighbor;
                    cycleEnd = node;
                    return true;
                }
                
                parent.set(neighbor, node);
                if (dfsForCycle(neighbor, node)) {
                    return true;
                }
            }
            
            return false;
        };
        
        dfsForCycle(startNode, null);
        
        if (cycleStart !== -1 && cycleEnd !== -1) {
            // Reconstruct the cycle
            const cycle = [cycleStart];
            let current = cycleEnd;
            
            while (current !== cycleStart) {
                cycle.push(current);
                current = parent.get(current)!;
            }
            
            return cycle;
        }
        
        return null;
    }
    
    /**
     * Count the distribution of components by size
     * @returns An object mapping component sizes to counts
     */
    getComponentSizeDistribution(): { [size: number]: number } {
        const analysis = this.componentAnalysis;
        const distribution: { [size: number]: number } = {};
        
        for (const component of analysis) {
            const size = component.vertices;
            distribution[size] = (distribution[size] || 0) + 1;
        }
        
        return distribution;
    }
    
    /**
     * Count the actual number of unique edges in a component
     * @param component Array of node indices
     * @returns Number of unique edges
     */
    private countComponentEdges(component: number[]): number {
        const componentSet = new Set(component);
        const edgeSet = new Set<string>();
        
        // For each node in the component
        for (const nodeIdx of component) {
            // For each neighbor of the node
            for (const neighbor of this.adjList[nodeIdx]) {
                // Only count edges within the component
                if (componentSet.has(neighbor)) {
                    // Create a canonical edge representation (smaller index first)
                    const edge = nodeIdx < neighbor 
                        ? `${nodeIdx}-${neighbor}` 
                        : `${neighbor}-${nodeIdx}`;
                    
                    // Add to set to eliminate duplicates
                    edgeSet.add(edge);
                }
            }
        }
        
        // Since this is an undirected graph, we're counting each edge exactly once
        return edgeSet.size;
    }
    
    /**
     * Helper method for DFS traversal
     */
    private dfs(v: number, visited: boolean[], component: number[]) {
        visited[v] = true;
        component.push(v);
        
        for (const neighbor of this.adjList[v]) {
            if (!visited[neighbor]) {
                this.dfs(neighbor, visited, component);
            }
        }
    }
    
    /**
     * Calculate the entropy of a distribution
     * Higher entropy means more diversity in component sizes
     * @param distribution Array of values
     * @returns Entropy value
     */
    private calculateEntropy(distribution: number[]): number {
        if (distribution.length === 0) return 0;
        
        // Count occurrences of each value
        const counts: {[key: number]: number} = {};
        distribution.forEach(value => {
            counts[value] = (counts[value] || 0) + 1;
        });
        
        // Calculate probabilities
        const total = distribution.length;
        const probabilities = Object.values(counts).map(count => count / total);
        
        // Calculate entropy: -sum(p * log2(p))
        const entropy = probabilities.reduce((sum, p) => {
            return sum - (p * Math.log2(p));
        }, 0);
        
        return entropy;
    }
}

/**
 * Interface for component analysis results
 */
export interface ComponentAnalysis {
    componentId: number;
    component: number[];
    vertices: number;
    edges: number;
    cycles: number;
    isTree: boolean;
    isIsolated: boolean;
    isUnicyclic: boolean;
    isMulticyclic: boolean;
}