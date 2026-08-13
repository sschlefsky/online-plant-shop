import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerService, Customer } from '../customer.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.css']
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  loading = true;
  error: string | null = null;

  currentUser: any;
  isEmployee = false;

  constructor(
    private customerService: CustomerService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authService.checkSession();

    combineLatest([
      this.authService.isLoggedIn$,
      this.authService.isEmployee$
    ]).subscribe(([loggedIn, isEmployee]) => {
      this.isEmployee = isEmployee;

      if (loggedIn && isEmployee && !this.currentUser) {
        this.loadUserDetails();
      } else if (!loggedIn || !isEmployee) {
        this.loading = false;
      }
    });
  }

  loadUserDetails() {
    this.authService.fetchUserDetails().subscribe({
      next: (details) => {
        this.currentUser = details;
        this.authService.setLogin(details);
        this.loadCustomers();
      },
      error: (err) => {
        console.error('Fehler beim Laden der User-Details', err);
        this.loading = false;
      }
    });
  }

  loadCustomers() {
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        this.customers = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Fehler beim Laden der Kunden';
        this.loading = false;
      }
    });
  }

  goToEditCustomer(customer: Customer): void {
    this.router.navigate(['/edit-customers', customer.customer_id]);
  }
}