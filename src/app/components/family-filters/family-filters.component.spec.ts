import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FamilyFiltersComponent } from './family-filters.component';

describe('FamilyFiltersComponent', () => {
  let component: FamilyFiltersComponent;
  let fixture: ComponentFixture<FamilyFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FamilyFiltersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FamilyFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
