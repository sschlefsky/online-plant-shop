import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Order {
  order_id: number;
  customer_id: number;
  date: string;
  delivery_status: string;
  total_price: number;
  payment_method: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(private http: HttpClient) {
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('/api/get-orders');
  }

  getOrderById(id: number): Observable<Order> {
    return this.http.get<Order>(`/api/get-order/${id}`);
  }

  editOrder(order: Order | null): void {
    if (order == null) {
      return;
    }
    this.http.post('/api/edit-order', {
      order_id: order.order_id,
      customer_id: order.customer_id,
      date: order.date,
      delivery_status: order.delivery_status,
      total_price: order.total_price,
      payment_method: order.payment_method,
    }).subscribe({
      error: () => {
        alert('Fehler beim Aktualisieren der Bestellung.');
      }
    });
  }
}
