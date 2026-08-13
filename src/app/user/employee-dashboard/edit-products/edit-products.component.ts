import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService, Product } from '../../../products/product.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth.service';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'app-edit-products',
  templateUrl: './edit-products.component.html',
  styleUrls: ['./edit-products.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class EditProductsComponent implements OnInit, OnDestroy {
  productForm!: FormGroup;
  product: Product | null = null;
  error = '';
  successMessage = '';

  currentUser: any = null;
  isEmployee = false;

  private authSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.productForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      stock_quantity: ['', [Validators.required, Validators.min(0)]],
      image: ['', [Validators.required]]
    });
  }

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
      this.error = 'Ungültige Produkt-ID.';
      return;
    }
    this.loadProduct(id);
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

  loadProduct(id: number): void {
    this.productService.getProductById(id).subscribe({
      next: (product) => {
        if (product) {
          this.product = product;
          this.productForm.patchValue({
            name: product.name,
            description: product.description,
            price: product.price,
            stock_quantity: product.stock_quantity,
            image: product.image
          });
          this.error = '';
        } else {
          this.error = 'Produkt nicht gefunden.';
        }
      },
      error: () => {
        this.error = 'Fehler beim Laden des Produkts.';
      },
    });
  }

  onSubmit(): void {
    if (this.productForm.invalid || !this.product) {
      return;
    }

    const updatedProduct = {
      product_id: this.product.product_id,
      ...this.productForm.value
    };

    this.productService.updateProduct(updatedProduct).subscribe({
      next: (response) => {
        this.successMessage = 'Produkt erfolgreich aktualisiert!';
        this.loadProduct(this.product!.product_id);
      },
      error: (error) => {
        this.error = error.error.message || 'Fehler beim Aktualisieren des Produkts';
      }
    });
  }

  deleteProduct(): void {
    if (!this.product || !confirm('Möchten Sie dieses Produkt wirklich löschen?')) {
      return;
    }

    this.productService.deleteProduct(this.product.product_id).subscribe({
      next: () => {
        this.successMessage = 'Produkt erfolgreich gelöscht!';
        setTimeout(() => {
          this.router.navigate(['/products-admin']);
        }, 1500);
      },
      error: (error) => {
        this.error = error.error.message || 'Fehler beim Löschen des Produkts';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/products-admin']);
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }
}