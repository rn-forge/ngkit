import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Watermark } from './watermark';

describe('Watermark', () => {
  let component: Watermark;
  let fixture: ComponentFixture<Watermark>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Watermark],
    });
    fixture = TestBed.createComponent(Watermark);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "watermark"', () => {
    expect(component.configKey).toBe('watermark');
  });

  it('defaults to "text-bg-warning" class from defaultOptions', () => {
    expect(component.config.class).toBe('text-bg-warning');
  });
});
