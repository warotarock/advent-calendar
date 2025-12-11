import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableDesign } from './table-design';

describe('TableDesign', () => {
  let component: TableDesign;
  let fixture: ComponentFixture<TableDesign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableDesign]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableDesign);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
