// external imports
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterContentChecked,
  AfterContentInit,
  AfterViewChecked,
  AfterViewInit,
  Component,
  DoCheck,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  afterNextRender,
} from '@angular/core';

// internal imports
import { DEBUG_MODE } from './core.utils';

/**
 * Abstract base component providing lifecycle hooks, a DEBUG signal, and a
 * deferred-init hook (delayedAfterViewInit) that runs after the first render.
 * Does NOT inject RouteService or ActivatedRoute — components that need routing
 * should inject RouteService directly.
 */
@Component({
  template: '',
})
export abstract class BaseComponent
  implements
    OnChanges,
    OnInit,
    DoCheck,
    AfterContentInit,
    AfterContentChecked,
    AfterViewInit,
    AfterViewChecked,
    OnDestroy
{
  private _NAME: string = this.constructor.name;

  constructor() {
    afterNextRender(() => {
      this.delayedAfterViewInit();
    });
  }

  get DEBUG(): boolean {
    return DEBUG_MODE();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.DEBUG) console.debug(`${this._NAME}.ngOnChanges:`, changes);
  }

  ngOnInit(): void {
    if (this.DEBUG) console.debug(`${this._NAME}.ngOnInit`);
  }

  ngDoCheck(): void {
    if (this.DEBUG) console.debug(`${this._NAME}.ngDoCheck`);
  }

  ngAfterContentInit(): void {
    if (this.DEBUG) console.debug(`${this._NAME}.ngAfterContentInit`);
  }

  ngAfterContentChecked(): void {
    if (this.DEBUG) console.debug(`${this._NAME}.ngAfterContentChecked`);
  }

  ngAfterViewInit(): void {
    if (this.DEBUG) console.debug(`${this._NAME}.ngAfterViewInit`);
  }

  delayedAfterViewInit(): void {
    if (this.DEBUG) console.debug(`${this._NAME}.delayedAfterViewInit`);
  }

  ngAfterViewChecked(): void {
    if (this.DEBUG) console.debug(`${this._NAME}.ngAfterViewChecked`);
  }

  ngOnDestroy(): void {
    if (this.DEBUG) console.debug(`${this._NAME}.ngOnDestroy`);
  }

  handleErrorResponse(response: HttpErrorResponse, message?: string): void {
    console.error(
      (message ?? response.error?.message) + ` [${response.error?.error}]`,
    );
  }
}
