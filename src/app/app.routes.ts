import { Routes } from '@angular/router';
import { ProductListComponent } from './products/product-list/product-list.component';
import { ProductDetailComponent } from './products/product-detail/product-detail.component';
import { CustomerListComponent } from './user/employee-dashboard/customer-list/customer-list.component';
import { OrderListComponent } from './user/employee-dashboard/order-list/order-list.component';
import { LoginComponent } from './user/login/login.component';
import { CartListComponent } from './user/customer-dashboard/cart-list/cart-list.component';
import { EmployeeProfileComponent } from './user/employee-dashboard/employee-profile/employee-profile.component';
import { CustomerProfileComponent } from './user/customer-dashboard/customer-profile/customer-profile.component';
import { MyOrdersComponent } from './user/customer-dashboard/my-orders/my-orders.component';
import { ProductsAdminComponent } from './user/employee-dashboard/products-admin/products-admin.component';
import { EditProductsComponent } from './user/employee-dashboard/edit-products/edit-products.component';
import { EditOrdersComponent } from './user/employee-dashboard/edit-orders/edit-orders.component';
import { EditCustomersComponent } from './user/employee-dashboard/edit-customers/edit-customers.component';
import { LogsComponent } from './user/employee-dashboard/logs/logs.component';

export const routes: Routes = [
    { path: 'products', component: ProductListComponent },
    { path: 'product/:id', component: ProductDetailComponent },
    { path: 'cart', component: CartListComponent },
    { path: 'customer-orders', component: MyOrdersComponent },
    { path: 'employee-profile', component: EmployeeProfileComponent },
    { path: 'products-admin', component: ProductsAdminComponent },
    { path: 'customers-admin', component: CustomerListComponent },
    { path: 'orders-admin', component: OrderListComponent },
    { path: 'edit-products/:id', component: EditProductsComponent },
    { path: 'edit-orders/:id', component: EditOrdersComponent },
    { path: 'edit-customers/:id', component: EditCustomersComponent },
    { path: 'logs', component: LogsComponent },
    { path: 'login', component: LoginComponent },
    { path: 'customer-profile', component: CustomerProfileComponent },
    { path: '', redirectTo: '/products', pathMatch: 'full' }
];