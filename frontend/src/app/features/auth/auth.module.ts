import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AuthRoutingModule } from './auth-routing.module';
import { SharedModule } from '../../shared/shared.module';

import { AuthComponent } from './components/auth/auth.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { PasswordResetConfirmationComponent } from './components/password-reset-confirmation/password-reset-confirmation.component';

@NgModule({
    declarations: [
        AuthComponent,
        ForgotPasswordComponent,
        PasswordResetConfirmationComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        SharedModule, // Импортируем SharedModule
        AuthRoutingModule
    ]
})
export class AuthModule { }
