import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-photo-viewer',
  templateUrl: './photo-viewer.component.html',
  styleUrls: ['./photo-viewer.component.scss']
})
export class PhotoViewerComponent {
  isZoomed = false;
  zoomLevel = 2;
  fullscreenIndex: number | null = null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { photos: string[], singleMode?: boolean }) { }

  toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
  }

  openFullscreen(index: number): void {
    this.fullscreenIndex = index;
    this.isZoomed = false;
  }

  closeFullscreen(): void {
    this.fullscreenIndex = null;
    this.isZoomed = false;
  }

  prevPhoto(event: Event): void {
    event.stopPropagation();
    if (this.fullscreenIndex !== null && this.fullscreenIndex > 0) {
      this.fullscreenIndex--;
      this.isZoomed = false;
    }
  }

  nextPhoto(event: Event): void {
    event.stopPropagation();
    if (this.fullscreenIndex !== null && this.fullscreenIndex < this.data.photos.length - 1) {
      this.fullscreenIndex++;
      this.isZoomed = false;
    }
  }
}
