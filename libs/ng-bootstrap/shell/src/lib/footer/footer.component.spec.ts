import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    });
    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('has configKey "footer"', () => {
    expect(component.configKey).toBe('footer');
  });

  describe('menuPositionClass', () => {
    function menuPositionClass(): string {
      return (
        component as unknown as { menuPositionClass: () => string }
      ).menuPositionClass();
    }

    it('uses the "s" margin for the default (right) menu position', () => {
      expect(menuPositionClass()).toBe('ms-auto');
    });

    it('uses the "e" margin when menuPosition is "left"', () => {
      fixture.componentRef.setInput('options', { menuPosition: 'left' });
      fixture.detectChanges();
      expect(menuPositionClass()).toBe('me-auto');
    });

    it('uses the "x" margin for any other menu position', () => {
      fixture.componentRef.setInput('options', { menuPosition: 'center' });
      fixture.detectChanges();
      expect(menuPositionClass()).toBe('mx-auto');
    });

    it('adds breakpoint-specific classes when a breakpoint is configured', () => {
      fixture.componentRef.setInput('options', {
        menuPosition: 'left',
        breakpoint: 'md',
      });
      fixture.detectChanges();
      expect(menuPositionClass()).toBe('mx-auto mx-md-0 me-md-auto');
    });
  });
});
