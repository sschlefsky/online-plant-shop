import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';

  constructor(public authService: AuthService, private router: Router) { }

  onSubmit() {
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.authService.setLogin(res);
        if (res.role === 'customer') {
          this.router.navigate(['/products']);
        } else if (res.role === 'employee') {
          this.router.navigate(['/products-admin']);
        }
      },
      error: (err) => {
        this.error = 'Login fehlgeschlagen!';
      }
    });
  }
}