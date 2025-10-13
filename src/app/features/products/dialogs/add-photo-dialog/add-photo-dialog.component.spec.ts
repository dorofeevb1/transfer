import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPhotoDialogComponent } from './add-photo-dialog.component';

describe('AddPhotoDialogComponent', () => {
  let component: AddPhotoDialogComponent;
  let fixture: ComponentFixture<AddPhotoDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddPhotoDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPhotoDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
