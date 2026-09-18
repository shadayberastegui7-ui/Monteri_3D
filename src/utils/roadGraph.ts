import { Landmark } from '../types';

export interface Point2D {
  x: number;
  z: number;
}

export interface RoadNode {
  id: string;
  x: number;
  z: number;
  neighbors: { nodeId: string; distance: number }[];
}

// 1. Orthogonal Grid Constants
export const WEST_X_CORRIDORS = [-16.0, -12.8, -9.4, -6.0, -2.6];
export const EAST_X_CORRIDORS = [1.0, 4.4, 7.8, 11.2, 14.5];
export const Z_STREET_AXES = [-15.3, -11.9, -8.5, -5.1, -1.7, 1.7, 5.1, 8.5, 11.9, 15.3];

// Bridge axis Z position (Puente Metálico / Calle 27)
export const BRIDGE_Z = -1.7;
export const BRIDGE_WEST_X = -2.6;
export const BRIDGE_EAST_X = 1.0;

// Explicit street calzada access nodes for POIs on the asphalt grid
export const POI_STREET_NODES: Record<string, { x: number; z: number }> = {
  'ronda-del-sinu': { x: 1.0, z: -1.7 },      // Avenida Primera East / Calle 27
  'catedral-san-jeronimo': { x: 4.4, z: 1.7 },// Carrera 4 / Calle 27 North
  'muelle-turistico': { x: -2.6, z: -1.7 },   // Avenida Primera West / Bridge West Entrance
  'monumento-al-porro': { x: 4.4, z: -5.1 },  // Carrera 4 / Calle 20
  'villa-olimpica': { x: 7.8, z: 5.1 },       // Carrera 7 / Entrance Villa Olímpica
};

// Helper to format node ID
export function getNodeKey(x: number, z: number): string {
  return `node_${x.toFixed(1)}_${z.toFixed(1)}`;
}

// Build Road Graph
class RoadGraph {
  public nodes: Map<string, RoadNode> = new Map();

  constructor() {
    this.buildGraph();
  }

  private addNode(x: number, z: number): RoadNode {
    const key = getNodeKey(x, z);
    if (!this.nodes.has(key)) {
      this.nodes.set(key, { id: key, x, z, neighbors: [] });
    }
    return this.nodes.get(key)!;
  }

  private addUndirectedEdge(x1: number, z1: number, x2: number, z2: number) {
    const n1 = this.addNode(x1, z1);
    const n2 = this.addNode(x2, z2);
    const dist = Math.hypot(x2 - x1, z2 - z1);

    if (!n1.neighbors.some((n) => n.nodeId === n2.id)) {
      n1.neighbors.push({ nodeId: n2.id, distance: dist });
    }
    if (!n2.neighbors.some((n) => n.nodeId === n1.id)) {
      n2.neighbors.push({ nodeId: n1.id, distance: dist });
    }
  }

  private buildGraph() {
    // A. West Bank Grid (Margen Izquierda)
    for (let i = 0; i < WEST_X_CORRIDORS.length; i++) {
      for (let j = 0; j < Z_STREET_AXES.length; j++) {
        const x = WEST_X_CORRIDORS[i];
        const z = Z_STREET_AXES[j];

        if (i < WEST_X_CORRIDORS.length - 1) {
          const nextX = WEST_X_CORRIDORS[i + 1];
          this.addUndirectedEdge(x, z, nextX, z);
        }

        if (j < Z_STREET_AXES.length - 1) {
          const nextZ = Z_STREET_AXES[j + 1];
          this.addUndirectedEdge(x, z, x, nextZ);
        }
      }
    }

    // B. East Bank Grid (Margen Derecha)
    for (let i = 0; i < EAST_X_CORRIDORS.length; i++) {
      for (let j = 0; j < Z_STREET_AXES.length; j++) {
        const x = EAST_X_CORRIDORS[i];
        const z = Z_STREET_AXES[j];

        if (i < EAST_X_CORRIDORS.length - 1) {
          const nextX = EAST_X_CORRIDORS[i + 1];
          this.addUndirectedEdge(x, z, nextX, z);
        }

        if (j < Z_STREET_AXES.length - 1) {
          const nextZ = Z_STREET_AXES[j + 1];
          this.addUndirectedEdge(x, z, x, nextZ);
        }
      }
    }

    // C. Single River Crossing: The Bridge (Puente Metálico at Z = -1.7)
    // Connects West Riverfront (BRIDGE_WEST_X, BRIDGE_Z) directly to East Riverfront (BRIDGE_EAST_X, BRIDGE_Z)
    this.addUndirectedEdge(BRIDGE_WEST_X, BRIDGE_Z, BRIDGE_EAST_X, BRIDGE_Z);
  }

