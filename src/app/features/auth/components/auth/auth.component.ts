import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
    this.authError = false; // Сбрасываем ошибку перед новой попыткой

    if (this.loginForm.invalid) {
      return;
    }

    const email = this.f['email'].value;
    const password = this.f['password'].value;

    this.authService.login(email, password).subscribe(success => {
      if (success) {
        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin']); // Админа на страницу админки
        } else {
          this.router.navigate(['/products']); // Обычного пользователя на страницу продуктов
        }
      } else {
        this.authError = true; // Если логин не удался
      }
    });
  }

}
