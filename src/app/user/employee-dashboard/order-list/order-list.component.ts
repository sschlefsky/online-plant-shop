import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService, Order } from '../order.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth.service';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-list.component.html',
  styleUrls: ['./order-list.component.css']
})
export class OrderListComponent implements OnInit {
  orders: Order[] = [];
  loading: boolean = true;
  error: string | null = null;

  currentUser: any;
  isEmployee = false;

  constructor(
    private orderService: OrderService,
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
      }
    });
    this.loadOrders();
  }

  loadOrders() {
    this.orderService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: () => {
        this.error = 'Fehler beim Laden der Bestellungen';
        this.loading = false;
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

  goToEditOrder(order: Order): void {
    this.router.navigate(['/edit-orders', order.order_id]);
  }
}