import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private isCustomerSubject = new BehaviorSubject<boolean>(false);
  isCustomer$ = this.isCustomerSubject.asObservable();

  private isEmployeeSubject = new BehaviorSubject<boolean>(false);
  isEmployee$ = this.isEmployeeSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<any> {
    return this.http.post('/api/login', { email, password }, { withCredentials: true });
  }

  setLogin(user: any) {
    this.isLoggedInSubject.next(true);
    this.isCustomerSubject.next(user.role === 'customer');
    this.isEmployeeSubject.next(user.role === 'employee');
    this.currentUserSubject.next(user); // Benutzerdaten speichern
  }

  logout() {
    this.http.post('/api/logout', {}, { withCredentials: true }).subscribe({
      complete: () => {
        this.isLoggedInSubject.next(false);
        this.isCustomerSubject.next(false);
        this.isEmployeeSubject.next(false);
        this.currentUserSubject.next(null); // Benutzerdaten zurücksetzen
      }
    });
  }

  checkSession() {
    this.http.get<{ user?: any }>('/api/me', { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.user) {
          this.setLogin(res.user);
        } else {
          this.clearAuthState();
        }
      },
      error: () => {
        this.clearAuthState();
      }
    });
  }

  fetchUserDetails() {
    return this.http.get<any>('/api/user-details', { withCredentials: true });
  }

  private clearAuthState() {
    this.isLoggedInSubject.next(false);
    this.isCustomerSubject.next(false);
    this.isEmployeeSubject.next(false);
    this.currentUserSubject.next(null);
  }
}