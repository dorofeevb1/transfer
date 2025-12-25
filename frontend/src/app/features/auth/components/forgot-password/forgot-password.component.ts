import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AuthService } from 'src/app/core/services/api-service/auth.service'; // Added import

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  forgotPasswordForm!: FormGroup;
  submitted = false;
  isLoading = false; // Added loading state

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private location: Location,
    private authService: AuthService // Injected service
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

    this.isLoading = true;
    const email = this.f['email'].value;

    // FIXED: Use the correct method that accepts only an email
    this.authService.requestPasswordReset(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/auth/password-reset-confirmation'], { queryParams: { email: email } });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error sending reset email', err);
        // Optional: display user-friendly error
      }
    });
  }

  goBack(): void {
    this.location.back();
  }
}
