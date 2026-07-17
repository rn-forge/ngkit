import { Component } from '@angular/core';
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
});
