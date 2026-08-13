import { Component, OnInit, OnDestroy } from '@angular/core';
import { Order, OrderService } from '../order.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../auth.service';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'app-edit-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-orders.component.html',
  styleUrls: ['./edit-orders.component.css'],
  standalone: true,
})
export class EditOrdersComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  error: string = '';

  currentUser: any = null;
  isEmployee = false;

  private authSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.checkSession();

    this.authSub = combineLatest([
      this.authService.isLoggedIn$,
      this.authService.isEmployee$,
    ]).subscribe(([loggedIn, isEmployee]) => {
      this.isEmployee = isEmployee;

      if (loggedIn && isEmployee && !this.currentUser) {
        this.loadUserDetails();
      }
    });

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.error = 'Ungültige Bestellung-ID.';
      return;
    }
    this.loadOrder(id);
  }

  loadUserDetails() {
    this.authService.fetchUserDetails().subscribe({
      next: (details) => {
        this.currentUser = details;
        this.authService.setLogin(details);
      },
      error: (err) => {
        console.error('Fehler beim Laden der User-Details', err);
      },
    });
  }

  loadOrder(id: number): void {
    this.orderService.getOrderById(id).subscribe({
      next: (order) => {
        if (order) {
          this.order = order;
          this.error = '';
        } else {
          this.error = 'Bestellung nicht gefunden.';
        }
      },
      error: () => {
        this.error = 'Fehler beim Laden der Bestellung.';
      },
    });
  }

  editOrder(): void {
    this.orderService.editOrder(this.order);
    this.goBack();
  }

  goBack(): void {
    this.router.navigate(['/orders-admin']);
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }
}