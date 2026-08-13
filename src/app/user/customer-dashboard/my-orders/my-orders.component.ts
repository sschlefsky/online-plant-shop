import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest } from 'rxjs';

import { MyOrdersService, Order } from './my-orders.service';
import { AuthService } from '../../../auth.service';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.css']
})
export class MyOrdersComponent implements OnInit {
  orders: Order[] = [];
  error: string | null = null;

  currentUser: any;
  isCustomer = false;

  constructor(
    private orderService: MyOrdersService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.checkSession();

    combineLatest([
      this.authService.isLoggedIn$,
      this.authService.isCustomer$
    ]).subscribe(([loggedIn, isCustomer]) => {
      this.isCustomer = isCustomer;

      if (loggedIn && isCustomer && !this.currentUser) {
        this.loadUserDetails();
      }
    });
  }

  loadUserDetails(): void {
    this.authService.fetchUserDetails().subscribe({
      next: (details) => {
        this.currentUser = details;
        this.authService.setLogin(details);
        this.loadOrders();
      },
      error: (err) => {
        console.error('Fehler beim Laden der User-Details', err);
      }
    });
  }

  loadOrders(): void {
    this.orderService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
      },
      error: () => {
        this.error = 'Fehler beim Laden der Bestellungen';
      }
    });
  }
}
