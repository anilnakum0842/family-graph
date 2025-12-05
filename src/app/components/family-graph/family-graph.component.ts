import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, effect } from '@angular/core';
import * as d3 from 'd3';
import { GraphStateService } from '../../services/graph-state.service';
import { FamilyNode, FamilyLink } from '../../models/models';

@Component({
  selector: 'app-family-graph',
  standalone: false,
  templateUrl: './family-graph.component.html',
  styleUrls: ['./family-graph.component.scss']
})
export class FamilyGraphComponent implements AfterViewInit, OnDestroy {
  @ViewChild('svg') svgRef!: ElementRef<SVGElement>;
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  private stateService = inject(GraphStateService);

  private simulation!: d3.Simulation<FamilyNode, FamilyLink>;
  private svg!: d3.Selection<SVGElement, unknown, null, undefined>;
  private g!: d3.Selection<SVGGElement, unknown, null, undefined>;

  private linkGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private nodeGroup!: d3.Selection<SVGGElement, unknown, null, undefined>;

  constructor() {
    effect(() => {
      const data = this.stateService.visibleData();
      if (this.simulation) {
        this.updateGraph(data.nodes, data.links);
      }
    });
  }

  ngAfterViewInit() {
    this.initGraph();
    const data = this.stateService.visibleData();
    if (data.nodes.length > 0) {
      this.updateGraph(data.nodes, data.links);
    }
  }

  ngOnDestroy() {
    if (this.simulation) this.simulation.stop();
  }

