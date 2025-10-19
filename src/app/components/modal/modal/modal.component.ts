import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css']
})
export class ModalComponent implements OnChanges, OnDestroy {
  @Input() show = false;
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();

  @ViewChild('modalRoot', { static: true }) modalRoot!: ElementRef<HTMLDivElement>;
  private focusTrap?: FocusTrap;
  private previouslyFocusedElement?: HTMLElement | null;

  constructor(private focusTrapFactory: FocusTrapFactory) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['show']) {
      if (this.show) this.activateModal();
      else this.deactivateModal();
    }
  }

  ngOnDestroy(): void {
    this.deactivateModal();
  }

  private activateModal(): void {
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    this.focusTrap = this.focusTrapFactory.create(this.modalRoot.nativeElement);
    this.modalRoot.nativeElement.removeAttribute('inert');
    this.focusTrap.focusInitialElement();
  }

  private deactivateModal(): void {
    this.modalRoot.nativeElement.setAttribute('inert', '');
    this.focusTrap?.destroy();
    this.previouslyFocusedElement?.focus();
  }

  close(): void {
    this.closed.emit();
  }

  // Allow closing with ESC key
  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.show) this.close();
  }
}