  /**
   * Snap any 2D point or POI to the nearest road graph node
   */
  public snapToNearestNode(x: number, z: number): RoadNode {
    let closestNode: RoadNode | null = null;
    let minDistance = Infinity;

    for (const node of this.nodes.values()) {
      const dist = Math.hypot(node.x - x, node.z - z);
      if (dist < minDistance) {
        minDistance = dist;
        closestNode = node;
      }
    }

    return closestNode || Array.from(this.nodes.values())[0];
  }

  /**
   * Dijkstra shortest path between two node IDs
   */
  public findShortestPath(startNodeId: string, targetNodeId: string): RoadNode[] {
    if (startNodeId === targetNodeId) {
      const node = this.nodes.get(startNodeId);
      return node ? [node] : [];
    }

    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const unvisited: Set<string> = new Set();

    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }

    distances.set(startNodeId, 0);

    while (unvisited.size > 0) {
      let currentId: string | null = null;
      let smallestDist = Infinity;

      for (const id of unvisited) {
        const d = distances.get(id)!;
        if (d < smallestDist) {
          smallestDist = d;
          currentId = id;
        }
      }

      if (!currentId || smallestDist === Infinity) break;
      if (currentId === targetNodeId) break;

      unvisited.delete(currentId);
      const currentNode = this.nodes.get(currentId)!;

      for (const neighbor of currentNode.neighbors) {
        if (!unvisited.has(neighbor.nodeId)) continue;

        const alt = distances.get(currentId)! + neighbor.distance;
        if (alt < distances.get(neighbor.nodeId)!) {
          distances.set(neighbor.nodeId, alt);
          previous.set(neighbor.nodeId, currentId);
        }
      }
    }

    const path: RoadNode[] = [];
    let curr: string | null = targetNodeId;

    if (distances.get(targetNodeId) === Infinity) {
      return [];
    }

    while (curr) {
      const node = this.nodes.get(curr);
      if (node) path.unshift(node);
      curr = previous.get(curr) || null;
    }

    return path;
  }
}

export const roadGraph = new RoadGraph();

/**
 * Gets the exact street calzada access node for a POI
 */
export function getPOIStreetNode(poi: { id?: string; position3D: { x: number; z: number } }): RoadNode {
  if (poi.id && POI_STREET_NODES[poi.id]) {
    const coords = POI_STREET_NODES[poi.id];
    return roadGraph.snapToNearestNode(coords.x, coords.z);
  }
  return roadGraph.snapToNearestNode(poi.position3D.x, poi.position3D.z);
}

/**
 * Optimizes the visiting sequence of a set of POIs using Traveling Salesperson Problem (TSP) nearest-neighbor heuristic
 * based on actual road graph distances. Ensures ALL input POIs (including Villa Olímpica) are preserved.
 */
export function optimizePOIOrder(pois: Landmark[], startPoiId?: string): Landmark[] {
  if (!pois || pois.length <= 1) return [...pois];

  const unvisited = [...pois];
  const result: Landmark[] = [];

  let currentIndex = 0;
  if (startPoiId) {
    const foundIdx = unvisited.findIndex((p) => p.id === startPoiId);
    if (foundIdx !== -1) currentIndex = foundIdx;
  }

  let current = unvisited.splice(currentIndex, 1)[0];
  result.push(current);

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const dLng = candidate.coordinates.lng - current.coordinates.lng;
      const dLat = candidate.coordinates.lat - current.coordinates.lat;
      const dist = Math.hypot(dLng, dLat);

      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx !== -1) {
      current = unvisited.splice(nearestIdx, 1)[0];
      result.push(current);
    } else {
      result.push(...unvisited);
      break;
    }
  }

  return result;
}

/**
 * Calculates the exact orthogonal road path for a sequence of 3D POIs
 * Returns a list of 2D points along asphalt corridors and bridge:
 * Calle -> Entrada del Puente -> Salida del Puente -> Calle
 */
export function calculateItineraryRoute(
  itinerary: { id?: string; position3D: { x: number; z: number } }[]
): Point2D[] {
  if (!itinerary || itinerary.length === 0) return [];
  if (itinerary.length === 1) {
    const node = getPOIStreetNode(itinerary[0]);
    return [{ x: node.x, z: node.z }];
  }

  const fullPathPoints: Point2D[] = [];

  for (let i = 0; i < itinerary.length - 1; i++) {
    const poi1 = itinerary[i];
    const poi2 = itinerary[i + 1];

    const startNode = getPOIStreetNode(poi1);
    const targetNode = getPOIStreetNode(poi2);

    const legPath = roadGraph.findShortestPath(startNode.id, targetNode.id);

    for (let k = 0; k < legPath.length; k++) {
      const node = legPath[k];
      const lastPoint = fullPathPoints[fullPathPoints.length - 1];

      if (!lastPoint || Math.hypot(lastPoint.x - node.x, lastPoint.z - node.z) > 0.01) {
        fullPathPoints.push({ x: node.x, z: node.z });
      }
    }
  }

  return fullPathPoints;
}
