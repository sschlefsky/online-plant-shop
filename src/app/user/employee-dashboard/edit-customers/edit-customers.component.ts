import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService, Customer } from '../customer.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth.service';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'app-edit-customers',
  templateUrl: './edit-customers.component.html',
  styleUrls: ['./edit-customers.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class EditCustomersComponent implements OnInit, OnDestroy {
  customerForm!: FormGroup;
  customer: Customer | null = null;
  error = '';
  successMessage = '';

  currentUser: any = null;
  isEmployee = false;

  private authSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private customerService: CustomerService,
    private router: Router,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.customerForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      street: ['', [Validators.required]],
      house_number: ['', [Validators.required]],
      zipcode: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['', [Validators.required]]
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
      this.error = 'Ungültige Kunden-ID.';
      return;
    }
    this.loadCustomer(id);
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

  loadCustomer(id: number): void {
    this.customerService.getCustomerById(id).subscribe({
      next: (customer) => {
        if (customer) {
          this.customer = customer;
          this.customer.customer_id = customer.user_id;
          this.customerForm.patchValue({
            first_name: customer.first_name,
            last_name: customer.last_name,
            email: customer.email,
            street: customer.street,
            house_number: customer.house_number,
            zipcode: customer.zipcode,
            city: customer.city,
            country: customer.country
          });
          this.error = '';
        } else {
          this.error = 'Kunde nicht gefunden.';
        }
      },
      error: () => {
        this.error = 'Fehler beim Laden des Kunden.';
      },
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid || !this.customer) {
      return;
    }

    const updatedCustomer = {
      customer_id: this.customer.customer_id,
      ...this.customerForm.value
    };

    this.customerService.updateCustomer(updatedCustomer).subscribe({
      next: (response) => {
        this.successMessage = 'Kunde erfolgreich aktualisiert!';
        this.loadCustomer(this.customer!.customer_id);
        this.router.navigate(['/customers-admin']);
      },
      error: (error) => {
        this.error = error.error.message || 'Fehler beim Aktualisieren des Kunden';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/customers-admin']);
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }
}
