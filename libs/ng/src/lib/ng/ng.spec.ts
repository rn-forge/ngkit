import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ng } from './ng';

describe('Ng', () => {
  let component: Ng;
  let fixture: ComponentFixture<Ng>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ng],
    }).compileComponents();

    fixture = TestBed.createComponent(Ng);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
