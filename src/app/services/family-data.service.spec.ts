import { TestBed } from '@angular/core/testing';

import { FamilyDataService } from './family-data.service';

describe('FamilyDataService', () => {
  let service: FamilyDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FamilyDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
