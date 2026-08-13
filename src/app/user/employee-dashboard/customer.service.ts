import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Customer {
  customer_id: number;
  user_id: number;
  address_id: number;
  first_name: string;
  last_name: string;
  email: string;
  street: string;
  house_number: string;
  zipcode: string;
  country: string;
  city: string;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  constructor(private http: HttpClient) { }

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>('/api/get-customers');
  }

  getCustomerById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`/api/get-customer/${id}`);
  }

  updateCustomer(customer: Customer): Observable<any> {
    return this.http.put('/api/edit-customer', {
      customer_id: customer.customer_id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      street: customer.street,
      house_number: customer.house_number,
      zipcode: customer.zipcode,
      country: customer.country,
      city: customer.city
    });
  }

  deleteCustomer(customerId: number): Observable<any> {
    return this.http.delete(`/api/delete-customer/${customerId}`);
  }
}