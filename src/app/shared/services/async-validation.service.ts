import { Injectable } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors
} from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timer, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AsyncValidationService {

  constructor(private http: HttpClient) {}

  checkAadhaar(aadhaar: string) {
    return this.http.get<boolean>(`api/ValidationService/AadharNo`, {
      params: { aadharNo: aadhaar }
    });
  }

  checkPan(pan: string) {
    return this.http.get<boolean>(`api/ValidationService/PanNo`, {
      params: { panNo: pan }
    });
  }

  checkMobile(mobile: string) {
    return this.http.get<boolean>(`api/ValidationService/MobileNo`, {
      params: { mobileNo: mobile }
    });
  }
}

