import { Component, inject } from '@angular/core';
import { GraphStateService } from '../../services/graph-state.service';

@Component({
  selector: 'app-family-filters',
  standalone: false,
  templateUrl: './family-filters.component.html',
  styleUrls: ['./family-filters.component.scss']
})
export class FamilyFiltersComponent {
  availableCities = ['Delhi', 'Mumbai', 'Bengaluru', 'Pune', 'Village', 'London', 'New York'];
  private stateService = inject(GraphStateService);
  filters = this.stateService.filterState;

  toggleGender(g: string, checked: boolean) { this.stateService.toggleFilterGender(g, checked); }
  toggleCity(c: string, checked: boolean) { this.stateService.toggleFilterCity(c, checked); }
  setStatus(s: 'all' | 'alive' | 'deceased') { this.stateService.setAliveStatus(s); }
  clearSelection() { this.stateService.selectNode(null); }
}