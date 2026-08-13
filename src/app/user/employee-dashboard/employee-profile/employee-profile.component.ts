import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-profile.component.html',
  styleUrls: ['./employee-profile.component.css']
})
export class EmployeeProfileComponent implements OnInit {
  currentUser: any;
  isEmployee = false;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.authService.checkSession();

    combineLatest([
      this.authService.isLoggedIn$,
      this.authService.isEmployee$
    ]).subscribe(([loggedIn, isEmployee]) => {
      this.isEmployee = isEmployee;

      if (loggedIn && isEmployee && !this.currentUser) {
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