import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../../../products/product.service';
import { AuthService } from '../../../auth.service';
import { HttpClient } from '@angular/common/http';

export interface CartItem {
  product_id: number;
  name: string;
  description: string;
  image_url: string;
  quantity: number;
  price: number;
}

export interface Cart {
  cart_id: number;
  items: CartItem[];
  total_price: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private userId: number | null = null;

  private cart = signal<Cart | null>(null);
  readonly cart$ = computed(() => this.cart());

  constructor(private auth: AuthService, private http: HttpClient) {
    this.auth.currentUser$.subscribe(user => {
      this.userId = user?.user_id ?? null;
      if (this.userId && user?.type === 'Customer') {
        this.getCart();
      }
    });
  }

  add(p: Product, qty = 1): void {
    if (!this.userId) {
      alert('Bitte zuerst einloggen');
      return;
    }

    this.http.post('/api/cart/add', {
      customer_id: this.userId,
      product_id: p.product_id,
      quantity: qty,
      price: p.price * qty
    }).subscribe({
      next: () => {
        console.log('Artikel erfolgreich hinzugefügt');
        this.getCart();
      },
      error: () => {
        alert('Fehler beim Hinzufügen zum Warenkorb');
      }
    });
  }

  getCart(): void {
    this.http.get<Cart>('/api/get-cart').subscribe({
      next: (cart) => this.cart.set(cart),
      error: () => {
        alert('Fehler beim Laden des Warenkorbs');
        this.cart.set(null);
      }
    });
  }

  updateQuantity(product_id: number, delta: number, unitPrice: number): void {
    if (!this.userId) {
      alert('Bitte zuerst einloggen');
      return;
    }

    this.http.post('/api/cart/add', {
      customer_id: this.userId,
      product_id,
      quantity: delta,
      price: unitPrice * delta
    }).subscribe({
      next: () => {
        console.log(`Artikelmenge um ${delta > 0 ? '+' : ''}${delta} geändert`);
        this.getCart();
      },
      error: () => {
        alert('Fehler beim Aktualisieren der Artikelmenge');
      }
    });
  }

  removeItem(item: CartItem): void {
    if (!this.userId) {
      alert('Bitte zuerst einloggen');
      return;
    }

    const unitPrice = item.price / item.quantity;

    this.http.post('/api/cart/add', {
      customer_id: this.userId,
      product_id: item.product_id,
      quantity: -item.quantity,
      price: -unitPrice * item.quantity
    }).subscribe({
      next: () => {
        console.log('Artikel entfernt');
        this.getCart();
      },
      error: () => {
        alert('Fehler beim Entfernen des Artikels');
      }
    });
  }

  clearCart(): void {
    if (!this.userId) {
      alert('Bitte zuerst einloggen');
      return;
    }

    this.http.post('/api/cart/clear', { customer_id: this.userId }).subscribe({
      next: () => {
        console.log('Warenkorb wurde geleert');
        this.getCart();
      },
      error: () => {
        alert('Fehler beim Leeren des Warenkorbs');
      }
    });
  }

  checkout() {
    if (!this.userId) {
      alert('Bitte zuerst einloggen');
      return;
    }

    this.http.post<{ order_id: number; message: string }>(
      '/api/cart/checkout',
      {}
    ).subscribe({
      next: (resp) => {
        console.log('Checkout erfolgreich:', resp);
        alert(`Bestellung #${resp.order_id} erfolgreich!`);
        this.getCart();
      },
      error: (err) => {
        console.error('Checkout Fehler:', err);
        alert('Checkout fehlgeschlagen');
      }
    });
  }
}