import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestDataDesign } from './test-data-design';

describe('TestDataDesign', () => {
  let component: TestDataDesign;
  let fixture: ComponentFixture<TestDataDesign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestDataDesign]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestDataDesign);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
