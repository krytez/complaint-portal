import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class PlatformService {
    private readonly platformId = inject(PLATFORM_ID);

    isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    isServer(): boolean {
        return isPlatformServer(this.platformId);
    }

    get localStorage(): Storage | null {
        if (this.isBrowser()) {
            return localStorage;
        }
        return null;
    }

    get sessionStorage(): Storage | null {
        if (this.isBrowser()) {
            return sessionStorage;
        }
        return null;
    }
}
