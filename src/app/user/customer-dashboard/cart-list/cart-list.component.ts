import { Component, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartItem, CartService } from './cart.service';

@Component({
  selector: 'app-cart-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-list.component.html',
  styleUrls: ['./cart-list.component.css']
})
export class CartListComponent {
  private cartService = inject(CartService);

  cart = this.cartService.cart$;

  get cartItems(): CartItem[] {
    return this.cart()?.items ?? [];
  }

  get totalPrice(): number {
    return this.cart()?.total_price ?? 0;
  }

  constructor() {
    this.cartService.getCart();

    effect(() => {
      console.log('Aktueller Warenkorb:', this.cart());
    });
  }

  increaseQuantity(item: CartItem): void {
    const unitPrice = item.price / item.quantity;
    this.cartService.updateQuantity(item.product_id, 1, unitPrice);
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity <= 1) {
      this.cartService.removeItem(item);
    } else {
      const unitPrice = item.price / item.quantity;
      this.cartService.updateQuantity(item.product_id, -1, unitPrice);
    }
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  checkout(): void {
    this.cartService.checkout();
    console.log("geklickt im component");
  }
}
