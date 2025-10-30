import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  submitted = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get f() { return this.forgotPasswordForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (this.forgotPasswordForm.invalid) {
      return;
    }
    // ИЗМЕНЕНО: this.f.email.value на this.f['email'].value
    const email = this.f['email'].value;
    this.router.navigate(['/auth/password-reset-confirmation'], { queryParams: { email: email } });
  }

  goBack(): void {
    this.location.back();
  }
}
