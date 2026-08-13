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
export class MyOrdersService {
  constructor(private http: HttpClient) {
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('/api/get-my-orders');
  }
}
