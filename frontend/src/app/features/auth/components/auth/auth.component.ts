import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router'; // Можно убрать, если не используется в других методах
import { AuthService } from 'src/app/core/services/api-service/auth.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  passwordVisible = false;
  authError = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  get f() { return this.loginForm.controls; }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  onSubmit(): void {
    this.submitted = true;
    this.authError = false;

    if (this.loginForm.invalid) {
      return;
    }

    const email = this.f['email'].value;
    const password = this.f['password'].value;

    this.authService.login(email, password).subscribe({
      next: (success) => {
        if (success) {
          // УДАЛЕНО: this.router.navigate...
          // Причина: AuthService уже сделал редирект внутри tap()
          // Если оставить здесь, возникнет гонка или ошибка маршрута
          console.log('Login successful, redirect handled by service');
        } else {
          this.authError = true;
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        this.authError = true;
      }
    });
  }
}
