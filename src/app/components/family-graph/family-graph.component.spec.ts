import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FamilyGraphComponent } from './family-graph.component';

describe('FamilyGraphComponent', () => {
  let component: FamilyGraphComponent;
  let fixture: ComponentFixture<FamilyGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FamilyGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FamilyGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
