import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product {
  product_id: number;
  name: string;
  price: number;
  description?: string;
  stock_quantity: number;
  image: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private http: HttpClient) { }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/get-products');
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`/api/get-product/${id}`);
  }

  updateProduct(product: Product): Observable<any> {
    return this.http.put('/api/edit-product', product);

  }

  deleteProduct(productId: number): Observable<any> {
    return this.http.delete(`/api/delete-product/${productId}`, { withCredentials: true });
  }
}