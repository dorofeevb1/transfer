import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { PasswordResetConfirmationComponent } from './components/password-reset-confirmation/password-reset-confirmation.component';

const routes: Routes = [
    {
        // Пустой путь будет вести на страницу входа
        path: '',
        component: AuthComponent
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordComponent
    },
    {
        path: 'password-reset-confirmation',
        component: PasswordResetConfirmationComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AuthRoutingModule { }
