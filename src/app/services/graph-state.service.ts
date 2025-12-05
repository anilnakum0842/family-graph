import { Injectable, computed, signal, inject } from '@angular/core';
import { FamilyDataService } from './family-data.service';
import { FamilyNode, FamilyLink, FilterState } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class GraphStateService {
  private dataService = inject(FamilyDataService);

  // --- State Signals ---
  private allNodes = signal<FamilyNode[]>([]);
  private allLinks = signal<FamilyLink[]>([]);

  filterState = signal<FilterState>({
    genders: { 'M': true, 'F': true },
    cities: { 'Delhi': true, 'Mumbai': true, 'Bengaluru': true, 'Pune': true, 'Village': true, 'London': true, 'New York': true },
    aliveStatus: 'all'
  });

  expandedParentIds = signal<Set<string>>(new Set<string>());
  selectedNodeId = signal<string | null>(null);

  constructor() {
    this.loadData();
  }

  private loadData() {
    this.dataService.getFamilyData().subscribe({
      next: (data) => {
        // Deep copy
        const nodes: FamilyNode[] = JSON.parse(JSON.stringify(data.nodes));
        const links: FamilyLink[] = JSON.parse(JSON.stringify(data.links));

        // FIX: Generate missing graph links from parentIds
        nodes.forEach(n => {
          if (n.parentIds) {
            n.parentIds.forEach(pid => {
              const linkExists = links.some(l =>
                (l.source === pid && l.target === n.id)
              );
              if (!linkExists) {
                links.push({
                  id: `auto-gen-${pid}-${n.id}`,
                  source: pid,
                  target: n.id,
                  relation: 'parent'
                });
              }
            });
          }
        });

        // Pre-process: Build adjacency for "Children"
        const nodeMap = new Map<string, FamilyNode>();
        nodes.forEach(n => {
          n.childrenIds = [];
          n.isExpanded = false;
          nodeMap.set(n.id, n);
        });

        // Populate childrenIds
        nodes.forEach(n => {
          if (n.parentIds) {
            n.parentIds.forEach(pid => {
              const parent = nodeMap.get(pid);
              if (parent) parent.childrenIds?.push(n.id);
            });
          }
        });

        this.allNodes.set(nodes);
        this.allLinks.set(links);
      },
      error: (err) => console.error('Failed to load family data', err)
    });
  }

  // --- Computed Visible Graph ---
  readonly visibleData = computed(() => {
    const filters = this.filterState();
    const expandedSet = this.expandedParentIds();
    const selectedId = this.selectedNodeId();
    const rawNodes = this.allNodes();
    const rawLinks = this.allLinks();

    // 1. Direct Matches
    const directMatchIds = new Set<string>();
    rawNodes.forEach(node => {
      if (node.type === 'familyRoot') {
        directMatchIds.add(node.id);
        return;
      }
      if (node.gender && !filters.genders[node.gender]) return;
      if (node.city && !filters.cities[node.city]) return;
      if (filters.aliveStatus === 'alive' && node.deathYear != null) return;
      if (filters.aliveStatus === 'deceased' && node.deathYear == null) return;
      directMatchIds.add(node.id);
    });

    // 2. Visibility Logic
    const visibleNodeIds = new Set<string>();
    const nodeMap = new Map(rawNodes.map(n => [n.id, n]));
    const isDirectlyMatched = (id: string) => directMatchIds.has(id);
    const ancestorIdsOfMatches = new Set<string>();

    const markAncestors = (nodeId: string) => {
      const node = nodeMap.get(nodeId);
      if (!node || !node.parentIds) return;
      node.parentIds.forEach(pid => {
        if (!ancestorIdsOfMatches.has(pid)) {
          ancestorIdsOfMatches.add(pid);
          markAncestors(pid);
        }
      });
      if (node.type !== 'familyRoot') {
        const parentLinks = rawLinks.filter(l => (typeof l.target === 'string' ? l.target : (l.target as FamilyNode).id) === nodeId && l.relation === 'parent');
        parentLinks.forEach(l => {
          const sourceId = typeof l.source === 'string' ? l.source : (l.source as FamilyNode).id;
          if (!ancestorIdsOfMatches.has(sourceId)) {
            ancestorIdsOfMatches.add(sourceId);
            markAncestors(sourceId);
          }
        });
      }
    };
    directMatchIds.forEach(id => markAncestors(id));

    rawNodes.forEach(node => {
      let isVisible = false;
      if (node.type === 'familyRoot') isVisible = true;
      else if (isDirectlyMatched(node.id)) {
        const matchesFilterOrStructure = isDirectlyMatched(node.id) || ancestorIdsOfMatches.has(node.id);
        if (matchesFilterOrStructure) {
          if (node.generation === undefined || node.generation <= 1) isVisible = true;
          else {
            let parentExpanded = false;
            if (node.parentIds) parentExpanded = node.parentIds.some(pid => expandedSet.has(pid));
            if (!parentExpanded) {
              const parentLinks = rawLinks.filter(l => (typeof l.target === 'string' ? l.target : (l.target as FamilyNode).id) === node.id && l.relation === 'parent');
              parentExpanded = parentLinks.some(l => expandedSet.has(typeof l.source === 'string' ? l.source : (l.source as FamilyNode).id));
            }
            if (parentExpanded) isVisible = true;
          }
        }
      }
      if (isVisible) visibleNodeIds.add(node.id);
    });

    // 3. Spouse Inclusion Rule
    let changed = true;
    while (changed) {
      changed = false;
      rawLinks.forEach(l => {
        if (l.relation === 'spouse') {
          const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
          const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
          const sVis = visibleNodeIds.has(s);
          const tVis = visibleNodeIds.has(t);
          if (sVis && !tVis) { visibleNodeIds.add(t); changed = true; }
          else if (tVis && !sVis) { visibleNodeIds.add(s); changed = true; }
        }
      });
    }

    // 4. Highlight Logic
    const highlightMap = new Map<string, 'ancestor' | 'descendant' | 'self'>();
    if (selectedId && visibleNodeIds.has(selectedId)) {
      highlightMap.set(selectedId, 'self');
      const findAncestors = (currId: string) => {
        const curr = nodeMap.get(currId);
        if (curr?.parentIds) {
          curr.parentIds.forEach(pid => {
            if (visibleNodeIds.has(pid) && !highlightMap.has(pid)) {
              highlightMap.set(pid, 'ancestor');
              findAncestors(pid);
            }
          });
        }
        const incomingLinks = rawLinks.filter(l => (typeof l.target === 'string' ? l.target : (l.target as FamilyNode).id) === currId && l.relation === 'parent');
        incomingLinks.forEach(l => {
          const srcId = typeof l.source === 'string' ? l.source : (l.source as FamilyNode).id;
          if (visibleNodeIds.has(srcId) && !highlightMap.has(srcId)) {
            highlightMap.set(srcId, 'ancestor');
            findAncestors(srcId);
          }
        });
      };
      findAncestors(selectedId);

      const findDescendants = (currId: string) => {
        const curr = nodeMap.get(currId);
        if (curr?.childrenIds) {
          curr.childrenIds.forEach(cid => {
            if (visibleNodeIds.has(cid) && !highlightMap.has(cid)) {
              highlightMap.set(cid, 'descendant');
              findDescendants(cid);
            }
          });
        }
        const outgoingLinks = rawLinks.filter(l => (typeof l.source === 'string' ? l.source : (l.source as FamilyNode).id) === currId && l.relation === 'parent');
        outgoingLinks.forEach(l => {
          const targetId = typeof l.target === 'string' ? l.target : (l.target as FamilyNode).id;
          if (visibleNodeIds.has(targetId) && !highlightMap.has(targetId)) {
            highlightMap.set(targetId, 'descendant');
            findDescendants(targetId);
          }
        });
      };
      findDescendants(selectedId);
    }

    // 5. Result
    const resultNodes = rawNodes.filter(n => visibleNodeIds.has(n.id)).map(n => ({
      ...n,
      isVisible: true,
      isExpanded: expandedSet.has(n.id),
      isHighlighted: highlightMap.has(n.id),
      highlightType: highlightMap.get(n.id) || null
    }));

    const resultLinks = rawLinks.filter(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as FamilyNode).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as FamilyNode).id;
      return visibleNodeIds.has(s) && visibleNodeIds.has(t);
    });

    return { nodes: resultNodes, links: resultLinks };
  });

  // --- Actions ---
  toggleFilterGender(gender: string, isChecked: boolean) {
    this.filterState.update(s => ({ ...s, genders: { ...s.genders, [gender]: isChecked } }));
  }
  toggleFilterCity(city: string, isChecked: boolean) {
    this.filterState.update(s => ({ ...s, cities: { ...s.cities, [city]: isChecked } }));
  }
  setAliveStatus(status: 'all' | 'alive' | 'deceased') {
    this.filterState.update(s => ({ ...s, aliveStatus: status }));
  }

  // --- UPDATED EXPANSION LOGIC FOR SPOUSE SYNC ---
  toggleNodeExpansion(nodeId: string) {
    const rawNodes = this.allNodes();
    const rawLinks = this.allLinks();
    const nodeMap = new Map(rawNodes.map(n => [n.id, n]));

    // Helper: Find all spouses for a given node ID
    const getSpouses = (id: string) => {
      const spouses: string[] = [];
      rawLinks.forEach(l => {
        if (l.relation === 'spouse') {
          const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
          const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
          if (s === id) spouses.push(t);
          if (t === id) spouses.push(s);
        }
      });
      return spouses;
    };

    const targetSpouses = getSpouses(nodeId);
    const nodesToToggle = [nodeId, ...targetSpouses];

    this.expandedParentIds.update(set => {
      const newSet = new Set(set);
      // Determine action based on the clicked node's state
      const isCurrentlyExpanded = newSet.has(nodeId);

      if (isCurrentlyExpanded) {
        // DEEP COLLAPSE (Recursive)
        // This function collapses the node, its descendants, AND its spouses (synced).
        const collapseRecursive = (id: string) => {
          if (newSet.has(id)) {
            newSet.delete(id); // Collapse self

            // Also collapse spouses to keep sync
            const mySpouses = getSpouses(id);
            mySpouses.forEach(sid => {
              if (newSet.has(sid)) collapseRecursive(sid);
            });

            // Recursively collapse children
            const node = nodeMap.get(id);
            node?.childrenIds?.forEach(childId => collapseRecursive(childId));
          }
        };

        // Start recursive collapse for the clicked node and its immediate spouses
        nodesToToggle.forEach(id => collapseRecursive(id));

      } else {
        // SHALLOW EXPAND
        // Just expand the node and its spouse to show their shared children
        nodesToToggle.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  }

  selectNode(id: string | null) {
    this.selectedNodeId.set(id);
  }
}