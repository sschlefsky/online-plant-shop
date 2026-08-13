import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductChangeLog {
  product_change_id: number;
  employee_id: number | null;
  product_id: number;
  field_changed: string;
  change_date: Date;
  field_before: string;
  field_after: string;
}

export interface UserChangeLog {
  user_change_id: number;
  user_id: number;
  employee_id: number | null;
  field_changed: string;
  change_date: Date;
  field_before: string;
  field_after: string;
}

export interface OrderChangeLog {
  order_change_id: number;
  order_id: number;
  employee_id: number | null;
  field_changed: string;
  change_date: Date;
  field_before: string;
  field_after: string;
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  constructor(private http: HttpClient) { }

  getAllChangeLogs(): Observable<{
    products: ProductChangeLog[],
    users: UserChangeLog[],
    orders: OrderChangeLog[]
  }> {
    return this.http.get<{
      products: ProductChangeLog[],
      users: UserChangeLog[],
      orders: OrderChangeLog[]
    }>('/api/get-logs');
  }
}