import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgBootstrap } from './ng-bootstrap';

describe('NgBootstrap', () => {
  let component: NgBootstrap;
  let fixture: ComponentFixture<NgBootstrap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgBootstrap],
    }).compileComponents();

    fixture = TestBed.createComponent(NgBootstrap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
