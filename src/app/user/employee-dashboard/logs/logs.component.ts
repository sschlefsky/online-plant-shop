import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth.service';
import { combineLatest } from 'rxjs';
import { LogService } from '../logs.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css'],
})
export class LogsComponent implements OnInit {
  currentUser: any;
  isEmployee = false;
  logs: any;
  loading = false;
  error: string | null = null;

  selectedLogType: 'products' | 'orders' | 'users' = 'products';

  constructor(
    private authService: AuthService,
    private logsService: LogService
  ) { }

  ngOnInit(): void {
    this.authService.checkSession();

    combineLatest([
      this.authService.isLoggedIn$,
      this.authService.isEmployee$
    ]).subscribe(([loggedIn, isEmployee]) => {
      this.isEmployee = isEmployee;

      if (loggedIn && isEmployee && !this.currentUser) {
        this.loadUserDetails();
        this.loadLogs();
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

  loadLogs() {
    this.loading = true;
    this.error = null;

    this.logsService.getAllChangeLogs().subscribe({
      next: (data) => {
        this.logs = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Fehler beim Laden der Log-Daten';
        this.loading = false;
      }
    });
  }
}