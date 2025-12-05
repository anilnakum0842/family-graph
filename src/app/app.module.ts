import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';

import { AppComponent } from './app.component';
import { FamilyGraphComponent } from './components/family-graph/family-graph.component';
import { FamilyFiltersComponent } from './components/family-filters/family-filters.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
    declarations: [
        AppComponent,
        FamilyGraphComponent,
        FamilyFiltersComponent
    ],
    imports: [
        BrowserModule,
        CommonModule,
        FormsModule,
        NgbModule
    ],
    providers: [
        provideHttpClient() // Modern approach for HttpClient
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }