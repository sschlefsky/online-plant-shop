import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:4000');
  }

  onLowStock(): Observable<{ product_id: number; stock: number }> {
    return new Observable((subscriber) => {
      this.socket.on('lowStock', (data) => {
        console.log('LowStock-Event empfangen:', data);
        subscriber.next(data);
      });
    });
  }
}