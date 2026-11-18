import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RNF_PERMISSION } from './auth.config';
import {
  HasAnyPermissionDirective,
  HasPermissionDirective,
} from './auth.directives';
import { Permission } from './auth.types';

// ---------------------------------------------------------------------------
// Shared mock factory
// ---------------------------------------------------------------------------

function buildMockPermission(): Permission {
  return {
    hasPermission: vi.fn().mockReturnValue(false),
    hasAnyPermission: vi.fn().mockReturnValue(false),
  };
}

// ---------------------------------------------------------------------------
// HasPermissionDirective
// ---------------------------------------------------------------------------

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `<ng-template [rnfHasPermission]="perm"
    ><span class="guarded">Protected</span></ng-template
  >`,
})
class PermHostComponent {
  perm = 'read';
}

@Component({
  standalone: true,
  imports: [HasPermissionDirective],
  template: `@if (show()) {
    <ng-template [rnfHasPermission]="perm()"
      ><span class="guarded">Protected</span></ng-template
    >
  }`,
})
class SignalPermHostComponent {
  show = signal(true);
  perm = signal('a');
}

function buildSetPolicy(allowed: Set<string>): Permission {
  return {
    hasPermission: (key: string) => allowed.has(key),
    hasAnyPermission: (...keys: string[]) => keys.some((k) => allowed.has(k)),
  };
}

function countNodes(fixture: ComponentFixture<unknown>, cls: string): number {
  return fixture.nativeElement.querySelectorAll(cls).length;
}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<PermHostComponent>;
  let component: PermHostComponent;
  let mockPerm: Permission;

  beforeEach(async () => {
    mockPerm = buildMockPermission();
    await TestBed.configureTestingModule({
      imports: [PermHostComponent],
      providers: [{ provide: RNF_PERMISSION, useValue: mockPerm }],
    });
    fixture = TestBed.createComponent(PermHostComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders the template content when the user has the permission', () => {
    (mockPerm.hasPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.guarded')).not.toBeNull();
  });

  it('does not render the template content when the user lacks the permission', () => {
    (mockPerm.hasPermission as ReturnType<typeof vi.fn>).mockReturnValue(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.guarded')).toBeNull();
  });

  it('calls hasPermission with the bound permission string', () => {
    component.perm = 'admin';
    fixture.detectChanges();
    expect(mockPerm.hasPermission).toHaveBeenCalledWith('admin');
  });

  describe('rendered views', () => {
    let allowed: Set<string>;
    let sf: ComponentFixture<SignalPermHostComponent>;

    beforeEach(() => {
      allowed = new Set(['a', 'b', 'c']);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [SignalPermHostComponent],
        providers: [
          { provide: RNF_PERMISSION, useValue: buildSetPolicy(allowed) },
        ],
      });
      sf = TestBed.createComponent(SignalPermHostComponent);
    });

    it('renders one view across allowed-to-allowed changes', () => {
      sf.detectChanges();
      expect(countNodes(sf, '.guarded')).toBe(1);
      sf.componentInstance.perm.set('b');
      sf.detectChanges();
      expect(countNodes(sf, '.guarded')).toBe(1);
      sf.componentInstance.perm.set('a');
      sf.detectChanges();
      expect(countNodes(sf, '.guarded')).toBe(1);
    });

    it('renders one view across deny and allow transitions', () => {
      const counts: number[] = [];
      for (const key of ['a', 'x', 'b', 'y']) {
        sf.componentInstance.perm.set(key);
        sf.detectChanges();
        counts.push(countNodes(sf, '.guarded'));
      }
      expect(counts).toEqual([1, 0, 1, 0]);
    });

    it('removes the content when the host is destroyed', () => {
      sf.detectChanges();
      sf.componentInstance.perm.set('b');
      sf.detectChanges();
      sf.componentInstance.show.set(false);
      sf.detectChanges();
      expect(countNodes(sf, '.guarded')).toBe(0);
      expect(() => sf.destroy()).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// HasAnyPermissionDirective
// ---------------------------------------------------------------------------

@Component({
  standalone: true,
  imports: [HasAnyPermissionDirective],
  template: `<ng-template [rnfHasAnyPermission]="perms"
    ><span class="multi-guarded">Protected</span></ng-template
  >`,
})
class AnyPermHostComponent {
  perms: string[] = ['read'];
}

@Component({
  standalone: true,
  imports: [HasAnyPermissionDirective],
  template: `@if (show()) {
    <ng-template [rnfHasAnyPermission]="perms()"
      ><span class="multi-guarded">Protected</span></ng-template
    >
  }`,
})
class SignalAnyPermHostComponent {
  show = signal(true);
  perms = signal<string[]>(['a']);
}

describe('HasAnyPermissionDirective', () => {
  let fixture: ComponentFixture<AnyPermHostComponent>;
  let component: AnyPermHostComponent;
  let mockPerm: Permission;

  beforeEach(async () => {
    mockPerm = buildMockPermission();
    await TestBed.configureTestingModule({
      imports: [AnyPermHostComponent],
      providers: [{ provide: RNF_PERMISSION, useValue: mockPerm }],
    });
    fixture = TestBed.createComponent(AnyPermHostComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders the template when the user has at least one permission', () => {
    (mockPerm.hasAnyPermission as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.multi-guarded'),
    ).not.toBeNull();
  });

  it('does not render the template when the user has none of the permissions', () => {
    (mockPerm.hasAnyPermission as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.multi-guarded')).toBeNull();
  });

  it('spreads the permissions array into hasAnyPermission', () => {
    component.perms = ['edit', 'admin'];
    fixture.detectChanges();
    expect(mockPerm.hasAnyPermission).toHaveBeenCalledWith('edit', 'admin');
  });

  describe('rendered views', () => {
    let allowed: Set<string>;
    let sf: ComponentFixture<SignalAnyPermHostComponent>;

    beforeEach(() => {
      allowed = new Set(['a', 'b', 'c']);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [SignalAnyPermHostComponent],
        providers: [
          { provide: RNF_PERMISSION, useValue: buildSetPolicy(allowed) },
        ],
      });
      sf = TestBed.createComponent(SignalAnyPermHostComponent);
    });

    it('renders one view across allowed-to-allowed changes', () => {
      sf.detectChanges();
      expect(countNodes(sf, '.multi-guarded')).toBe(1);
      sf.componentInstance.perms.set(['b']);
      sf.detectChanges();
      expect(countNodes(sf, '.multi-guarded')).toBe(1);
      sf.componentInstance.perms.set(['b']);
      sf.detectChanges();
      expect(countNodes(sf, '.multi-guarded')).toBe(1);
      sf.componentInstance.perms.set(['a', 'c']);
      sf.detectChanges();
      expect(countNodes(sf, '.multi-guarded')).toBe(1);
    });

    it('renders one view across deny and allow transitions', () => {
      const counts: number[] = [];
      for (const keys of [['a'], ['x'], ['b'], ['y']]) {
        sf.componentInstance.perms.set(keys);
        sf.detectChanges();
        counts.push(countNodes(sf, '.multi-guarded'));
      }
      expect(counts).toEqual([1, 0, 1, 0]);
    });

    it('removes the content when the host is destroyed', () => {
      sf.detectChanges();
      sf.componentInstance.perms.set(['b']);
      sf.detectChanges();
      sf.componentInstance.show.set(false);
      sf.detectChanges();
      expect(countNodes(sf, '.multi-guarded')).toBe(0);
      expect(() => sf.destroy()).not.toThrow();
    });
  });
});
