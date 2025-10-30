import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-photo-viewer',
  templateUrl: './photo-viewer.component.html',
  styleUrls: ['./photo-viewer.component.scss']
})
export class PhotoViewerComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { photos: string[] }) { }
}