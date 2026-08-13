import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService, Product } from '../product.service';
import { CartService } from '../../user/customer-dashboard/cart-list/cart.service';
import { AuthService } from '../../auth.service';
import { CommonModule, Location } from '@angular/common';
import { SocketService } from '../../socket.service';

import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', [animate('300ms ease-in-out')])
    ])
  ]
})
export class ProductDetailComponent implements OnInit {
  product: (Product & { infoText?: string; care?: string }) | null = null;
  isCustomer = false;
  showCare = false;
  showInfo = false;
  showLowStock = false;

  recommendedProducts: Product[] = [];

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private socketService: SocketService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productService.getProducts().subscribe(products => {
          const found = products.find(p => p.product_id === +id) || null;
          if (found) {
            this.product = found;

            this.recommendedProducts = products
              .filter(p => p.product_id !== +id)
              .sort(() => 0.5 - Math.random())
              .slice(0, 3);
          }
        });
      }
    });

    this.authService.isCustomer$.subscribe(status => {
      this.isCustomer = status;
    });

    this.socketService.onLowStock().subscribe((data) => {
      if (this.product && data.product_id === this.product.product_id) {
        this.showLowStock = data.stock <= 5;
      }
    });
  }

  goToProduct(id: number): void {
    this.router.navigate(['/product', id]);
  }

  addToCart(): void {
    if (this.product) {
      this.cartService.add(this.product);
      alert(`${this.product.name} wurde zum Warenkorb hinzugefügt.`);
    }
  }

  goBack(): void {
    this.location.back();
  }

  goToCart(): void {
    this.router.navigate([this.isCustomer ? '/cart' : '/login']);
  }

  toggleCare(): void {
    this.showCare = !this.showCare;
  }

  toggleInfo(): void {
    this.showInfo = !this.showInfo;
  }
}
