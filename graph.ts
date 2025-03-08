/**
 * Graph class using an adjacency list representation.
 * For our purposes, the graph is undirected. Each time we attach a spring between
 * two nodes (by index), we add edges in both directions.
 *
 * The findCycles method below returns all simple cycles detected in the graph.
 * To avoid duplicate cycles, it only reports a cycle when the starting node is
 * the smallest node in that cycle.
 */
export class Graph {
    adjList: number[][];

    constructor(numNodes: number) {
        this.adjList = new Array(numNodes);
        for (let i = 0; i < numNodes; i++) {
            this.adjList[i] = [];
        }
    }

    addEdge(u: number, v: number) {
        this.adjList[u].push(v);
    }

    /**
     * Finds and returns all simple cycles in the undirected graph.
     * Each cycle is returned as an array of node indices.
     */
    findCycles(): number[][] {
        const cycles: number[][] = [];
        const seen = new Set<string>();
        const n = this.adjList.length;
        const adjList = this.adjList;
    
        // Helper: rotate an array so that its smallest element comes first.
        function rotateToMin(arr: number[]): number[] {
            const min = Math.min(...arr);
            const idx = arr.indexOf(min);
            return arr.slice(idx).concat(arr.slice(0, idx));
        }
    
        // Helper: canonicalize a cycle by considering both forward and reversed orders.
        function canonicalize(cycle: number[]): string {
            const forward = rotateToMin(cycle);
            const reversed = rotateToMin([...cycle].reverse());
            const forwardStr = forward.join(',');
            const reversedStr = reversed.join(',');
            return forwardStr < reversedStr ? forwardStr : reversedStr;
        }
    
        // Recursive DFS that records cycles.
        function dfs(start: number, current: number, path: number[]) {
            for (const neighbor of adjList[current]) {
                if (neighbor === start && path.length >= 3) {
                    const cycle = [...path];
                    const key = canonicalize(cycle);
                    if (!seen.has(key)) {
                        seen.add(key);
                        cycles.push(cycle);
                    }
                } else if (!path.includes(neighbor) && neighbor > start) {
                    path.push(neighbor);
                    dfs(start, neighbor, path);
                    path.pop();
                }
            }
        }
    
        // Start DFS from each node.
        for (let v = 0; v < n; v++) {
            dfs(v, v, [v]);
        }
        return cycles;
    }
    

}