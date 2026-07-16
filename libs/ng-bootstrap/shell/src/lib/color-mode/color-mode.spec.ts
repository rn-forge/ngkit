import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RN_FORGE_APP_CONFIG_TOKEN } from '@rn-forge/ng/core';
import { ColorMode } from './color-mode';

describe('ColorMode', () => {
  let component: ColorMode;
  let fixture: ComponentFixture<ColorMode>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColorMode],
      providers: [
        { provide: RN_FORGE_APP_CONFIG_TOKEN, useValue: { name: 'test-app' } },
      ],
    });
    fixture = TestBed.createComponent(ColorMode);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "colorMode"', () => {
    expect(component.configKey).toBe('colorMode');
  });
});
