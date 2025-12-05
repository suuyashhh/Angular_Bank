import { Directive, ElementRef, Input, OnInit, OnDestroy, Optional, Self } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[autoTabIndex]',
  standalone: true
})
export class AutoTabIndexDirective implements OnInit, OnDestroy {

  @Input() tabIndexOrder: number | null = null;

  private statusSub: Subscription | null = null;

  constructor(
    private el: ElementRef,
    @Self() @Optional() private control: NgControl   // <-- FIXED
  ) {}

  ngOnInit() {
    this.applyTabIndex();

    if (this.control?.statusChanges) {
      this.statusSub = this.control.statusChanges.subscribe(() => {
        this.applyTabIndex();
      });
    }
  }

  private applyTabIndex() {
    // If control not found → treat as always enabled (tabindex 0)
    if (!this.control?.control) {
      this.el.nativeElement.tabIndex = this.tabIndexOrder ?? 0;
      return;
    }

    const isDisabled = this.control.control.disabled;

    this.el.nativeElement.tabIndex =
      isDisabled ? -1 : (this.tabIndexOrder ?? 0);
  }

  ngOnDestroy() {
    this.statusSub?.unsubscribe();
  }
}
