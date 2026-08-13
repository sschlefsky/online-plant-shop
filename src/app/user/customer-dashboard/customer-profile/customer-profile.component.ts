import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth.service';
import { combineLatest } from 'rxjs';
import { LoginComponent } from '../../login/login.component';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, LoginComponent],
  templateUrl: './customer-profile.component.html',
  styleUrl: './customer-profile.component.css',
  standalone: true,
})

export class CustomerProfileComponent implements OnInit {
  currentUser: any;
  isCustomer = false;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.authService.checkSession();

    combineLatest([
      this.authService.isLoggedIn$,
      this.authService.isCustomer$
    ]).subscribe(([loggedIn, isCustomer$]) => {
      this.isCustomer = isCustomer$;

      if (loggedIn && isCustomer$ && !this.currentUser) {
        this.loadUserDetails();
      }
    });
  }

  loadUserDetails() {
    this.authService.fetchUserDetails().subscribe({
      next: (details) => {
        this.currentUser = details;
        this.authService.setLogin(details);
      },
      error: (err) => {
        console.error('Fehler beim Laden der User-Details', err);
      }
    });
  }
}
