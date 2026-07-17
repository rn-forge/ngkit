import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Brand } from './brand';

describe('Brand', () => {
  let component: Brand;
  let fixture: ComponentFixture<Brand>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Brand],
    });
    fixture = TestBed.createComponent(Brand);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "brand"', () => {
    expect(component.configKey).toBe('brand');
  });
});