  private initGraph() {
    const element = this.svgRef.nativeElement;
    const container = this.containerRef.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.svg = d3.select(element)
      .attr('width', width)
      .attr('height', height)
      .call(d3.zoom<SVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          this.g.attr('transform', event.transform);
        }));

    this.g = this.svg.append('g');

    // Initial Position: Centered and slightly down
    this.g.attr('transform', `translate(${width / 2}, 250) scale(0.8)`);

    this.linkGroup = this.g.append('g').attr('class', 'links');
    this.nodeGroup = this.g.append('g').attr('class', 'nodes');

    this.simulation = d3.forceSimulation<FamilyNode, FamilyLink>()
      .force('link', d3.forceLink<FamilyNode, FamilyLink>()
        .id(d => d.id)
        .distance(180) // Enough space for spouse line
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-2000))
      .force('collide', d3.forceCollide().radius(90).iterations(2))
      .force('y', d3.forceY<FamilyNode>()
        .y(d => {
          if (d.type === 'familyRoot') return -200;
          return (d.generation ?? 0) * 180;
        })
        .strength(3)
      )
      .force('x', d3.forceX(0).strength(0.05));

    this.simulation.on('tick', () => this.ticked());

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        this.svg.attr('width', w).attr('height', h);
        this.simulation.alpha(0.3).restart();
      }
    });
    resizeObserver.observe(container);
  }

  private updateGraph(newNodes: FamilyNode[], newLinks: FamilyLink[]) {
    // 1. Data Prep: Remap IDs to ensure clean D3 binding
    const cleanLinks = newLinks.map(l => ({
      ...l,
      source: typeof l.source === 'object' ? (l.source as FamilyNode).id : l.source,
      target: typeof l.target === 'object' ? (l.target as FamilyNode).id : l.target
    }));

    // 2. Filter Links: STRICT CHECK
    // Ensure both Source and Target exist in the visible nodes list.
    // Also remove links connected to the floating 'familyRoot' title.
    const filteredLinks = cleanLinks.filter(l => {
      const sNode = newNodes.find(n => n.id === l.source);
      const tNode = newNodes.find(n => n.id === l.target);

      // Fix: Must check sNode && tNode are defined
      return sNode && tNode && sNode.type !== 'familyRoot' && tNode.type !== 'familyRoot';
    });

    // 3. Stabilize Nodes (Copy positions)
    const oldNodesMap = new Map(this.simulation.nodes().map(n => [n.id, n]));
    newNodes.forEach(newNode => {
      const oldNode = oldNodesMap.get(newNode.id);
      if (oldNode) {
        newNode.x = oldNode.x;
        newNode.y = oldNode.y;
        newNode.vx = oldNode.vx;
        newNode.vy = oldNode.vy;
      } else if (newNode.parentIds && newNode.parentIds.length > 0) {
        const parentId = newNode.parentIds[0];
        const parentNode = oldNodesMap.get(parentId) || newNodes.find(n => n.id === parentId);
        if (parentNode && parentNode.x && parentNode.y) {
          newNode.x = parentNode.x;
          newNode.y = parentNode.y + 50;
        }
      }
    });

    // 4. Update Links DOM
    const link = this.linkGroup.selectAll<SVGPathElement, FamilyLink>('path')
      .data(filteredLinks, d => d.id);

    link.exit().remove();

    const linkEnter = link.enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

    const linkMerge = linkEnter.merge(link as any);

    // 5. Update Nodes DOM
    const node = this.nodeGroup.selectAll<SVGGElement, FamilyNode>('.node')
      .data(newNodes, d => d.id);

    node.exit().transition().duration(300).attr('opacity', 0).remove();

    const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .call(d3.drag<SVGGElement, FamilyNode>()
        .on('start', (e, d) => this.dragstarted(e, d))
        .on('drag', (e, d) => this.dragged(e, d))
        .on('end', (e, d) => this.dragended(e, d)));

    // Box
    nodeEnter.append('rect')
      .attr('width', 140)
      .attr('height', 60)
      .attr('x', -70)
      .attr('y', -30)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', '#fff')
      .attr('stroke', '#333');

    // Name
    nodeEnter.append('text')
      .attr('class', 'node-name')
      .attr('dy', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text(d => d.name);

    // Details
    nodeEnter.append('text')
      .attr('class', 'node-details')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('pointer-events', 'none')
      .text('');

    // City
    nodeEnter.append('text')
      .attr('class', 'node-city')
      .attr('dy', 18)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-style', 'italic')
      .style('pointer-events', 'none')
      .text('');

    // Expand Indicator
    nodeEnter.append('text')
      .attr('class', 'node-indicator')
      .attr('dy', 28)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .style('fill', '#007bff')
      .style('cursor', 'pointer')
      .text('');

    const nodeMerge = nodeEnter.merge(node);

    // Update Node Content
    nodeMerge.select('.node-name').text(d => d.name);
    nodeMerge.select('.node-details').text(d => {
      if (d.type === 'familyRoot') return '';
      const death = d.deathYear ? d.deathYear : 'Present';
      return `${d.birthYear || '?'} - ${death}`;
    });
    nodeMerge.select('.node-city').text(d => d.city || '');
    nodeMerge.select('.node-indicator').text(d => (!d.childrenIds || d.childrenIds.length === 0) ? '' : (d.isExpanded ? '−' : '+'));

    nodeMerge.select('rect')
      .attr('fill', d => {
        if (d.type === 'familyRoot') return '#e3f2fd';
        if (d.gender === 'M') return '#e8f5e9';
        return '#fff3e0';
      })
      .attr('stroke', d => {
        if (d.isHighlighted) return '#d32f2f';
        if (d.deathYear != null) return '#757575';
        return d.gender === 'M' ? '#2e7d32' : '#ef6c00';
      })
      .attr('stroke-width', d => d.isHighlighted ? 3 : 1.5)
      .attr('stroke-dasharray', d => d.deathYear != null ? '5,3' : null);

    nodeMerge.on('click', (event, d) => {
      event.stopPropagation();
      this.stateService.toggleNodeExpansion(d.id);
      this.stateService.selectNode(d.id);
    });

    // 6. RESTART SIMULATION
    this.simulation.nodes(newNodes);
    this.simulation.force<d3.ForceLink<FamilyNode, FamilyLink>>('link')?.links(filteredLinks);
    this.simulation.alpha(1).restart();

    // 7. APPLY LINK STYLES (Dynamic update)
    linkMerge
      .attr('stroke-dasharray', d => d.relation === 'spouse' ? '5,5' : null)
      .attr('stroke', d => {
        const source = d.source as unknown as FamilyNode;
        const target = d.target as unknown as FamilyNode;

        if (typeof source !== 'object' || typeof target !== 'object') return '#ccc';

        if (source.isHighlighted && target.isHighlighted) {
          const sType = source.highlightType;
          const tType = target.highlightType;
          if ((sType === 'self' || sType === 'ancestor') && tType === 'ancestor') return '#d32f2f';
          if ((sType === 'self' || sType === 'descendant') && tType === 'descendant') return '#d32f2f';
          if (sType === tType) return '#d32f2f';
        }
        return '#ccc';
      })
      .attr('stroke-width', d => {
        const source = d.source as unknown as FamilyNode;
        const target = d.target as unknown as FamilyNode;
        if (typeof source === 'object' && typeof target === 'object' && source.isHighlighted && target.isHighlighted) return 3;
        return 1.5;
      });
  }

  private ticked() {
    this.linkGroup.selectAll<SVGPathElement, FamilyLink>('path')
      .attr('d', d => {
        const sx = (d.source as any).x;
        const sy = (d.source as any).y;
        const tx = (d.target as any).x;
        const ty = (d.target as any).y;

        if (isNaN(sx) || isNaN(sy) || isNaN(tx) || isNaN(ty)) return '';

        if (d.relation === 'spouse') {
          return `M${sx},${sy} L${tx},${ty}`;
        }

        const midY = (sy + ty) / 2;
        return `M${sx},${sy} 
                C${sx},${midY} 
                 ${tx},${midY} 
                 ${tx},${ty}`;
      });

    this.nodeGroup.selectAll('.node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
  }

  private dragstarted(event: any, d: FamilyNode) {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  private dragged(event: any, d: FamilyNode) {
    d.fx = event.x;
    d.fy = event.y;
  }
  private dragended(event: any, d: FamilyNode) {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}